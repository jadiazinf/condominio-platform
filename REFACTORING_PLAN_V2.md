# Plan de Refactorización Definitivo — La Torre / CondominioApp

**Basado en:** Análisis directo del código fuente (no solo el audit report)
**Fecha:** 2026-02-08
**Stack confirmado:** Monorepo Turborepo · Backend Hono+Bun · Frontend Next.js 15 (App Router) · Drizzle ORM (node-postgres) · Firebase Auth (SDK + JWT cookie SSR) · Zustand session store

---

## Hallazgos del Análisis de Código (adicionales al audit)

### Lo que el audit reportó correctamente:
- ✅ 86% de rutas sin verificación de rol — confirmado: solo 4 de 48 controllers usan `isSuperadmin` en middlewares
- ✅ SUPERADMIN ve módulos de condominio — confirmado en `sidebar-items.ts`: quotas, payments, expenses, amenities están en `superadminSidebarItems`
- ✅ Sin scoping multi-tenant — confirmado: los servicios no reciben `condominiumId`
- ✅ Sin transacciones — confirmado: `CreateCompanyWithAdminService` hace 3 creates secuenciales sin tx

### Lo que descubrí adicional:

1. **La DI NO usa contenedor IoC** — Es manual en `Endpoint` classes. Cada `Endpoint` recibe `db`, instancia repos, y pasa repos al controller. Los servicios se instancian DENTRO del controller (`new Service(repo)`). Esto es importante para la estrategia de transacciones.

2. **El controller instancia servicios en su constructor** — Ejemplo: `PaymentsController` recibe `repository` y `db`, y hace `new GetPaymentByNumberService(repository)` en el constructor. Los servicios NO reciben `db` directamente, solo repos.

3. **`DatabaseService.getInstance().getDb()`** se usa dentro de middlewares (`isUserAuthenticated`, `isSuperadmin`) como singleton — esto es un acoplamiento que no sigue la hexagonal limpia pero funciona.

4. **El `management-companies` controller NO usa `isSuperadmin` como middleware en sus rutas** — solo usa `authMiddleware`. La referencia a `isSuperadmin` en el código es una llamada al método del repo dentro de un handler, no como protección de ruta. Esto significa que las rutas de platform TAMPOCO están protegidas correctamente (peor de lo que el audit reportó).

5. **No hay `middleware.ts` en Next.js** — La protección del frontend se hace inline en cada page.tsx con `getFullSession()` + redirect. No hay protección a nivel de layout de ruta.

6. **El patrón de acceso en las pages es incorrecto** — Ejemplo: `quotas/page.tsx` usa `!session.superadmin?.isActive && !session.condominiums?.length` que PERMITE acceso a superadmin a páginas de condominio.

7. **`createRouter` tiene un hack para manejar N middlewares** — Es un switch manual por cantidad de middlewares (1, 2, 3, 4+). Funciona pero es frágil.

8. **`user_roles` table ya soporta scoping por condominium** — Tiene `condominiumId` y `buildingId`, con SUPERADMIN identificado por `condominiumId = null AND buildingId = null`. Esta es la base correcta para `requireRole`.

---

## Arquitectura Actual (Flujo de una request)

```
Request → Hono middleware (cors, rate limit, i18n, error handler)
        → Endpoint router (e.g., /payments → PaymentsEndpoint)
        → Route middleware chain: [authMiddleware, ?validators]
        → Controller handler
        → Service (business logic)
        → Repository (Drizzle queries)
        → Response
```

**Flujo de DI actual:**
```
DatabaseService.getInstance().getDb() → db
  → Endpoint(db) → new Repository(db) → new Controller(repo, db)
    → Controller constructor: new Service(repo1, repo2, ...)
```

---

## Plan de Implementación

### Paso 1: `withTx()` en BaseRepository

**Por qué primero:** Los pasos 3 y 5 dependen de esto.

**Archivo:** `apps/api/src/database/repositories/base/base.repository.ts`

Agregar al `BaseRepository`:

