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
- **Auth**: Email/username + password con bcryptjs. Boton "Login with Nostr" visible pero deshabilitado (coming soon)
- **Lightning**: NWC (Nostr Wallet Connect) via `@getalby/sdk`
- **API Docs**: OpenAPI 3.0 (Swagger) en `docs/openapi.yaml` + pagina interactiva en `/api-docs`
- **Fuente**: Inter (Google Fonts)

## Estructura del proyecto

```
bitbybit-habits/
  app/
    [locale]/                  <- Rutas con i18n (es, en)
      (auth)/                  <- Login, Register
      (dashboard)/             <- Kid dashboard, Sponsor dashboard
      layout.tsx               <- Layout principal con NextIntlClientProvider
      page.tsx                 <- Landing page
    api/                       <- API routes (NO dentro de [locale])
      auth/                    <- login, register, logout, session
    layout.tsx                 <- Root layout (solo pasa children)
  components/
    icons/                     <- SVG icons como React components
    layout/                    <- Navbar, Footer
    ui/                        <- Componentes reutilizables (Button, Card, etc.)
  i18n/                        <- Configuracion next-intl
    request.ts                 <- getRequestConfig
    routing.ts                 <- defineRouting + createNavigation
  lib/                         <- Utilidades, tipos, auth, db
  messages/                    <- Archivos de traduccion (es.json, en.json)
  styles/                      <- SCSS variables, mixins, globals
  docs/
    openapi.yaml               <- Especificacion OpenAPI 3.0 (Swagger)
  middleware.ts                <- next-intl middleware
  setup-database.sql           <- Schema SQL para Neon DB
```

### Reglas de estructura

- **NO usar carpeta `src/`** - Todo en root
- **NO crear archivos sueltos en root** sin motivo. Usar las carpetas existentes
- **Componentes**: un directorio por componente con `index.tsx` + `nombre.module.scss`
- **Paginas**: usar route groups `(auth)`, `(dashboard)` para organizar
- **API routes**: siempre en `app/api/`, nunca dentro de `[locale]`
- **Tipos**: centralizar en `lib/types.ts`
- **Reutilizar componentes** entre dashboards kid y sponsor siempre que sea posible

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
- Importar variables con `@use "@/styles/colors" as *`
- Respetar la paleta de colores definida en `styles/_colors.scss`:
  - Primary (Sats Gold): `$color-primary` (#F7A825)
  - Secondary (Sage Green): `$color-secondary` (#4CAF7D)
  - Accent: `$color-accent` (#FF6B6B), `$color-accent-alt` (#4DB6AC)
  - Backgrounds dark: `$color-bg-dark`, `$color-bg-dark-2`, `$color-bg-dark-3`
  - Texto: `$color-text-primary`, `$color-text-secondary`
- Usar los mixins existentes: `container`, `gradient-text`, `card-base`, `transition`
- Usar las variables de spacing: `$spacing-4` a `$spacing-100`
- Usar las variables de border-radius: `$border-radius-sm` a `$border-radius-full`
- Mobile-first con mixins `@include mobile`, `@include tablet`, `@include desktop`
- Dark mode es el default (pensado para seguridad visual de ninos)

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
- Neon DB usa tagged template literals: `` db`SELECT * FROM users WHERE id = ${id}` ``
- NO usar string interpolation en queries (SQL injection)
- Schema definido en `setup-database.sql`
- Tipos de DB mapeados en `lib/types.ts`

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
- **Payment**: registro del pago Lightning al aprobar
- **Wallet**: conexion NWC del sponsor

## Flujo principal

```
Sponsor crea familia -> genera invite_code
Kid se une con codigo
Sponsor crea habito ("Tender la cama", 50 sats, verificacion: sponsor_approval)
Kid completa tarea -> completion.status = "pending"
Sponsor aprueba -> status = "approved" -> pago via NWC -> payment.status = "paid"
```

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run lint         # ESLint
npx tsc --noEmit     # Type-check sin compilar
```

## Antes de commitear

- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Todas las strings de UI estan en ambos archivos de mensajes (es.json, en.json)
- [ ] Los estilos usan variables de `styles/` (no colores hardcodeados)
- [ ] Los componentes nuevos tienen su `.module.scss`
- [ ] No hay imports de librerias de iconos externas
- [ ] Si se creo/modifico una API route, `docs/openapi.yaml` esta actualizado
