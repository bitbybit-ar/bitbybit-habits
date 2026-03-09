import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ApiError, UnauthorizedError } from "./errors";
import type { ApiResponse, AuthSession } from "@/lib/types";

export interface HandlerContext {
  session: AuthSession;
  db: ReturnType<typeof getDb>;
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

      if (result instanceof CreatedResponse) {
        return NextResponse.json<ApiResponse>({
          success: true,
          data: result.data,
        }, { status: 201 });
      }

      if (result === undefined || result === null) {
        return NextResponse.json<ApiResponse>({ success: true });
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: error.message },
          { status: error.statusCode }
        );
      }

      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);

      const message = error instanceof Error ? error.message : "Error interno";
      if (message.includes("duplicate key") || message.includes("unique")) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "El recurso ya existe" },
          { status: 409 }
        );
      }

      return NextResponse.json<ApiResponse>(
        { success: false, error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  };
}