```typescript
/**
 * Creates a shallow clone of this repository that uses the given
 * transaction client instead of the default db client.
 * This allows multiple repositories to participate in the same transaction.
 */
withTx(tx: TDrizzleClient): this {
  const clone = Object.create(Object.getPrototypeOf(this))
  Object.assign(clone, this)
  clone.db = tx
  return clone
}
```

**Por qué `withTx()` y no pasar `tx` como parámetro:** Porque tu `IRepository` interface tiene firmas como `create(data)`, `update(id, data)` — agregarle `tx?` a cada método rompería la interfaz y todos los consumidores. `withTx()` preserva la interfaz intacta.

**Impacto:** Solo toca 1 archivo. Todos los repos hijos lo heredan automáticamente.

**Nota:** Los servicios que necesiten transacciones necesitarán acceso a `db`. La forma más limpia con tu DI manual es que el controller pase `db` al servicio en construcción, o que el servicio reciba un `TransactionManager` helper. Detalles en paso 5.

---

### Paso 2: Middleware `requireRole()`

**Archivos nuevos:**
- `apps/api/src/http/middlewares/utils/auth/require-role.ts`

```typescript
import type { MiddlewareHandler } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { userRoles, roles } from '@database/drizzle/schema'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'

// Roles de condominio (los que existen en la tabla roles)
type TCondominiumRole = 'ADMIN' | 'ACCOUNTANT' | 'SUPPORT' | 'USER'
type TRole = 'SUPERADMIN' | TCondominiumRole

export const CONDOMINIUM_ID_PROP = 'condominiumId'
export const USER_ROLE_PROP = 'userRole'

declare module 'hono' {
  interface ContextVariableMap {
    [CONDOMINIUM_ID_PROP]: string
    [USER_ROLE_PROP]: string
  }
}

/**
 * Middleware that verifies the authenticated user has one of the allowed roles.
 *
 * For SUPERADMIN: checks user_roles where condominiumId IS NULL (global scope).
 * For condominium roles: requires x-condominium-id header and checks user_roles
 * for that specific condominium.
 *
 * IMPORTANT: SUPERADMIN should NEVER be in allowedRoles for condominium routes.
 * This enforces the platform/condominium separation.
 *
 * Sets 'condominiumId' and 'userRole' in Hono context for downstream use.
 */
export function requireRole(...allowedRoles: TRole[]): MiddlewareHandler {
  return async (c, next) => {
    const ctx = new HttpContext(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    if (!user) {
      return ctx.unauthorized({ error: 'Authentication required' })
    }

    const db = DatabaseService.getInstance().getDb()

    // Check if SUPERADMIN is an allowed role for this route
    if (allowedRoles.includes('SUPERADMIN')) {
      const superadminCheck = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, user.id),
            eq(roles.name, 'SUPERADMIN'),
            eq(userRoles.isActive, true),
            isNull(userRoles.condominiumId),
            isNull(userRoles.buildingId)
          )
        )
        .limit(1)

      if (superadminCheck[0]) {
        c.set(USER_ROLE_PROP, 'SUPERADMIN')
        await next()
        return
      }
    }

    // For condominium roles, require the header
    const condominiumRoles = allowedRoles.filter(r => r !== 'SUPERADMIN')
    if (condominiumRoles.length === 0) {
      // Route is SUPERADMIN-only and user is not SUPERADMIN
      return ctx.forbidden({ error: 'Insufficient permissions' })
    }

    const condominiumId = c.req.header('x-condominium-id')
    if (!condominiumId) {
      return ctx.badRequest({ error: 'x-condominium-id header is required' })
    }

    // Check user has one of the allowed roles in this condominium
    const userRoleResult = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, user.id),
          eq(userRoles.condominiumId, condominiumId),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1)

    if (!userRoleResult[0]) {
      return ctx.forbidden({ error: 'Insufficient permissions' })
    }

    const userRoleName = userRoleResult[0].roleName.toUpperCase()
    if (!condominiumRoles.includes(userRoleName as TCondominiumRole)) {
      return ctx.forbidden({ error: 'Insufficient permissions' })
    }

    c.set(CONDOMINIUM_ID_PROP, condominiumId)
    c.set(USER_ROLE_PROP, userRoleName)
    await next()
  }
}
```

