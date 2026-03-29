import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, type Db } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { ApiError, UnauthorizedError, RateLimitError } from "./errors";
import type { ApiResponse, AuthSession } from "@/lib/types";

export interface HandlerContext {
  session: AuthSession;
  db: Db;
  params: Record<string, string>;
}

/** Marker class to signal a 201 response */
class CreatedResponse<T> {
  constructor(public data: T) {}
}

/** Wrap return value to signal HTTP 201 Created */
export function created<T>(data: T): CreatedResponse<T> {
  return new CreatedResponse(data);
}

/** Adds security headers to prevent browsers from caching sensitive API data */
function withCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

type HandlerFn<T = unknown> = (
  request: NextRequest,
  ctx: HandlerContext
) => Promise<T>;

/**
 * Rate limit tiers:
 * - strict:   5 req / 15 min  — auth endpoints (login, register, nostr)
 * - auth:    20 req / 1 min   — sensitive authenticated actions (payments, wallets)
 * - standard: 60 req / 1 min  — general API calls (default)
 */
type RateLimitTier = "strict" | "auth" | "standard";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  strict: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  auth: { maxAttempts: 20, windowMs: 60 * 1000 },
  standard: { maxAttempts: 60, windowMs: 60 * 1000 },
};

// Cache rate limiter instances per unique config to avoid creating duplicates
const rateLimiterCache = new Map<string, ReturnType<typeof createRateLimiter>>();

function getRateLimiter(config: RateLimitConfig): ReturnType<typeof createRateLimiter> {
  const key = `${config.maxAttempts}:${config.windowMs}`;
  let limiter = rateLimiterCache.get(key);
  if (!limiter) {
    limiter = createRateLimiter(config.maxAttempts, config.windowMs);
    rateLimiterCache.set(key, limiter);
  }
  return limiter;
}

function resolveRateLimitConfig(
  option: RateLimitTier | RateLimitConfig | false | undefined
): RateLimitConfig | null {
  if (option === false) return null;
  if (option === undefined) return RATE_LIMIT_TIERS.standard;
  if (typeof option === "string") return RATE_LIMIT_TIERS[option];
  return option;
}

interface HandlerOptions {
  auth?: boolean; // default: true
  rateLimit?: RateLimitTier | RateLimitConfig | false; // default: "standard"
}

export function apiHandler<T = unknown>(
  fn: HandlerFn<T>,
  options: HandlerOptions = {}
) {
  const { auth: requireAuth = true } = options;
  const rateLimitConfig = resolveRateLimitConfig(options.rateLimit);

  return async (request: NextRequest, routeCtx?: { params: Promise<Record<string, string>> }) => {
    try {
      // Rate limiting — runs before auth to block abusive requests early
      if (rateLimitConfig) {
        const limiter = getRateLimiter(rateLimitConfig);
        const ip = getClientIp(request);
        const routePath = request.nextUrl.pathname;
        const identifier = `${routePath}:${ip}`;
        const result = limiter.check(identifier);
        if (!result.success) {
          throw new RateLimitError(result.retryAfterMs ?? 0);
        }
      }

      let session: AuthSession | null = null;
      if (requireAuth) {
        session = await getSession();
        if (!session) throw new UnauthorizedError();
      }

      const db = getDb();
      const params = routeCtx ? await routeCtx.params : {};
      const result = await fn(request, { session: session!, db, params });

      // Allow handlers to return raw NextResponse (e.g., for setting cookies)
      if (result instanceof NextResponse) {
        return withCacheHeaders(result);
      }

      if (result instanceof CreatedResponse) {
        return withCacheHeaders(NextResponse.json<ApiResponse>({
          success: true,
          data: result.data,
        }, { status: 201 }));
      }

      if (result === undefined) {
        return withCacheHeaders(NextResponse.json<ApiResponse>({ success: true }));
      }

      if (result === null) {
        return withCacheHeaders(NextResponse.json<ApiResponse>({ success: true, data: null }));
      }

      return withCacheHeaders(NextResponse.json<ApiResponse>({
        success: true,
        data: result,
      }));
    } catch (error) {
      if (error instanceof RateLimitError) {
        const response = NextResponse.json<ApiResponse>(
          { success: false, error: error.message },
          { status: 429 }
        );
        response.headers.set("Retry-After", Math.ceil(error.retryAfterMs / 1000).toString());
        return withCacheHeaders(response);
      }

      if (error instanceof ApiError) {
        return withCacheHeaders(NextResponse.json<ApiResponse>(
          { success: false, error: error.message },
          { status: error.statusCode }
        ));
      }

      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);

      const message = error instanceof Error ? error.message : "Internal error";
      const causeMessage = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
      if (message.includes("duplicate key") || message.includes("unique") ||
          causeMessage.includes("duplicate key") || causeMessage.includes("unique")) {
        return withCacheHeaders(NextResponse.json<ApiResponse>(
          { success: false, error: "Resource already exists" },
          { status: 409 }
        ));
      }

      return withCacheHeaders(NextResponse.json<ApiResponse>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      ));
    }
  };
}
