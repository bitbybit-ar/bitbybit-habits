# CLAUDE.md - BitByBit Habits

## Proyecto

**BitByBit** es un habit tracker que recompensa completar tareas con sats reales via Lightning Network. Caso de uso MVP: "Mesada 2.0" donde sponsors (padres/tutores) crean habitos con recompensa en sats y kids los completan para ganar.

## Hackathon

- **Nombre**: FOUNDATIONS (Lightning Hackathon #1 de La Crypta)
- **Tema**: Lightning Payments Basics
- **Fechas**: Marzo 2026 (3, 10, 17, 24, 31)
- **Premio**: 1,000,000 sats distribuidos entre 6 ganadores
- **Entrega**: PR a `data/projects/foundations.json` en el repo de la hackathon
- **Pitch**: 3 minutos maximo
- **Jurado**: Evaluacion por IA
- **Landing**: https://hackaton.lacrypta.ar

## Stack tecnologico

- **Framework**: Next.js 16, React 19, TypeScript strict
- **Estilos**: SCSS modules (NO Tailwind, NO CSS-in-JS)
- **Iconos**: SVG custom en `components/icons/` (NO lucide-react, NO icon libraries)
- **i18n**: next-intl con `[locale]` routing (espanol default, ingles segundo idioma)
- **Base de datos**: Neon DB (PostgreSQL serverless) via `@neondatabase/serverless`
- **Auth**: Email/username + password con bcryptjs. Login con Nostr (NIP-07 extension) disponible + linking de cuentas existentes
- **Lightning**: NWC (Nostr Wallet Connect) via `@getalby/sdk`
- **API Docs**: OpenAPI 3.0 (Swagger) en `docs/openapi.yaml` + pagina interactiva en `/api-docs`
- **Fuente**: Nunito / Nunito Sans (Google Fonts)

## Estructura del proyecto

```
bitbybit-habits/
  app/
    [locale]/                  <- Rutas con i18n (es, en)
      (auth)/                  <- Login, Register
      (dashboard)/             <- Kid dashboard, Sponsor dashboard
      demo/                    <- Demo interactiva sin registro
      layout.tsx               <- Layout principal con NextIntlClientProvider
      page.tsx                 <- Landing page
    api/                       <- API routes (NO dentro de [locale])
      admin/                   <- stats, users CRUD, sync-nostr-metadata
      auth/                    <- login, register, logout, session, profile, 2fa/*, nostr, nostr/link
      completions/             <- CRUD, approve, reject, pending
      docs/                    <- Sirve OpenAPI spec como JSON
      families/                <- CRUD, join, leave, role, stats, completions, [id]/members/[userId]
      habits/                  <- CRUD, [id]/assignments
      payments/                <- list, invoice, [id]/pay, [id]/status, [id]/confirm, retry
      wallets/                 <- CRUD, balance, send, receive
      notifications/           <- list
      stats/                   <- estadisticas y rachas
    layout.tsx                 <- Root layout (solo pasa children)
  components/
    icons/                     <- SVG icons como React components
    layout/                    <- Navbar, Footer
    ui/                        <- Componentes reutilizables (Button, Card, InvoiceModal, etc.)
    dashboard/                 <- Componentes de dashboard (StatsBar, WeeklyTracker, WalletConnect, etc.)
  i18n/                        <- Configuracion next-intl
    request.ts                 <- getRequestConfig
    routing.ts                 <- defineRouting + createNavigation
  lib/                         <- Utilidades, tipos, auth, db
    api/                       <- apiHandler wrapper, errores, validacion
    db/                        <- Drizzle ORM schema y conexion
    hooks/                     <- useWebLN (deteccion de extensiones)
    auth.ts                    <- Gestion de sesiones JWT
    crypto.ts                  <- Encriptacion AES-256-GCM para NWC URLs
    types.ts                   <- Interfaces TypeScript compartidas
  messages/                    <- Archivos de traduccion (es.json, en.json)
  styles/                      <- SCSS variables, mixins, glassmorphism system
  tests/                       <- 37 archivos de test, ~207 tests (Vitest)
    api/                       <- Tests de endpoints API (auth, admin, families, habits, completions, payments, wallets, notifications, stats)
    helpers/                   <- Utilidades de test
  docs/
    openapi.yaml               <- Especificacion OpenAPI 3.0 (Swagger)
  middleware.ts                <- next-intl middleware
  setup-database.sql           <- Schema SQL para Neon DB (9 tablas)
```

### Reglas de estructura

- **NO usar carpeta `src/`** - Todo en root
- **NO crear archivos sueltos en root** sin motivo. Usar las carpetas existentes
- **Componentes**: un directorio por componente con `index.tsx` + `nombre.module.scss`
- **Paginas**: usar route groups `(auth)`, `(dashboard)` para organizar
- **API routes**: siempre en `app/api/`, nunca dentro de `[locale]`
- **Tipos**: centralizar en `lib/types.ts`
- **Reutilizar componentes** entre dashboards kid y sponsor siempre que sea posible
- **Componentes compartidos de dashboard** en `components/dashboard/`:
  - `DashboardSection` — wrapper con titulo opcional y prop `center` para loading states
  - `EmptyState` — estado vacio con icon, title, description y action opcional
  - `BlockLoader` — loader animado (usar en lugar de `Spinner` en dashboards)
  - Tab components en `components/dashboard/kid/` y `components/dashboard/sponsor/`

## Convenciones de codigo

### TypeScript
- Strict mode habilitado
- Usar `interface` para objetos, `type` para unions/intersections
- NO usar `any` - usar `unknown` con type guards
- Imports con alias `@/` (mapea a root)

### React
- `"use client"` solo cuando se necesite (hooks, eventos, browser APIs)
- Server Components por defecto
- Props interface antes del componente
- Nombrar archivos en kebab-case o PascalCase segun corresponda

### SCSS
- Usar SCSS modules (`.module.scss`) para cada componente
- Importar modulos de estilos con `@use`:
  ```scss
  @use "@/styles/colors" as *;
  @use "@/styles/spacing" as *;
  @use "@/styles/typography" as *;
  @use "@/styles/common-mixins" as *;
  @use "@/styles/media-mixins" as *;
  @use "@/styles/glass" as *;
  ```

#### Variables obligatorias (NO hardcodear valores)
- **Colores**: Siempre usar variables `$color-*` de `_colors.scss`, NUNCA `var(--color-*)` directo ni hex/rgb
  - `$color-primary`, `$color-secondary`, `$color-accent`, `$color-accent-alt`
  - `$color-success`, `$color-warning`, `$color-error`, `$color-info`, `$color-nostr`
  - `$color-bg`, `$color-bg-2`, `$color-bg-3`, `$color-surface`
  - `$color-text-primary`, `$color-text-secondary`
- **Transparencia**: Usar `alpha($color, amount)` en lugar de `rgba()` o `color-mix()` directo
  ```scss
  // Correcto
  background: alpha($color-primary, 15%);
  // Incorrecto
  background: rgba(var(--color-primary), 0.15);
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  ```
- **Spacing**: `$spacing-4` a `$spacing-100` (NO usar px sueltos como `10px`, `20px`)
- **Border radius**: `$border-radius-sm` (8px) a `$border-radius-full` (100px)
- **Font sizes**: `$font-size-xs` a `$font-size-hero` (NO usar `0.75rem`, `13px`, `11px`)
- **Font weights**: `$font-weight-normal` (400) a `$font-weight-extrabold` (800) (NO usar `600` directo)

#### Mixins disponibles
- **Layout**: `@include container`, `@include section-padding`
- **Efectos**: `@include gradient-text`, `@include transition`
- **Glass system**: `@include glass-card`, `@include glass-subtle`, `@include glass-nav`, `@include glass-modal`, `@include glass(opacity, blur, border-opacity, radius)`
- **Responsive** (mobile-first): `@include mobile`, `@include tablet`, `@include desktop`

#### Reglas
- Dark mode es el default (pensado para seguridad visual de ninos)
- NO usar inline styles en JSX — crear clases SCSS
- NO usar `var(--color-*)` en SCSS files — usar `$color-*` (son alias, se resuelven en runtime)

### Iconos
- Crear SVG icons como React components en `components/icons/index.tsx`
- Props estandar: `size`, `className`, `color`
- NO instalar librerias de iconos externas

### i18n
- Usar `useTranslations()` en client components
- Usar `getTranslations()` en server components
- Todas las strings visibles al usuario deben estar en `messages/es.json` y `messages/en.json`
- Espanol es el idioma por defecto
- Para links internos usar `Link` de `@/i18n/routing` (NO de `next/link`)

### API Routes y documentacion
- Cada vez que se crea o modifica una API route, se DEBE actualizar `docs/openapi.yaml`
- Documentar: path, metodo, descripcion, parametros, request body, responses (200, 400, 401, etc.)
- Mantener los schemas de OpenAPI sincronizados con los tipos de `lib/types.ts`
- La pagina `/api-docs` sirve la UI interactiva de Swagger para probar endpoints
- Todas las responses usan el formato `ApiResponse<T>` con `{ success, data?, error? }`

### Base de datos
- Drizzle ORM con Neon DB (PostgreSQL serverless) en produccion
- Conexion lazy via `getDb()` en `lib/db/index.ts`
- Schema Drizzle en `lib/db/schema.ts` (source of truth), schema SQL de referencia en `setup-database.sql`
- Tipos de DB mapeados en `lib/types.ts`
- Migraciones en `drizzle/` — se ejecutan automaticamente en CI con `npx drizzle-kit push --force` al hacer push a main
- NO usar string interpolation en queries (SQL injection)

#### Setup local de PostgreSQL
```bash
# 1. Iniciar Postgres local (data dir en disco externo, puerto 5433)
pg_ctl -D '/Volumes/Ext Disk/pg-data' -l '/Volumes/Ext Disk/pg-data/logfile' -o '-p 5433' start

# 2. Crear la base de datos (solo la primera vez)
createdb -p 5433 bitbybit

# 3. Aplicar schema inicial (solo la primera vez, o para recrear desde cero)
psql -p 5433 -d bitbybit -f setup-database.sql

# 4. Aplicar migraciones de Drizzle (sincronizar con schema actual)
npx drizzle-kit push --force

# 5. Verificar conexion
psql -p 5433 -d bitbybit -c "SELECT count(*) FROM users;"

# Detener Postgres
pg_ctl -D '/Volumes/Ext Disk/pg-data' stop
```
- **Puerto**: 5433 (no el default 5432, para evitar conflictos)
- **User**: `fabricioacosta` (peer auth local, sin password)
- **DATABASE_URL** en `.env.local`: `postgresql://fabricioacosta@localhost:5433/bitbybit`

### Auth
- Sesion via cookie httpOnly (`session`)
- Hash de passwords con bcryptjs (10 salt rounds)
- Roles: `sponsor` y `kid`
- Verificar sesion con `getSession()` de `lib/auth.ts`

## Modelo de datos clave

- **User**: tiene rol (sponsor/kid) y pertenece a una Family
- **Family**: grupo con invite_code, creado por un sponsor
- **Habit**: creado por sponsor, asignado a kid, tiene sat_reward
- **Completion**: kid marca como hecho, sponsor aprueba/rechaza
- **Payment**: registro del pago Lightning (pending/paid/failed) con invoice BOLT11 y payment_hash
- **Wallet**: conexion NWC para sponsors Y kids (URL encriptada con AES-256-GCM)
- **Notification**: notificaciones in-app para completaciones, aprobaciones y pagos
- **HabitAssignment**: relacion many-to-many entre habits y users asignados

## Flujo principal

```
Sponsor crea familia -> genera invite_code
Kid se une con codigo -> conecta wallet Lightning (NWC)
Sponsor crea habito ("Tender la cama", 50 sats, verificacion: sponsor_approval)
Kid completa tarea -> completion.status = "pending"
Sponsor aprueba -> cascada de pago:
  1. WebLN extension (Alby) -> pago instant en browser
  2. NWC auto-pay -> servidor paga invoice del kid
  3. Invoice modal -> QR code para pago manual (polling cada 4s)
  4. Fallback -> aprobado sin pago, wallet pendiente
```

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run lint         # ESLint
npm test             # Correr tests (Vitest, ~207 tests)
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con reporte de cobertura
npx tsc --noEmit     # Type-check sin compilar
```

## Git workflow

- **Never push directly to `main`**. Always create a feature branch and open a PR.
- Branch naming: `fix/<description>` or `feat/<description>`
- Use `gh pr create` to open the PR with a clear title and description of changes.
- Ani (repo owner) must approve the PR before it can be merged.
- Git author for commits: `Analia Acosta <analia.a.acosta@gmail.com>`

### Checklist pre-commit

- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Todas las strings de UI estan en ambos archivos de mensajes (es.json, en.json)
- [ ] Los estilos usan variables de `styles/` (no colores hardcodeados)
- [ ] Los componentes nuevos tienen su `.module.scss`
- [ ] No hay imports de librerias de iconos externas
- [ ] Si se creo/modifico una API route, `docs/openapi.yaml` esta actualizado