**Puntos clave de diseño:**
- Reutiliza la misma tabla `user_roles` que ya existe (SUPERADMIN = `condominiumId IS NULL`)
- No modifica `isSuperadmin` existente — lo puedes deprecar gradualmente
- Soporta rutas mixtas como tickets: `requireRole('SUPERADMIN', 'ADMIN', 'USER')`
- Inyecta `condominiumId` en el contexto de Hono para que los handlers/servicios lo usen

---

### Paso 3: Reestructurar rutas API (backend)

**Archivo principal:** `apps/api/src/http/endpoints/routes.ts`

Reorganizar las rutas en tres grupos:

```typescript
export class ApiRoutes {
  constructor() {
    const db = DatabaseService.getInstance().getDb()

    this.endpoints = [
      // ── PUBLIC ──
      new HealthEndpoint(),
      new AuthEndpoint(db),
      // Token-based (invitations)
      new AdminInvitationsPublicEndpoint(db),  // validate/accept only
      new UserInvitationsPublicEndpoint(db),    // validate/accept only

      // ── PLATFORM (SUPERADMIN only) ──
      // Cada controller de este grupo usa: requireRole('SUPERADMIN')
      new ManagementCompaniesEndpoint(db),      // path: /platform/management-companies
      new AdminInvitationsEndpoint(db),          // path: /platform/admin-invitations
      new SupportTicketsEndpoint(db),            // path: /platform/support-tickets
      new SubscriptionRatesEndpoint(db),         // path: /platform/subscription-rates
      new CurrenciesEndpoint(db),                // path: /platform/currencies
      // ... etc

      // ── CONDOMINIUM (role-based) ──
      // Cada controller usa requireRole() con los roles apropiados
      new QuotasEndpoint(db),                    // path: /condominium/quotas
      new PaymentsEndpoint(db),                  // path: /condominium/payments
      new ExpensesEndpoint(db),                  // path: /condominium/expenses
      new AmenitiesEndpoint(db),                 // path: /condominium/amenities
      new BuildingsEndpoint(db),                 // path: /condominium/buildings
      // ... etc

      // ── ME (any authenticated user) ──
      new UserProfileEndpoint(db),               // path: /me/profile
      new UserNotificationsEndpoint(db),         // path: /me/notifications
      // ... etc
    ]
  }
}
```

**Cambio en los Endpoints:**

```typescript
// ANTES
export class PaymentsEndpoint implements IEndpoint {
  readonly path = '/payments'
  // ...
}

// DESPUÉS
export class PaymentsEndpoint implements IEndpoint {
  readonly path = '/condominium/payments'
  // ...
}
```

**Cambio en los Controllers (aplicar requireRole a cada ruta):**

```typescript
// ANTES (payments.controller.ts)
get routes(): TRouteDefinition[] {
  return [
    { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
    // ...
  ]
}

// DESPUÉS
get routes(): TRouteDefinition[] {
  return [
    {
      method: 'get',
      path: '/',
      handler: this.list,
      middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')],
    },
    {
      method: 'post',
      path: '/report',
      handler: this.reportPayment,
      middlewares: [authMiddleware, requireRole('USER', 'ADMIN'), bodyValidator(...)],
    },
    {
      method: 'post',
      path: '/:id/verify',
      handler: this.verifyPayment,
      middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(...)],
    },
    // ...
  ]
}
```

**Matriz de roles por módulo (copiar al roles-skill.md de Claude):**

| Módulo | SUPERADMIN | ADMIN | ACCOUNTANT | SUPPORT | USER |
|--------|-----------|-------|-----------|---------|------|
| management-companies | CRUD | ❌ | ❌ | ❌ | ❌ |
| admin-invitations | CRUD | ❌ | ❌ | ❌ | ❌ |
| subscription-rates | CRUD | ❌ | ❌ | ❌ | ❌ |
| currencies | CRUD | Read | Read | ❌ | ❌ |
| buildings | ❌ | CRUD | Read | Read | ❌ |
| units | ❌ | CRUD | Read | Read | Read (propias) |
| quotas | ❌ | CRUD | CRUD | Read | Read (propias) |
| payments | ❌ | CRUD+Verify | CRUD+Verify | ❌ | Read (propios) + Report |
| expenses | ❌ | CRUD | CRUD | ❌ | ❌ |
| amenities | ❌ | CRUD | ❌ | Read | Read |
| amenity-reservations | ❌ | CRUD+Approve | ❌ | CRUD+Approve | Create+Read (propias) |
| support-tickets (platform) | Manage | ❌ | ❌ | ❌ | ❌ |
| support-tickets (condo) | ❌ | Manage | ❌ | ❌ | Create+Read (propios) |
| user-invitations | ❌ | CRUD | ❌ | ❌ | ❌ |

