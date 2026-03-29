import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, type Db } from "@/lib/db";
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

interface HandlerOptions {
  auth?: boolean; // default: true
}

export function apiHandler<T = unknown>(
  fn: HandlerFn<T>,
  options: HandlerOptions = {}
) {
  const { auth: requireAuth = true } = options;

  return async (request: NextRequest, routeCtx?: { params: Promise<Record<string, string>> }) => {
    try {
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

      if (result === undefined || result === null) {
        return withCacheHeaders(NextResponse.json<ApiResponse>({ success: true }));
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
