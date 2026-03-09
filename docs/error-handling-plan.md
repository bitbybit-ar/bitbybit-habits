# Plan: Error Handling & API DRY Refactor

## Problema actual

Las 17 rutas API (excluyendo auth handler y docs) repiten el mismo patrón:

```ts
const session = await getSession();
if (!session) {
  return NextResponse.json<ApiResponse>({ success: false, error: "No autenticado" }, { status: 401 });
}
const db = getDb();
try {
  // ... lógica
} catch (error) {
  console.error("Error al ...", error);
  return NextResponse.json<ApiResponse>({ success: false, error: "Error al ..." }, { status: 500 });
}
```

**~90 líneas repetidas** entre auth checks, try/catch, y formateo de errores.

---

## Solución propuesta

### 1. `lib/api/errors.ts` — Error classes tipadas

```ts
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "No autenticado") { super(401, message); }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Recurso") { super(404, `${resource} no encontrado`); }
}

export class BadRequestError extends ApiError {
  constructor(message: string) { super(400, message); }
}

export class ForbiddenError extends ApiError {
  constructor(message = "No autorizado") { super(403, message); }
}

export class ConflictError extends ApiError {
  constructor(message: string) { super(409, message); }
}
```

### 2. `lib/api/handler.ts` — Wrapper para route handlers

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ApiError, UnauthorizedError } from "./errors";
import type { ApiResponse, AuthSession } from "@/lib/types";
import { neon } from "@neondatabase/serverless";

interface HandlerContext {
  session: AuthSession;
  db: ReturnType<typeof neon>;
  params?: Record<string, string>;
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
      let session = null;
      if (requireAuth) {
        session = await getSession();
        if (!session) throw new UnauthorizedError();
      }

      const db = getDb();
      const params = routeCtx ? await routeCtx.params : undefined;
      const data = await fn(request, { session: session!, db, params });

      return NextResponse.json<ApiResponse<T>>({
        success: true,
        data: data as T,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: error.message },
          { status: error.statusCode }
        );
      }

      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);

      // Handle Postgres unique constraint violations
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
```

### 3. `lib/api/validate.ts` — Validación de campos requeridos

```ts
import { BadRequestError } from "./errors";

export function requireFields<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (!body[field]) {
      throw new BadRequestError(`El campo ${String(field)} es obligatorio`);
    }
  }
}
```

### 4. `lib/api/index.ts` — Re-export barrel

```ts
export { apiHandler } from "./handler";
export { ApiError, UnauthorizedError, NotFoundError, BadRequestError, ForbiddenError, ConflictError } from "./errors";
export { requireFields } from "./validate";
```

---

## Ejemplo: antes vs. después

### Antes (`app/api/completions/pending/route.ts`)

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }
  const db = getDb();
  try {
    const rows = await db`SELECT ... WHERE fm.user_id = ${session.user_id} ...`;
    return NextResponse.json<ApiResponse>({ success: true, data: rows });
  } catch (error) {
    console.error("Error al obtener completaciones pendientes:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener las completaciones pendientes" },
      { status: 500 }
    );
  }
}
```

### Después

```ts
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (_req, { session, db }) => {
  return await db`SELECT ... WHERE fm.user_id = ${session.user_id} ...`;
});
```

**De ~25 líneas a ~4 líneas.** El auth check, error handling, y response formatting son automáticos.

---

## Rutas a migrar (17 total)

| Ruta | Métodos | Notas |
|------|---------|-------|
| `/api/auth/profile` | GET, PATCH | |
| `/api/completions` | POST | + createNotification |
| `/api/completions/approve` | POST | + createNotification + payment |
| `/api/completions/pending` | GET | |
| `/api/completions/reject` | POST | + createNotification |
| `/api/families` | GET, POST | |
| `/api/families/[id]` | DELETE | route params |
| `/api/families/join` | POST | unique constraint handling |
| `/api/families/leave` | POST | |
| `/api/families/role` | PATCH | |
| `/api/habits` | GET, POST | |
| `/api/habits/[id]` | PATCH, DELETE | route params |
| `/api/notifications` | GET, PATCH | |
| `/api/payments` | GET | |
| `/api/payments/retry` | POST | |
| `/api/stats` | GET | |
| `/api/wallets` | GET, POST, DELETE | |

---

## Orden de implementación

1. **Crear `lib/api/`** — errors, handler, validate, index
2. **Migrar rutas simples primero** — stats, notifications, payments (GET)
3. **Migrar rutas con params** — families/[id], habits/[id]
4. **Migrar rutas complejas** — completions/approve (notifications + payments)
5. **Tests** — verificar que todas las respuestas mantienen el formato `ApiResponse`
6. **Cleanup** — remover imports no usados

## Beneficios

- **~400 líneas menos** de código repetido
- **Errores consistentes** — mismo formato siempre
- **Logging centralizado** — un solo lugar para agregar métricas, tracing, etc.
- **Más fácil agregar features** — rate limiting, CORS, etc. van en el wrapper
- **Type safety** — `HandlerContext` garantiza que `session` y `db` están disponibles