---

### Paso 4: Scoping de condominio en handlers y servicios

Después de `requireRole()`, el `condominiumId` está disponible en el contexto de Hono. Los handlers deben pasarlo a los servicios:

```typescript
// ANTES (en controller handler)
private list = async (c: Context): Promise<Response> => {
  const entities = await this.repository.listAll()
  return ctx.ok({ data: entities })
}

// DESPUÉS
private list = async (c: Context): Promise<Response> => {
  const condominiumId = c.get(CONDOMINIUM_ID_PROP)
  const entities = await this.repository.listByCondominium(condominiumId)
  return ctx.ok({ data: entities })
}
```

Para rutas donde USER solo ve "lo suyo":
```typescript
private listMyQuotas = async (c: Context): Promise<Response> => {
  const condominiumId = c.get(CONDOMINIUM_ID_PROP)
  const userRole = c.get(USER_ROLE_PROP)
  const user = c.get(AUTHENTICATED_USER_PROP)

  if (userRole === 'USER') {
    // Solo cuotas de unidades donde es propietario
    const quotas = await this.service.getQuotasByOwner(user.id, condominiumId)
    return ctx.ok({ data: quotas })
  }

  // ADMIN/ACCOUNTANT ven todas las del condominio
  const quotas = await this.service.getQuotasByCondominium(condominiumId)
  return ctx.ok({ data: quotas })
}
```

**Repos que necesitan método `listByCondominium()`:**
- quotas, payments, expenses, buildings, units, amenities, amenity-reservations, documents, messages, notifications

Muchos de estos repos ya tienen queries por condominio — solo hay que asegurar que SIEMPRE se filtren y que el `condominiumId` venga del middleware, no del query param del usuario.

---

### Paso 5: Transacciones en servicios críticos

**Problema:** Los servicios reciben repos (no `db`), así que no pueden abrir transacciones. Hay dos opciones:

**Opción A — Pasar `db` al servicio (recomendada para tu DI manual):**

```typescript
// ANTES
export class CreateCompanyWithAdminService {
  constructor(
    private readonly invitationsRepo: AdminInvitationsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly companiesRepo: ManagementCompaniesRepository
  ) {}

  async execute(input) {
    const admin = await this.usersRepo.create(userData)       // Si falla aquí ↓
    const company = await this.companiesRepo.create(compData) // admin queda huérfano
    const invitation = await this.invitationsRepo.create(...) // company queda huérfana
  }
}

// DESPUÉS
export class CreateCompanyWithAdminService {
  constructor(
    private readonly invitationsRepo: AdminInvitationsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly companiesRepo: ManagementCompaniesRepository,
    private readonly db: TDrizzleClient  // ← AGREGAR
  ) {}

  async execute(input) {
    return await this.db.transaction(async (tx) => {
      const admin = await this.usersRepo.withTx(tx).create(userData)
      const company = await this.companiesRepo.withTx(tx).create(compData)
      const invitation = await this.invitationsRepo.withTx(tx).create(...)
      return success({ company, admin, invitation, invitationToken: token })
    })
    // Si cualquier paso falla, todo se revierte automáticamente
  }
}
```

**¿Cómo pasa `db` al servicio?** El controller ya recibe `db` (viene del Endpoint). Solo cambia la instanciación:

```typescript
// En el controller constructor:
this.createCompanyService = new CreateCompanyWithAdminService(
  invitationsRepo, usersRepo, companiesRepo, db  // ← agregar db
)
```

