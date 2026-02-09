# ACTION_PLAN.md — La Torre App Platform

**Date:** 2026-02-08
**Based on:** AUDIT_REPORT.md
**Priority:** Seguridad > Integridad de Datos > UX > Tests

---

## Table of Contents

1. [Reestructuración de Rutas por Rol](#1-reestructuración-de-rutas-por-rol)
2. [Plan de Middleware de Autorización](#2-plan-de-middleware-de-autorización)
3. [Plan de Tests (Priorizado)](#3-plan-de-tests-priorizado)
4. [Plan de Corrección de Schemas](#4-plan-de-corrección-de-schemas)
5. [Plan de Corrección de Servicios](#5-plan-de-corrección-de-servicios)
6. [Orden de Implementación](#6-orden-de-implementación)

---

## 1. Reestructuración de Rutas por Rol

### 1.1 Backend: Separación de Rutas API

#### Estructura Propuesta

```
/api/
├── /health                         # Público
├── /auth/                          # Público (register, register/google)
├── /admin-invitations/validate/    # Público (token)
├── /admin-invitations/accept/      # Público (token)
├── /user-invitations/validate/     # Público (token)
├── /user-invitations/accept/       # Público (token)
│
├── /platform/                      # Solo SUPERADMIN
│   ├── /management-companies       # CRUD empresas administradoras
│   ├── /admin-invitations          # Crear/listar/cancelar invitaciones
│   ├── /support-tickets            # Dashboard de tickets
│   ├── /subscription-rates         # Planes y precios
│   ├── /currencies                 # CRUD monedas
│   ├── /exchange-rates             # CRUD tasas de cambio
│   ├── /payment-gateways           # Pasarelas de pago (plataforma)
│   ├── /users                      # Gestión usuarios plataforma
│   ├── /roles                      # Roles del sistema
│   ├── /permissions                # Permisos del sistema
│   ├── /audit-logs                 # Logs de auditoría plataforma
│   └── /reports                    # Reportes de plataforma
│
├── /condominium/                   # Roles condominio (ADMIN, ACCOUNTANT, SUPPORT, USER)
│   ├── /condominiums               # Leer condominio actual (scoped)
│   ├── /buildings                  # CRUD edificios
│   ├── /units                      # CRUD unidades
│   ├── /unit-ownerships            # CRUD propiedades
│   ├── /quotas                     # CRUD cuotas
│   ├── /quota-adjustments          # Ajustes
│   ├── /quota-formulas             # Fórmulas
│   ├── /quota-generation-rules     # Reglas de generación
│   ├── /payments                   # CRUD pagos
│   ├── /payment-applications       # Aplicaciones de pago
│   ├── /payment-concepts           # Conceptos de pago
│   ├── /entity-payment-gateways    # Pasarelas por entidad
│   ├── /payment-pending-allocations # Asignaciones pendientes
│   ├── /expenses                   # CRUD gastos
│   ├── /expense-categories         # Categorías de gastos
│   ├── /amenities                  # CRUD amenidades
│   ├── /amenity-reservations       # Reservaciones
│   ├── /interest-configurations    # Config intereses
│   ├── /documents                  # Documentos
│   ├── /messages                   # Mensajes internos
│   ├── /notifications              # Notificaciones
│   ├── /support-tickets            # Tickets de soporte (crear/ver propios)
│   ├── /user-invitations           # Invitaciones a usuarios
│   └── /user-roles                 # Roles de usuarios en condominio
│
├── /me/                            # Cualquier usuario autenticado
│   ├── /profile                    # Perfil propio
│   ├── /notifications              # Notificaciones propias
│   ├── /notification-preferences   # Preferencias
│   ├── /fcm-tokens                 # Push tokens
│   └── /condominiums               # Mis condominios
```

#### Matriz de Acceso por Módulo

| Módulo | SUPERADMIN | ADMIN | ACCOUNTANT | SUPPORT | USER |
|--------|-----------|-------|-----------|---------|------|
| management-companies | CRUD | ❌ | ❌ | ❌ | ❌ |
| admin-invitations | CRUD | ❌ | ❌ | ❌ | ❌ |
| subscription-rates | CRUD | ❌ | ❌ | ❌ | ❌ |
| currencies | CRUD | Read | Read | ❌ | ❌ |
| condominiums | Read (todos) | Read (propios) | ❌ | ❌ | ❌ |
| buildings | ❌ | CRUD | Read | Read | ❌ |
| units | ❌ | CRUD | Read | Read | Read (propias) |
| unit-ownerships | ❌ | CRUD | Read | Read | Read (propias) |
| quotas | ❌ | CRUD | CRUD | Read | Read (propias) |
| quota-adjustments | ❌ | CRUD | CRUD | ❌ | ❌ |
| payments | ❌ | CRUD | CRUD | ❌ | Read (propios) + Report |
| expenses | ❌ | CRUD | CRUD | ❌ | ❌ |
| amenities | ❌ | CRUD | ❌ | Read | Read |
| amenity-reservations | ❌ | CRUD + Approve | ❌ | CRUD + Approve | Create + Read (propias) |
| support-tickets | Read + Manage | Create | ❌ | Manage | Create |
| notifications | ❌ | Send | ❌ | Send | Read (propias) |
| documents | ❌ | CRUD | Read | Read | Read (públicos) |
| messages | ❌ | CRUD | ❌ | CRUD | Read |
| user-invitations | ❌ | CRUD | ❌ | ❌ | ❌ |
| user-roles | ❌ | CRUD | ❌ | ❌ | ❌ |
| audit-logs | Read | Read (scoped) | ❌ | ❌ | ❌ |

### 1.2 Frontend: Separación de Páginas

#### Estructura Propuesta

```
/dashboard/
├── page.tsx                        # Landing por rol (redirige según rol)
│
├── /platform/                      # Solo SUPERADMIN
│   ├── page.tsx                    # Dashboard de plataforma (métricas, MRR, etc.)
│   ├── /management-companies/      # Gestión empresas
│   ├── /users/                     # Gestión usuarios plataforma
│   ├── /rates/                     # Planes y precios
│   ├── /currencies/                # Monedas y tasas
│   ├── /billing/                   # Facturación
│   └── /tickets/                   # Tickets de soporte
│
├── /admin/                         # ADMIN, ACCOUNTANT, SUPPORT (según sub-permisos)
│   ├── page.tsx                    # Dashboard operacional
│   ├── /buildings/                 # Edificios
│   ├── /units/                     # Unidades
│   ├── /residents/                 # Residentes/propietarios
│   ├── /quotas/                    # Cuotas
│   ├── /payments/                  # Pagos
│   ├── /expenses/                  # Gastos
│   ├── /amenities/                 # Amenidades
│   ├── /reports/                   # Reportes financieros
│   └── /settings/                  # Configuración del condominio
│
├── /resident/                      # USER
│   ├── page.tsx                    # Dashboard residente
│   ├── /my-quotas/                 # Mis cuotas
│   ├── /my-payments/               # Mis pagos
│   ├── /report-payment/            # Reportar pago
│   ├── /reservations/              # Reservaciones
│   └── /support/                   # Soporte
│
├── /settings/                      # Todos
│   ├── page.tsx
│   ├── /language/
│   └── /appearance/
```

### 1.3 Sidebar por Rol

#### SUPERADMIN

```typescript
const superadminSidebarItems = [
  { key: 'dashboard', title: 'superadmin.nav.dashboard', href: '/dashboard/platform' },
  { key: 'companies', title: 'superadmin.nav.companies', href: '/dashboard/platform/management-companies' },
  { key: 'users', title: 'superadmin.nav.users', href: '/dashboard/platform/users' },
  { key: 'rates', title: 'superadmin.nav.rates', href: '/dashboard/platform/rates' },
  { key: 'currencies', title: 'superadmin.nav.currencies', href: '/dashboard/platform/currencies' },
  { key: 'billing', title: 'superadmin.nav.billing', href: '/dashboard/platform/billing' },
  { key: 'tickets', title: 'superadmin.nav.tickets', href: '/dashboard/platform/tickets' },
  // ❌ ELIMINAR: quotas, payments, expenses, amenities
]
```

#### ADMIN

```typescript
const adminSidebarItems = [
  { key: 'dashboard', title: 'admin.nav.dashboard', href: '/dashboard/admin' },
  { key: 'buildings', title: 'admin.nav.buildings', href: '/dashboard/admin/buildings' },
  { key: 'units', title: 'admin.nav.units', href: '/dashboard/admin/units' },
  { key: 'residents', title: 'admin.nav.residents', href: '/dashboard/admin/residents' },
  { key: 'quotas', title: 'admin.nav.quotas', href: '/dashboard/admin/quotas' },
  { key: 'payments', title: 'admin.nav.payments', href: '/dashboard/admin/payments' },
  { key: 'expenses', title: 'admin.nav.expenses', href: '/dashboard/admin/expenses' },
  { key: 'amenities', title: 'admin.nav.amenities', href: '/dashboard/admin/amenities' },
  { key: 'reports', title: 'admin.nav.reports', href: '/dashboard/admin/reports' },
]
```

#### ACCOUNTANT

```typescript
const accountantSidebarItems = [
  { key: 'dashboard', title: 'accountant.nav.dashboard', href: '/dashboard/admin' },
  { key: 'quotas', title: 'accountant.nav.quotas', href: '/dashboard/admin/quotas' },
  { key: 'payments', title: 'accountant.nav.payments', href: '/dashboard/admin/payments' },
  { key: 'expenses', title: 'accountant.nav.expenses', href: '/dashboard/admin/expenses' },
  { key: 'reports', title: 'accountant.nav.reports', href: '/dashboard/admin/reports' },
  // residents y buildings: read-only, accesible pero sin link en sidebar
]
```

#### SUPPORT

```typescript
const supportSidebarItems = [
  { key: 'dashboard', title: 'support.nav.dashboard', href: '/dashboard/admin' },
  { key: 'tickets', title: 'support.nav.tickets', href: '/dashboard/admin/tickets' },
  { key: 'reservations', title: 'support.nav.reservations', href: '/dashboard/admin/reservations' },
  { key: 'announcements', title: 'support.nav.announcements', href: '/dashboard/admin/announcements' },
  // amenities: read-only visible
]
```

#### USER (Residente)

```typescript
const residentSidebarItems = [
  { key: 'dashboard', title: 'resident.nav.dashboard', href: '/dashboard/resident' },
  { key: 'my-quotas', title: 'resident.nav.myQuotas', href: '/dashboard/resident/my-quotas' },
  { key: 'my-payments', title: 'resident.nav.myPayments', href: '/dashboard/resident/my-payments' },
  { key: 'report-payment', title: 'resident.nav.reportPayment', href: '/dashboard/resident/report-payment' },
  { key: 'reservations', title: 'resident.nav.reservations', href: '/dashboard/resident/reservations' },
  { key: 'support', title: 'resident.nav.support', href: '/dashboard/resident/support' },
]
```

---

## 2. Plan de Middleware de Autorización

### 2.1 Backend: Middleware de Rol

#### Nuevo middleware: `requireRole`

```typescript
// apps/api/src/http/middlewares/utils/auth/require-role.ts

type TRole = 'superadmin' | 'admin' | 'accountant' | 'support' | 'user'

/**
 * Middleware que verifica que el usuario tenga uno de los roles requeridos
 * en el condominio actual (extraído del header o contexto).
 */
export function requireRole(...allowedRoles: TRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get(AUTHENTICATED_USER_PROP)

    if (allowedRoles.includes('superadmin')) {
      const isSuperadmin = await checkIsSuperadmin(user.id)
      if (isSuperadmin) return next()
    }

    // Para roles de condominio, necesitamos el condominiumId
    const condominiumId = c.req.header('x-condominium-id')
      || c.req.query('condominiumId')
      || extractCondominiumFromBody(c)

    if (!condominiumId) {
      return c.json({ error: 'Condominium context required' }, 400)
    }

    const userRoles = await getUserRolesForCondominium(user.id, condominiumId)
    const hasAllowedRole = userRoles.some(r => allowedRoles.includes(r.name))

    if (!hasAllowedRole) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    // Set condominium in context for downstream scoping
    c.set('condominiumId', condominiumId)
    c.set('userRoles', userRoles)

    return next()
  }
}
```

#### Nuevo middleware: `requireCondominiumScope`

```typescript
// Middleware que asegura todas las queries estén scoped al condominio
export function requireCondominiumScope() {
  return async (c: Context, next: Next) => {
    const condominiumId = c.get('condominiumId')
    if (!condominiumId) {
      return c.json({ error: 'Condominium scope required' }, 400)
    }
    // El condominiumId ya está en contexto para que los services lo usen
    return next()
  }
}
```

#### Aplicación en rutas

```typescript
// Ejemplo: QuotasController routes
get routes(): TRouteDefinition[] {
  return [
    {
      method: 'get',
      path: '/quotas',
      middlewares: [
        authMiddleware,
        requireRole('admin', 'accountant'),
        requireCondominiumScope(),
      ],
      handler: this.list,
    },
    {
      method: 'post',
      path: '/quotas',
      middlewares: [
        authMiddleware,
        requireRole('admin', 'accountant'),
        requireCondominiumScope(),
        bodyValidator(CreateQuotaSchema),
      ],
      handler: this.create,
    },
    // ...
  ]
}
```

### 2.2 Frontend: Guards de Ruta

#### Layout-level guards

```typescript
// apps/web/src/app/(dashboard)/dashboard/platform/layout.tsx
export default async function PlatformLayout({ children }) {
  const session = await getFullSession()
  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }
  return <>{children}</>
}

// apps/web/src/app/(dashboard)/dashboard/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await getFullSession()
  if (session.superadmin?.isActive) {
    redirect('/dashboard/platform')
  }
  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }
  // Check role is admin, accountant, or support
  const userRole = session.selectedCondominium?.role
  if (!['admin', 'accountant', 'support'].includes(userRole)) {
    redirect('/dashboard/resident')
  }
  return <>{children}</>
}

// apps/web/src/app/(dashboard)/dashboard/resident/layout.tsx
export default async function ResidentLayout({ children }) {
  const session = await getFullSession()
  if (session.superadmin?.isActive) {
    redirect('/dashboard/platform')
  }
  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }
  return <>{children}</>
}
```

#### Hook `useAuthorize` para componentes client

```typescript
// apps/web/src/hooks/useAuthorize.ts
export function useAuthorize(allowedRoles: string[]) {
  const { user, selectedCondominium, superadmin } = useSessionStore()

  if (allowedRoles.includes('superadmin') && superadmin?.isActive) return true

  const userRole = selectedCondominium?.role
  return allowedRoles.includes(userRole)
}
```

---

## 3. Plan de Tests (Priorizado)

### 3.1 Sprint 1: Tests de Autorización (CRÍTICO)

#### Nuevo archivo: `tests/http/middlewares/require-role.middleware.test.ts`

```
Tests a crear:
- Rechaza request sin token (401)
- Rechaza usuario sin rol en el condominio (403)
- Permite ADMIN en ruta de ADMIN
- Rechaza USER en ruta de ADMIN
- Rechaza SUPERADMIN en ruta de condominio
- Permite ACCOUNTANT en ruta de ACCOUNTANT
- Rechaza SUPPORT en ruta de ACCOUNTANT
- Maneja condominiumId faltante (400)
- Valida que condominiumId sea UUID válido
```

#### Nuevo archivo: `tests/http/authorization/quotas-authorization.test.ts`

```
Tests a crear para cada módulo financiero:
- USER no puede crear cuotas → 403
- SUPPORT no puede crear cuotas → 403
- SUPERADMIN no puede crear cuotas → 403
- ACCOUNTANT puede crear cuotas → 200
- ADMIN puede crear cuotas → 200
- USER puede ver sus propias cuotas → 200
- USER no puede ver cuotas de otro usuario → 403
```

Repetir patrón para: payments, expenses, amenities, buildings, units, etc.

**Total: ~120 tests de autorización**

### 3.2 Sprint 2: Tests de Controllers Faltantes

| Controller | Tests a Crear | Prioridad |
|-----------|--------------|-----------|
| auth | Register, Register Google, edge cases | ALTA |
| admin-invitations | CRUD + token flow | ALTA |
| user-invitations | CRUD + accept flow | ALTA |
| support-tickets | CRUD + status transitions | ALTA |
| amenities | CRUD | ALTA |
| amenity-reservations | CRUD + approve/reject | ALTA |
| quota-generation-rules | CRUD + effective rules | ALTA |
| quota-formulas | CRUD + calculate | MEDIA |
| notifications | Send + mark read | MEDIA |
| management-company-members | CRUD | MEDIA |
| subscription-rates | CRUD | MEDIA |
| subscription-invoices | CRUD | MEDIA |
| support-ticket-messages | CRUD | MEDIA |
| reports | CRUD | MEDIA |
| payment-pending-allocations | CRUD + allocate | ALTA |
| notification-templates | CRUD | BAJA |
| user-fcm-tokens | CRUD | BAJA |
| user-notification-preferences | CRUD | BAJA |
| subscription-acceptances | Flow | MEDIA |
| subscription-terms-conditions | CRUD | BAJA |
| management-company-subscriptions | CRUD | MEDIA |

**Total: ~200 tests nuevos**

### 3.3 Sprint 3: Tests de Servicios

#### Tests faltantes más críticos:

| Servicio | Tests a Crear | Prioridad |
|---------|--------------|-----------|
| GenerateQuotasForScheduleService | Race condition, duplicados, errores parciales | CRÍTICA |
| RefundPaymentService | Reversión de aplicaciones, audit trail | CRÍTICA |
| CreateCompanyWithAdminService | Transacción parcial, rollback | ALTA |
| CreateUserWithInvitationService | Rollback en fallo | ALTA |
| ReportPaymentService | Validaciones, estado | ALTA |
| AcceptUserInvitationService | Token expirado, ya usado | ALTA |
| CreateReservationService | Solapamiento, capacidad | ALTA |
| AdjustQuotaService | Límites, validaciones | MEDIA |

**Total: ~80 tests nuevos de servicios**

### 3.4 Sprint 4: Tests de Integración

```
Flujos a testear end-to-end:
1. ADMIN crea condominio → edificio → unidades → invita residente
2. ADMIN define concepto de pago → fórmula → regla → genera cuotas
3. USER ve cuotas → reporta pago → ADMIN verifica → cuota pagada
4. ADMIN rechaza pago → USER ve pago rechazado
5. ADMIN reembolsa pago → cuota vuelve a pendiente
6. USER reserva amenidad → ADMIN aprueba
7. SUPERADMIN crea management company → invita admin → admin acepta
```

**Total: ~7 tests de integración (cada uno ~50 assertions)**

### 3.5 Sprint 5: Tests de Schemas

```
Para cada schema de controller:
- Rechaza body vacío
- Rechaza campos requeridos faltantes
- Rechaza tipos incorrectos
- Rechaza valores fuera de rango
- Acepta valores válidos en límites
- Valida formato de fechas
- Valida precisión de montos
```

**Total: ~100 tests de validación**

---

## 4. Plan de Corrección de Schemas

### 4.1 Schema de Montos Financieros (CRÍTICO)

**Archivos a modificar:**
- `quotas.controller.ts` — CreateQuotaSchema
- `payments.controller.ts` — CreatePaymentSchema, ReportPaymentSchema
- `expenses.controller.ts` — CreateExpenseSchema
- `quota-adjustments.controller.ts` — CreateAdjustmentSchema

**Cambio:**

```typescript
// Antes
amount: z.string()
// O
amount: z.number().positive()

// Después
amount: z.string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must have at most 2 decimal places')
  .refine(val => parseFloat(val) > 0, 'Amount must be positive')
  .refine(val => parseFloat(val) <= 999999999.99, 'Amount exceeds maximum')
```

### 4.2 Schema de Fechas (ALTO)

**Archivos a modificar:**
- `quota-generation-rules.controller.ts`
- `expenses.controller.ts`
- `interest-configurations.controller.ts`

**Cambio:**

```typescript
// Antes
effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Después
effectiveFrom: z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(val => !isNaN(Date.parse(val)), 'Invalid date')
  .refine(val => {
    const d = new Date(val)
    return d.getFullYear() >= 2020 && d.getFullYear() <= 2100
  }, 'Date out of valid range')
```

### 4.3 Schema de Cross-Field Validation (ALTO)

**Archivos a modificar:**
- `quota-generation-rules.controller.ts` — effectiveFrom/effectiveTo
- `payments.controller.ts` — dateRange queries
- `expenses.controller.ts` — dateRange queries

**Cambio:**

```typescript
// Antes
z.object({
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
})

// Después
z.object({
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
}).refine(data => {
  if (data.effectiveTo) {
    return new Date(data.effectiveTo) > new Date(data.effectiveFrom)
  }
  return true
}, { message: 'effectiveTo must be after effectiveFrom' })
```

### 4.4 Schema de Updates No Vacíos (MEDIO)

**Archivos a modificar:** Todos los controllers con PATCH endpoints

```typescript
// Añadir a todos los UpdateSchemas:
.refine(data => Object.keys(data).length > 0, 'At least one field must be provided')
```

### 4.5 Schema de Reservaciones (MEDIO)

**Archivo:** `amenity-reservations.controller.ts`

```typescript
const CreateReservationSchema = z.object({
  amenityId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  // ...
}).refine(data => {
  return new Date(data.endTime) > new Date(data.startTime)
}, 'End time must be after start time')
.refine(data => {
  return new Date(data.startTime) > new Date()
}, 'Cannot reserve in the past')
```

---

## 5. Plan de Corrección de Servicios

### 5.1 Transacciones (CRÍTICO)

**Servicios a envolver en transacción:**

| Servicio | Operaciones | Cambio |
|---------|------------|--------|
| `CreateCompanyWithAdminService` | create user + company + invitation | Wrap en `db.transaction()` |
| `CreateCompanyWithExistingAdminService` | create company + member + subscription | Wrap en `db.transaction()` |
| `CreateUserWithInvitationService` | create user + role + update invitation | Wrap en `db.transaction()` (eliminar rollback manual) |
| `GenerateQuotasForScheduleService` | create N quotas | Wrap loop en `db.transaction()` |
| `AcceptUserInvitationService` | update invitation + create ownership + role | Wrap en `db.transaction()` |
| `AcceptAdminInvitationService` | update invitation + create company + member | Wrap en `db.transaction()` |
| `RefundPaymentService` | update payment + reverse applications + update quotas | Wrap en `db.transaction()` |
| `VerifyPaymentService` | update payment + create applications | Wrap en `db.transaction()` |

**Patrón de implementación:**

```typescript
async execute(input: TInput): Promise<TServiceResult<TOutput>> {
  return await this.db.transaction(async (tx) => {
    // Todas las operaciones usan tx en lugar de this.repository
    const txRepo = this.repository.withTransaction(tx)
    // ... operaciones
    return success(result)
  }).catch(error => {
    return failure('Transaction failed: ' + error.message, 'INTERNAL_ERROR')
  })
}
```

**Requisito previo:** Añadir método `withTransaction(tx)` al BaseRepository.

### 5.2 Scoping de Condominio (CRÍTICO)

**Patrón a implementar en TODOS los servicios de lectura:**

```typescript
// Antes
async execute(input: { userId: string }) {
  return success(await this.repo.getByUserId(input.userId))
}

// Después
async execute(input: { userId: string, condominiumId: string }) {
  // Verificar que el userId tiene relación con el condominium
  const hasAccess = await this.scopeValidator.userBelongsToCondominium(
    input.userId, input.condominiumId
  )
  if (!hasAccess) return failure('Access denied', 'FORBIDDEN')

  return success(await this.repo.getByUserIdAndCondominium(
    input.userId, input.condominiumId
  ))
}
```

**Servicios a modificar (todos los de lectura):**
- Todos los `get-*-by-user` services
- Todos los `get-*-by-unit` services
- Todos los `get-*-by-building` services
- Todos los `get-*-by-condominium` services (verificar acceso)

### 5.3 Race Condition en Generación de Cuotas (CRÍTICO)

**Archivo:** `generate-quotas-for-schedule.service.ts`

**Cambio 1:** Añadir constraint UNIQUE en BD

```sql
ALTER TABLE quotas ADD CONSTRAINT uq_quotas_unit_concept_period
  UNIQUE (unit_id, payment_concept_id, period_year, period_month)
  WHERE status != 'cancelled';
```

**Cambio 2:** Usar `INSERT ... ON CONFLICT DO NOTHING`

```typescript
// En vez de check-then-insert, usar upsert
for (const unit of units) {
  await this.quotasRepo.createIfNotExists({
    unitId: unit.id,
    paymentConceptId: rule.paymentConceptId,
    periodYear,
    periodMonth,
    // ...
  })
}
```

**Cambio 3:** Envolver en transacción con lock

### 5.4 Refund con Reversión de Aplicaciones (CRÍTICO)

**Archivo:** `refund-payment.service.ts`

```typescript
async execute(input: TRefundInput): Promise<TServiceResult<TPayment>> {
  return await this.db.transaction(async (tx) => {
    const payment = await this.paymentsRepo.withTx(tx).getById(input.paymentId)
    if (!payment) return failure('Payment not found', 'NOT_FOUND')
    if (payment.status !== 'completed') return failure('Can only refund completed payments', 'BAD_REQUEST')

    // 1. Obtener todas las aplicaciones del pago
    const applications = await this.applicationsRepo.withTx(tx).getByPaymentId(payment.id)

    // 2. Revertir cada aplicación (descontar del saldo de cuota)
    for (const app of applications) {
      await this.quotasRepo.withTx(tx).adjustBalance(app.quotaId, -app.amount)
      // Actualizar estado de cuota si vuelve a tener saldo pendiente
      const quota = await this.quotasRepo.withTx(tx).getById(app.quotaId)
      if (quota.status === 'paid') {
        await this.quotasRepo.withTx(tx).update(app.quotaId, { status: 'pending' })
      }
      // Marcar aplicación como reversed
      await this.applicationsRepo.withTx(tx).update(app.id, { status: 'reversed' })
    }

    // 3. Actualizar payment
    const refundedPayment = await this.paymentsRepo.withTx(tx).update(payment.id, {
      status: 'refunded',
      refundedAt: new Date(),
      refundedBy: input.refundedBy,
      refundReason: input.reason,
    })

    // 4. Crear audit log
    await this.auditLogsRepo.withTx(tx).create({
      tableName: 'payments',
      recordId: payment.id,
      action: 'refund',
      userId: input.refundedBy,
      details: { reason: input.reason, originalAmount: payment.amount },
    })

    return success(refundedPayment)
  })
}
```

### 5.5 Máquina de Estados para Payments (ALTO)

**Nuevo archivo:** `services/payments/payment-status-machine.ts`

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending': ['completed', 'failed', 'cancelled'],
  'pending_verification': ['completed', 'rejected'],
  'completed': ['refunded'],
  'rejected': ['pending_verification'], // retry
  'refunded': [], // terminal
  'failed': ['pending'], // retry
  'cancelled': [], // terminal
}

export function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
```

### 5.6 Mensajes de Error Genéricos (ALTO)

**Todos los servicios de invitación y registro:**

```typescript
// Antes
return failure('A user with this email already exists', 'CONFLICT')

// Después
return failure('Unable to complete registration', 'CONFLICT')
// Log detailed reason for internal debugging:
this.logger.warn('Registration conflict', { email, reason: 'duplicate' })
```

---

## 6. Orden de Implementación

### Fase 1: Fundamentos de Seguridad (Semana 1-2)

| # | Tarea | Prioridad | Dependencia |
|---|-------|-----------|-------------|
| 1.1 | Crear middleware `requireRole()` | 🔴 CRÍTICO | Ninguna |
| 1.2 | Crear middleware `requireCondominiumScope()` | 🔴 CRÍTICO | 1.1 |
| 1.3 | Añadir `withTransaction(tx)` a BaseRepository | 🔴 CRÍTICO | Ninguna |
| 1.4 | Aplicar `requireRole` a TODAS las rutas de condominio | 🔴 CRÍTICO | 1.1, 1.2 |
| 1.5 | Aplicar `requireRole('superadmin')` a rutas de plataforma existentes sin él | 🔴 CRÍTICO | 1.1 |
| 1.6 | Tests de `requireRole` middleware | 🔴 CRÍTICO | 1.1 |

### Fase 2: Separación Platform/Condominium (Semana 2-3)

| # | Tarea | Prioridad | Dependencia |
|---|-------|-----------|-------------|
| 2.1 | Eliminar Quotas, Payments, Expenses, Amenities del sidebar SUPERADMIN | 🔴 CRÍTICO | Ninguna |
| 2.2 | Eliminar `session.superadmin?.isActive` de guards de páginas de condominio | 🔴 CRÍTICO | Ninguna |
| 2.3 | Filtrar sidebar de residente por rol (ocultar admin items a USERs) | 🟡 MEDIO | Ninguna |
| 2.4 | Crear layout guards para `/platform/*`, `/admin/*`, `/resident/*` | 🟠 ALTO | Ninguna |
| 2.5 | Reestructurar rutas del frontend (mover páginas) | 🟠 ALTO | 2.4 |

### Fase 3: Integridad de Datos (Semana 3-4)

| # | Tarea | Prioridad | Dependencia |
|---|-------|-----------|-------------|
| 3.1 | Envolver servicios críticos en transacciones | 🔴 CRÍTICO | 1.3 |
| 3.2 | Implementar scoping de condominio en servicios de lectura | 🔴 CRÍTICO | 1.2 |
| 3.3 | Corregir RefundPaymentService (reversión de aplicaciones) | 🔴 CRÍTICO | 1.3 |
| 3.4 | Añadir UNIQUE constraint para cuotas + ON CONFLICT | 🔴 CRÍTICO | 1.3 |
| 3.5 | Implementar PaymentStatusMachine | 🟠 ALTO | Ninguna |

### Fase 4: Validaciones (Semana 4-5)

| # | Tarea | Prioridad | Dependencia |
|---|-------|-----------|-------------|
| 4.1 | Fortalecer schemas de montos financieros | 🟠 ALTO | Ninguna |
| 4.2 | Fortalecer schemas de fechas | 🟠 ALTO | Ninguna |
| 4.3 | Añadir cross-field validation | 🟡 MEDIO | Ninguna |
| 4.4 | Añadir check de update no vacío | 🟡 MEDIO | Ninguna |
| 4.5 | Genéricizar mensajes de error | 🟠 ALTO | Ninguna |

### Fase 5: Tests (Semana 5-8)

| # | Tarea | Prioridad | Dependencia |
|---|-------|-----------|-------------|
| 5.1 | Tests de autorización para todos los controllers | 🟠 ALTO | 1.4 |
| 5.2 | Tests de controllers faltantes (21 controllers) | 🟠 ALTO | Fase 1-2 |
| 5.3 | Tests de servicios críticos | 🟡 MEDIO | Fase 3 |
| 5.4 | Tests de integración (7 flujos) | 🟡 MEDIO | Fase 1-4 |
| 5.5 | Tests de schemas | 🔵 BAJO | Fase 4 |

### Fase 6: Billing y Features Faltantes (Semana 8+)

| # | Tarea | Prioridad | Dependencia |
|---|-------|-----------|-------------|
| 6.1 | Implementar página `/dashboard/billing` | 🟡 MEDIO | Fase 2 |
| 6.2 | Implementar auditoría automática de operaciones financieras | 🟡 MEDIO | Fase 3 |
| 6.3 | Implementar solapamiento de reservaciones | 🟡 MEDIO | Fase 4 |

---

## Resumen de Esfuerzo Estimado

| Fase | Tareas | Archivos a Modificar | Tests Nuevos |
|------|--------|---------------------|-------------|
| Fase 1: Seguridad | 6 | ~50 controllers + 2 new middleware | ~30 |
| Fase 2: Separación | 5 | ~10 frontend files + sidebar | ~15 |
| Fase 3: Datos | 5 | ~15 services + 1 migration | ~40 |
| Fase 4: Validaciones | 5 | ~15 controller schemas | ~100 |
| Fase 5: Tests | 5 | Test files only | ~400 |
| Fase 6: Features | 3 | ~5 new files | ~20 |
| **TOTAL** | **29** | **~95 archivos** | **~605 tests** |

---

*Fin del Action Plan — Esperando aprobación para comenzar implementación.*