**Servicios que DEBEN usar transacciones:**
1. `CreateCompanyWithAdminService` — crea user + company + invitation
2. `AcceptInvitationService` (admin) — activa user + company + actualiza invitation
3. `AcceptUserInvitationService` — crea/actualiza user + asigna rol + actualiza invitation
4. `RefundPaymentService` — debe revertir payment applications + actualizar cuotas + audit log
5. `GenerateQuotasForScheduleService` — genera múltiples cuotas
6. Cualquier servicio que haga >1 write

---

### Paso 6: Reestructurar frontend

#### 6.1 Crear `middleware.ts` (Next.js Edge Middleware)

**Archivo nuevo:** `apps/web/middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Verificar que existe cookie de sesión para rutas protegidas
  const sessionToken = request.cookies.get('firebase-token')?.value
    || request.cookies.get('session')?.value

  if (!sessionToken && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Pasar pathname en header para el layout (para redirects con context)
  const response = NextResponse.next()
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

#### 6.2 Reestructurar páginas por rol

```
app/(dashboard)/dashboard/
├── page.tsx                    # Redirect según rol
│
├── platform/                   # SUPERADMIN only
│   ├── layout.tsx              # Guard: if !superadmin → redirect
│   ├── page.tsx
│   ├── admins/                 # (era /admins)
│   ├── users/                  # (era /users)
│   ├── rates/                  # (era /rates)
│   ├── currencies/             # (era /currencies)
│   └── tickets/                # (era /tickets, solo vista platform)
│
├── admin/                      # ADMIN, ACCOUNTANT, SUPPORT
│   ├── layout.tsx              # Guard: if superadmin → /platform; if !condo → redirect
│   ├── page.tsx
│   ├── condominiums/           # (mover de /condominiums)
│   ├── quotas/                 # (mover de /quotas)
│   ├── payments/               # (mover de /payments)
│   ├── expenses/               # (mover de /expenses)
│   ├── amenities/              # (mover de /amenities)
│   └── tickets/                # (tickets de condominio)
│
├── resident/                   # USER
│   ├── layout.tsx              # Guard
│   ├── page.tsx
│   ├── my-quotas/
│   ├── my-payments/
│   ├── report-payment/
│   ├── reservations/
│   └── support/
│
└── settings/                   # Todos
```

#### 6.3 Limpiar sidebar

**Archivo:** `apps/web/src/app/(dashboard)/config/sidebar-items.ts`

- **Eliminar** de `superadminSidebarItems`: quotas, payments, expenses, amenities
- **Crear** `adminSidebarItems`, `accountantSidebarItems`, `supportSidebarItems`, `residentSidebarItems` como listas separadas
- Actualizar todos los `href` a las nuevas rutas (`/dashboard/platform/...`, `/dashboard/admin/...`, `/dashboard/resident/...`)

#### 6.4 Header `x-condominium-id` en API client

En el fetch wrapper o API client del frontend, agregar automáticamente:

```typescript
// En el hook/utility que hace requests al backend
const headers: HeadersInit = {
  'Authorization': `Bearer ${token}`,
}

// Si la URL va a /condominium/*, agregar el header
if (url.includes('/condominium/') && selectedCondominium?.condominiumId) {
  headers['x-condominium-id'] = selectedCondominium.condominiumId
}
```

---

### Paso 7: Fixes de lógica de negocio

#### 7.1 `RefundPaymentService` — Reversión completa

```typescript
async execute(input) {
  return await this.db.transaction(async (tx) => {
    const payment = await this.paymentsRepo.withTx(tx).getById(input.paymentId)
    // validaciones...

    // 1. Obtener y revertir aplicaciones
    const applications = await this.applicationsRepo.withTx(tx).getByPaymentId(payment.id)
    for (const app of applications) {
      await this.quotasRepo.withTx(tx).adjustBalance(app.quotaId, -app.amount)
      await this.applicationsRepo.withTx(tx).update(app.id, { status: 'reversed' })
    }

    // 2. Actualizar payment
    const refunded = await this.paymentsRepo.withTx(tx).update(payment.id, {
      status: 'refunded',
      notes: input.refundReason,
    })

    // 3. Audit log
    await this.auditRepo.withTx(tx).create({
      tableName: 'payments', recordId: payment.id,
      action: 'refund', userId: input.refundedByUserId,
      details: { reason: input.refundReason, amount: payment.amount },
    })

    return success({ payment: refunded })
  })
}
```

#### 7.2 Race condition en cuotas

Agregar migración:
```sql
CREATE UNIQUE INDEX uq_quotas_unit_concept_period
  ON quotas (unit_id, payment_concept_id, period_year, period_month)
  WHERE status != 'cancelled';
```

Usar `ON CONFLICT DO NOTHING` en el servicio de generación.

#### 7.3 Payment Status Machine

Crear `apps/api/src/services/payments/payment-status-machine.ts` con transiciones válidas.

---

### Paso 8: Tests priorizados

**Prioridad 1 — Autorización (~100 tests):**
- Tests de `requireRole` middleware
- Para cada módulo: verificar que roles no autorizados → 403
- Verificar que SUPERADMIN no accede a rutas de condominio → 403
- Verificar scoping: user de condo A no ve datos de condo B

**Prioridad 2 — Lógica financiera (~50 tests):**
- `RefundPaymentService` con reversión
- `GenerateQuotasForScheduleService` sin duplicados
- Payment status transitions
- Payment applications y saldos

**Prioridad 3 — Flujos de integración (~7 tests):**
1. SUPERADMIN crea company → invita admin → admin acepta
2. ADMIN crea condominio → edificio → unidades → invita residente
3. Generación de cuotas → reporte de pago → verificación → cuota pagada
4. Rechazo de pago
5. Reembolso completo
6. Reservación de amenidad → aprobación
7. Ticket de soporte → asignación → resolución

---

## Orden de Ejecución (secuencial, sin volver atrás)

| # | Tarea | Archivos principales | Dependencia |
|---|-------|---------------------|-------------|
| 1 | `withTx()` en BaseRepository | `base.repository.ts` | Ninguna |
| 2 | Middleware `requireRole()` + tests | Nuevo archivo + tests | Ninguna |
| 3 | Reestructurar rutas backend: mover paths a `/platform`, `/condominium`, `/me` y aplicar `requireRole` a CADA ruta | Todos los endpoints + controllers (~50 archivos) | Paso 2 |
| 4 | Scoping de condominio en handlers y servicios de lectura | Controllers + repos que necesiten `listByCondominium` | Paso 3 |
| 5 | Transacciones en servicios multi-step | ~6 servicios + sus controllers | Paso 1 |
| 6 | Reestructurar frontend: `middleware.ts`, layout guards, sidebar, mover páginas | ~15 archivos frontend | Paso 3 (por las nuevas rutas API) |
| 7 | Fixes de lógica: refund, race condition, status machine | ~4 servicios + 1 migración | Pasos 1, 5 |
| 8 | Tests de autorización y financieros | Nuevos test files | Pasos 2-7 |

---

## Notas Críticas para Claude Code

1. **NO crear contenedor IoC** — La DI manual con Endpoints funciona bien. Solo agregar `db` como parámetro a los servicios que necesiten transacciones.

2. **`requireRole` reemplaza `isSuperadmin`** para rutas platform. No eliminar `isSuperadmin` de golpe, deprecarlo gradualmente.

3. **El `createRouter` con switch manual funciona** — No refactorizarlo ahora. Soporta hasta 4+ middlewares que es suficiente.

4. **`getFullSession()` en el frontend** no está en el zip — existe en `@/libs/session`. Claude Code debe verificar su implementación y asegurar que los layout guards la usen correctamente.

5. **Los nombres de roles en la DB son uppercase** (`SUPERADMIN`, `ADMIN`, etc.) según el schema de `roles`. El middleware debe comparar en uppercase.

6. **El header `x-condominium-id`** es el mecanismo de scoping. El frontend ya tiene `selectedCondominium` en el Zustand store — solo hay que agregar el header al API client.

7. **No mover archivos de servicios** — La estructura `services/payments/`, `services/quotas/` etc. está bien. Solo modificar el contenido.

8. **Tests usan testcontainers** (basado en `DatabaseService.initialize(pool)` y `resetInstance()`) — Los tests de autorización deben usar este patrón existente.
