# AUDIT_REPORT.md — La Torre App Platform

**Date:** 2026-02-08
**Auditor:** Claude (Architect)
**Scope:** Full codebase — Backend (Hono+Bun), Frontend (Next.js 15+), Tests, Services, Schemas
**Source of truth for roles:** `.claude/skills/roles-skill.md`

---

## Table of Contents

1. [Inventario de Rutas del Backend](#1-inventario-completo-de-rutas-del-backend)
2. [Inventario de Rutas del Frontend](#2-inventario-completo-de-rutas-del-frontend)
3. [Auditoría del Sidebar/Navegación](#3-auditoría-del-sidebarnavegación)
4. [Auditoría de Tests Existentes](#4-auditoría-de-tests-existentes)
5. [Cobertura de Tests](#5-cobertura-de-tests)
6. [Auditoría de Schemas y Validaciones](#6-auditoría-de-schemas-y-validaciones)
7. [Auditoría de Servicios y Lógica de Negocio](#7-auditoría-de-servicios-y-lógica-de-negocio)
8. [Resumen Ejecutivo](#8-resumen-ejecutivo)

---

## 1. Inventario Completo de Rutas del Backend

### Leyenda

- **Auth**: Middleware de autenticación aplicado
- **Role Check**: Verificación de rol específico
- ✅ Ruta correctamente protegida según skill de roles
- ❌ Ruta mal protegida o con acceso incorrecto
- ⚠️ Ruta sin protección de rol

### 1.1 Rutas Públicas (Sin Autenticación)

| Método | Path                                 | Controller                 | Auth            | Roles Actual | Roles Correcto | Estado                     |
| ------ | ------------------------------------ | -------------------------- | --------------- | ------------ | -------------- | -------------------------- |
| GET    | `/health`                            | HealthEndpoint             | Ninguno         | Público      | Público        | ✅                         |
| POST   | `/auth/register`                     | AuthController             | Ninguno         | Público      | Público        | ✅                         |
| POST   | `/auth/register/google`              | AuthController             | Ninguno         | Público      | Público        | ✅                         |
| GET    | `/admin-invitations/validate/:token` | AdminInvitationsController | paramsValidator | Público      | Público        | ✅                         |
| POST   | `/admin-invitations/accept/:token`   | AdminInvitationsController | isTokenValid    | Token válido | Token válido   | ✅                         |
| GET    | `/user-invitations/validate/:token`  | UserInvitationsController  | paramsValidator | Público      | Público        | ✅                         |
| POST   | `/user-invitations/accept/:token`    | UserInvitationsController  | Ninguno visible | Público      | Token válido   | ⚠️ Sin middleware de token |

### 1.2 Rutas de Platform (Solo SUPERADMIN)

| Método | Path                                  | Controller                    | Auth                               | Roles Actual | Roles Correcto | Estado |
| ------ | ------------------------------------- | ----------------------------- | ---------------------------------- | ------------ | -------------- | ------ |
| GET    | `/management-companies`               | ManagementCompaniesController | authMiddleware + isSuperadmin      | SUPERADMIN   | SUPERADMIN     | ✅     |
| GET    | `/management-companies/:id`           | ManagementCompaniesController | authMiddleware + isSuperadmin      | SUPERADMIN   | SUPERADMIN     | ✅     |
| POST   | `/management-companies`               | ManagementCompaniesController | authMiddleware + isSuperadmin      | SUPERADMIN   | SUPERADMIN     | ✅     |
| PATCH  | `/management-companies/:id`           | ManagementCompaniesController | authMiddleware + isSuperadmin      | SUPERADMIN   | SUPERADMIN     | ✅     |
| DELETE | `/management-companies/:id`           | ManagementCompaniesController | authMiddleware + isSuperadmin      | SUPERADMIN   | SUPERADMIN     | ✅     |
| GET    | `/management-companies/...` (filtros) | ManagementCompaniesController | authMiddleware + isSuperadmin      | SUPERADMIN   | SUPERADMIN     | ✅     |
| POST   | `/admin-invitations`                  | AdminInvitationsController    | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| GET    | `/admin-invitations`                  | AdminInvitationsController    | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| DELETE | `/admin-invitations/:id`              | AdminInvitationsController    | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| GET    | `/support-tickets` (all)              | SupportTicketsController      | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| PATCH  | `/support-tickets/:id`                | SupportTicketsController      | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| PATCH  | `/support-tickets/:id/assign`         | SupportTicketsController      | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| PATCH  | `/support-tickets/:id/resolve`        | SupportTicketsController      | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| PATCH  | `/support-tickets/:id/close`          | SupportTicketsController      | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |
| PATCH  | `/support-tickets/:id/status`         | SupportTicketsController      | isUserAuthenticated + isSuperadmin | SUPERADMIN   | SUPERADMIN     | ✅     |

### 1.3 Rutas de Condominio SIN Verificación de Rol ❌

**Problema crítico:** Todas estas rutas solo verifican `authMiddleware` (usuario autenticado) pero NO verifican qué **rol** tiene el usuario. Un USER podría crear cuotas, un SUPERADMIN podría gestionar pagos de condominios, etc.

#### Cuotas (DEBERÍA ser: ADMIN, ACCOUNTANT; Read-only para SUPPORT y USER con scope propio)

| Método | Path                           | Controller       | Auth           | Roles Actual                     | Roles Correcto                         | Estado |
| ------ | ------------------------------ | ---------------- | -------------- | -------------------------------- | -------------------------------------- | ------ |
| GET    | `/quotas`                      | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/quotas/unit/:unitId`         | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT, USER (solo propias) | ❌     |
| GET    | `/quotas/unit/:unitId/pending` | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT, USER (solo propias) | ❌     |
| GET    | `/quotas/status/:status`       | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/quotas/overdue/:date`        | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/quotas/period`               | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/quotas/:id`                  | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT, USER (solo propias) | ❌     |
| POST   | `/quotas`                      | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT                      | ❌     |
| PATCH  | `/quotas/:id`                  | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN, ACCOUNTANT                      | ❌     |
| DELETE | `/quotas/:id`                  | QuotasController | authMiddleware | ⚠️ Cualquier usuario autenticado | ADMIN                                  | ❌     |

#### Pagos (DEBERÍA ser: ADMIN, ACCOUNTANT para gestión; USER solo puede reportar y ver propios)

| Método | Path                             | Controller         | Auth           | Roles Actual         | Roles Correcto                         | Estado |
| ------ | -------------------------------- | ------------------ | -------------- | -------------------- | -------------------------------------- | ------ |
| GET    | `/payments`                      | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/payments/pending-verification` | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/payments/user/:userId`         | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT, USER (solo propios) | ❌     |
| GET    | `/payments/unit/:unitId`         | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| GET    | `/payments/:id`                  | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT, USER (solo propios) | ❌     |
| POST   | `/payments`                      | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| POST   | `/payments/report`               | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | USER, ADMIN                            | ❌     |
| POST   | `/payments/:id/verify`           | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| POST   | `/payments/:id/reject`           | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| PATCH  | `/payments/:id`                  | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                      | ❌     |
| DELETE | `/payments/:id`                  | PaymentsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                  | ❌     |

#### Gastos (DEBERÍA ser: ADMIN, ACCOUNTANT; NO SUPPORT, NO USER)

| Método | Path                         | Controller         | Auth           | Roles Actual         | Roles Correcto    | Estado |
| ------ | ---------------------------- | ------------------ | -------------- | -------------------- | ----------------- | ------ |
| GET    | `/expenses`                  | ExpensesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT | ❌     |
| GET    | `/expenses/pending-approval` | ExpensesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN             | ❌     |
| POST   | `/expenses`                  | ExpensesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT | ❌     |
| PATCH  | `/expenses/:id`              | ExpensesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT | ❌     |
| DELETE | `/expenses/:id`              | ExpensesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN             | ❌     |

#### Amenidades (DEBERÍA ser: ADMIN gestión completa; SUPPORT gestión reservas; USER solo reservar)

| Método | Path                                | Controller                    | Auth           | Roles Actual         | Roles Correcto       | Estado |
| ------ | ----------------------------------- | ----------------------------- | -------------- | -------------------- | -------------------- | ------ |
| GET    | `/amenities`                        | AmenitiesController           | authMiddleware | ⚠️ Cualquier usuario | ADMIN, SUPPORT, USER | ❌     |
| POST   | `/amenities`                        | AmenitiesController           | authMiddleware | ⚠️ Cualquier usuario | ADMIN                | ❌     |
| PATCH  | `/amenities/:id`                    | AmenitiesController           | authMiddleware | ⚠️ Cualquier usuario | ADMIN                | ❌     |
| DELETE | `/amenities/:id`                    | AmenitiesController           | authMiddleware | ⚠️ Cualquier usuario | ADMIN                | ❌     |
| GET    | `/amenity-reservations`             | AmenityReservationsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, SUPPORT       | ❌     |
| POST   | `/amenity-reservations`             | AmenityReservationsController | authMiddleware | ⚠️ Cualquier usuario | USER, ADMIN, SUPPORT | ❌     |
| PATCH  | `/amenity-reservations/:id/approve` | AmenityReservationsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, SUPPORT       | ❌     |
| PATCH  | `/amenity-reservations/:id/reject`  | AmenityReservationsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN, SUPPORT       | ❌     |

#### Propiedades y Estructura (DEBERÍA ser: ADMIN CRUD; ACCOUNTANT/SUPPORT/USER read-only)

| Método | Path                | Controller               | Auth           | Roles Actual         | Roles Correcto                            | Estado |
| ------ | ------------------- | ------------------------ | -------------- | -------------------- | ----------------------------------------- | ------ |
| GET    | `/condominiums`     | CondominiumsController   | authMiddleware | ⚠️ Cualquier usuario | ADMIN (scoped)                            | ❌     |
| POST   | `/condominiums`     | CondominiumsController   | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN o ADMIN                        | ❌     |
| PATCH  | `/condominiums/:id` | CondominiumsController   | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| DELETE | `/condominiums/:id` | CondominiumsController   | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| GET    | `/buildings`        | BuildingsController      | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT, SUPPORT, USER (scoped) | ❌     |
| POST   | `/buildings`        | BuildingsController      | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| PATCH  | `/buildings/:id`    | BuildingsController      | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| DELETE | `/buildings/:id`    | BuildingsController      | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| GET    | `/units`            | UnitsController          | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT, SUPPORT                | ❌     |
| POST   | `/units`            | UnitsController          | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| GET    | `/unit-ownerships`  | UnitOwnershipsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |
| POST   | `/unit-ownerships`  | UnitOwnershipsController | authMiddleware | ⚠️ Cualquier usuario | ADMIN                                     | ❌     |

#### Usuarios y Roles (DEBERÍA ser: SUPERADMIN o ADMIN según contexto)

| Método | Path           | Controller            | Auth                           | Roles Actual         | Roles Correcto             | Estado |
| ------ | -------------- | --------------------- | ------------------------------ | -------------------- | -------------------------- | ------ |
| GET    | `/users`       | UsersController       | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN, ADMIN (scoped) | ❌     |
| GET    | `/users/:id`   | UsersController       | authMiddleware + canAccessUser | Con scope            | SUPERADMIN, ADMIN, self    | ✅     |
| PATCH  | `/users/:id`   | UsersController       | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN, self           | ❌     |
| DELETE | `/users/:id`   | UsersController       | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN                 | ❌     |
| GET    | `/roles`       | RolesController       | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN, ADMIN          | ❌     |
| POST   | `/roles`       | RolesController       | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN                 | ❌     |
| GET    | `/permissions` | PermissionsController | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN                 | ❌     |
| POST   | `/permissions` | PermissionsController | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN                 | ❌     |
| GET    | `/user-roles`  | UserRolesController   | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN, ADMIN          | ❌     |
| POST   | `/user-roles`  | UserRolesController   | authMiddleware                 | ⚠️ Cualquier usuario | SUPERADMIN, ADMIN          | ❌     |

#### Configuración Financiera (DEBERÍA ser: ADMIN, ACCOUNTANT para condominio; SUPERADMIN para platform)

| Método | Path                  | Controller                  | Auth           | Roles Actual         | Roles Correcto                   | Estado     |
| ------ | --------------------- | --------------------------- | -------------- | -------------------- | -------------------------------- | ---------- |
| GET    | `/currencies`         | CurrenciesController        | authMiddleware | ⚠️ Cualquier usuario | Todos (read), SUPERADMIN (write) | ❌ (write) |
| POST   | `/currencies`         | CurrenciesController        | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN                       | ❌         |
| GET    | `/exchange-rates`     | ExchangeRatesController     | authMiddleware | ⚠️ Cualquier usuario | Todos (read)                     | ⚠️         |
| POST   | `/exchange-rates`     | ExchangeRatesController     | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN                       | ❌         |
| GET    | `/payment-concepts`   | PaymentConceptsController   | authMiddleware | ⚠️ Cualquier usuario | ADMIN, ACCOUNTANT                | ❌         |
| POST   | `/payment-concepts`   | PaymentConceptsController   | authMiddleware | ⚠️ Cualquier usuario | ADMIN                            | ❌         |
| GET    | `/payment-gateways`   | PaymentGatewaysController   | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN                       | ❌         |
| POST   | `/payment-gateways`   | PaymentGatewaysController   | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN                       | ❌         |
| GET    | `/subscription-rates` | SubscriptionRatesController | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN                       | ❌         |
| POST   | `/subscription-rates` | SubscriptionRatesController | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN                       | ❌         |

#### Notificaciones, Documentos, Mensajes, Audit Logs

| Método | Path                      | Controller                      | Auth           | Roles Actual         | Roles Correcto    | Estado |
| ------ | ------------------------- | ------------------------------- | -------------- | -------------------- | ----------------- | ------ |
| GET    | `/notifications`          | NotificationsController         | authMiddleware | ⚠️ Cualquier usuario | Self, ADMIN       | ❌     |
| POST   | `/notifications/send`     | NotificationsController         | authMiddleware | ⚠️ Cualquier usuario | ADMIN, SUPPORT    | ❌     |
| GET    | `/notification-templates` | NotificationTemplatesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN             | ❌     |
| POST   | `/notification-templates` | NotificationTemplatesController | authMiddleware | ⚠️ Cualquier usuario | ADMIN             | ❌     |
| GET    | `/documents`              | DocumentsController             | authMiddleware | ⚠️ Cualquier usuario | Scope-dependent   | ❌     |
| GET    | `/audit-logs`             | AuditLogsController             | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN, ADMIN | ❌     |
| POST   | `/audit-logs`             | AuditLogsController             | authMiddleware | ⚠️ Cualquier usuario | System only       | ❌     |
| GET    | `/messages`               | MessagesController              | authMiddleware | ⚠️ Cualquier usuario | Self, ADMIN       | ❌     |

#### Subscripciones y Miembros (DEBERÍA ser: SUPERADMIN)

| Método | Path                                | Controller              | Auth           | Roles Actual         | Roles Correcto          | Estado |
| ------ | ----------------------------------- | ----------------------- | -------------- | -------------------- | ----------------------- | ------ |
| GET    | `/management-company-subscriptions` | SubscriptionsController | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN              | ❌     |
| POST   | `/management-company-subscriptions` | SubscriptionsController | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN              | ❌     |
| GET    | `/subscription-invoices`            | InvoicesController      | authMiddleware | ⚠️ Cualquier usuario | SUPERADMIN, ADMIN (own) | ❌     |
| GET    | `/management-company-members`       | MembersController       | authMiddleware | ⚠️ Cualquier usuario | ADMIN                   | ❌     |
| POST   | `/management-company-members`       | MembersController       | authMiddleware | ⚠️ Cualquier usuario | ADMIN                   | ❌     |

### 1.4 Resumen de Rutas

| Categoría                         | Total Rutas | Correctas ✅  | Incorrectas ❌ | Sin Protección ⚠️ |
| --------------------------------- | ----------- | ------------- | -------------- | ----------------- |
| Públicas                          | 7           | 6             | 0              | 1                 |
| SUPERADMIN                        | 16          | 16            | 0              | 0                 |
| Condominio (necesitan role check) | ~150+       | 1 (users/:id) | **~149**       | **~149**          |
| **TOTAL**                         | **~173**    | **23**        | **~149**       | **~149**          |

> **HALLAZGO CRÍTICO:** El 86% de las rutas NO tienen verificación de rol. Solo verifican que el usuario está autenticado, pero cualquier usuario autenticado puede acceder a CUALQUIER endpoint.

---

## 2. Inventario Completo de Rutas del Frontend

### 2.1 Rutas Públicas

| Ruta                          | Auth Guard                                      | Estado |
| ----------------------------- | ----------------------------------------------- | ------ |
| `/`                           | Landing pública                                 | ✅     |
| `/signin`                     | Redirige a `/dashboard` si autenticado          | ✅     |
| `/signup`                     | Redirige a `/dashboard` si autenticado          | ✅     |
| `/forgot-password`            | Igual                                           | ✅     |
| `/accept-invitation?token=`   | Token-based                                     | ✅     |
| `/accept-subscription?token=` | Token-based                                     | ✅     |
| `/loading`                    | Solo permite `?register=true` o `?signout=true` | ✅     |
| `/select-condominium`         | Cookie `__session` requerida                    | ✅     |

### 2.2 Rutas Dashboard (Protegidas)

**Guard global:** Middleware verifica cookie `__session` → redirige a `/signin` si falta.
**Layout guard:** `getFullSession()` valida token y carga datos del usuario.

#### Rutas que el SUPERADMIN puede acceder pero NO DEBERÍA según la skill:

| Ruta                   | Guard Actual                              | Roles Actual       | Roles Correcto            | Estado |
| ---------------------- | ----------------------------------------- | ------------------ | ------------------------- | ------ |
| `/dashboard/quotas`    | `!superadmin && !condominiums` → redirect | SUPERADMIN + ADMIN | Solo ADMIN, ACCOUNTANT    | ❌     |
| `/dashboard/payments`  | `!superadmin && !condominiums` → redirect | SUPERADMIN + ADMIN | Solo ADMIN, ACCOUNTANT    | ❌     |
| `/dashboard/expenses`  | `!superadmin && !condominiums` → redirect | SUPERADMIN + ADMIN | Solo ADMIN, ACCOUNTANT    | ❌     |
| `/dashboard/amenities` | `!superadmin && !condominiums` → redirect | SUPERADMIN + ADMIN | Solo ADMIN, SUPPORT, USER | ❌     |

> **HALLAZGO CRÍTICO:** Las páginas de Cuotas, Pagos, Gastos y Amenidades permiten acceso explícito al SUPERADMIN con la condición `!session.superadmin?.isActive && !session.condominiums?.length`. Según la skill de roles, el SUPERADMIN NO debe acceder a estos módulos operacionales de condominio.

#### Rutas SUPERADMIN (correctas):

| Ruta                      | Guard                                                                    | Estado                 |
| ------------------------- | ------------------------------------------------------------------------ | ---------------------- |
| `/dashboard/users`        | `!superadmin → redirect` + checks `platform_superadmins.read` permission | ✅                     |
| `/dashboard/condominiums` | Fetch con token (implícito)                                              | ⚠️ Sin guard explícito |
| `/dashboard/admins`       | `!superadmin → redirect`                                                 | ✅                     |
| `/dashboard/rates`        | `!superadmin → redirect`                                                 | ✅                     |
| `/dashboard/currencies`   | Sin check explícito                                                      | ⚠️                     |
| `/dashboard/billing`      | **NO IMPLEMENTADA** (link en sidebar pero sin page.tsx)                  | ❌                     |

#### Rutas Residentes:

| Ruta                        | Guard                                                          | Roles Actual              | Estado |
| --------------------------- | -------------------------------------------------------------- | ------------------------- | ------ |
| `/dashboard/my-quotas`      | `!condominiums → redirect` + `unitIds.length === 0 → redirect` | USER con unidad           | ✅     |
| `/dashboard/my-payments`    | `!condominiums → redirect`                                     | USER con condominio       | ✅     |
| `/dashboard/report-payment` | `!condominiums → redirect`                                     | USER con ownership activo | ✅     |
| `/dashboard/reservations`   | `!condominiums → redirect`                                     | USER con condominio       | ✅     |

#### Rutas sin guard de rol explícito:

| Ruta                      | Guard            | Problema                                               |
| ------------------------- | ---------------- | ------------------------------------------------------ |
| `/dashboard/settings`     | Solo auth layout | ⚠️ Cualquier usuario puede acceder (aceptable)         |
| `/dashboard/tickets`      | Solo auth layout | ⚠️ Debería separar tickets de SUPERADMIN vs condominio |
| `/dashboard/condominiums` | Solo fetch       | ⚠️ Debería verificar isSuperadmin                      |
| `/dashboard/currencies`   | Solo auth layout | ⚠️ Debería verificar isSuperadmin                      |

### 2.3 Resumen Frontend

| Categoría              | Total | Correctas | Incorrectas               | Sin Guard |
| ---------------------- | ----- | --------- | ------------------------- | --------- |
| Públicas               | 8     | 8         | 0                         | 0         |
| SUPERADMIN             | 6+    | 3         | 1 (billing)               | 2         |
| Condominio-Operacional | 4     | 0         | **4** (superadmin accede) | 0         |
| Residente              | 4     | 4         | 0                         | 0         |
| Compartidas            | 3     | 1         | 0                         | 2         |

---

## 3. Auditoría del Sidebar/Navegación

### 3.1 Sidebar de Residente (`dashboardSidebarItems`)

| Item              | Ruta                        | Roles Actual                | Roles Correcto       | Estado                         |
| ----------------- | --------------------------- | --------------------------- | -------------------- | ------------------------------ |
| Dashboard         | `/dashboard`                | Todos                       | Todos                | ✅                             |
| Quotas (Admin)    | `/dashboard/quotas`         | Todos (page-level redirect) | ADMIN, ACCOUNTANT    | ⚠️ Se muestra a todos          |
| Payments (Admin)  | `/dashboard/payments`       | Todos (page-level redirect) | ADMIN, ACCOUNTANT    | ⚠️ Se muestra a todos          |
| Expenses (Admin)  | `/dashboard/expenses`       | Todos (page-level redirect) | ADMIN, ACCOUNTANT    | ⚠️ Se muestra a todos          |
| Amenities (Admin) | `/dashboard/amenities`      | Todos (page-level redirect) | ADMIN, SUPPORT       | ⚠️ Se muestra a todos          |
| My Quotas         | `/dashboard/my-quotas`      | Todos (page-level redirect) | USER                 | ⚠️ Se muestra a ADMINs también |
| My Payments       | `/dashboard/my-payments`    | Todos (page-level redirect) | USER                 | ⚠️ Se muestra a ADMINs también |
| Report Payment    | `/dashboard/report-payment` | Todos (page-level redirect) | USER                 | ⚠️ Se muestra a ADMINs también |
| Reservations      | `/dashboard/reservations`   | Todos (page-level redirect) | USER, ADMIN, SUPPORT | ⚠️                             |
| Settings          | `/dashboard/settings`       | Todos                       | Todos                | ✅                             |
| Logout            | N/A                         | Todos                       | Todos                | ✅                             |

> **PROBLEMA:** El sidebar de residente muestra TODOS los items a TODOS los usuarios autenticados sin filtrar por rol. La protección solo ocurre a nivel de página con redirects. Un ADMIN ve "My Quotas" y un USER ve "Quotas (Admin)" — ambos confusos.

### 3.2 Sidebar de SUPERADMIN (`superadminSidebarItems`)

| Item          | Ruta                      | Debería Mostrarse                     | Estado       |
| ------------- | ------------------------- | ------------------------------------- | ------------ |
| Dashboard     | `/dashboard`              | ✅ Sí                                 | ✅           |
| Users         | `/dashboard/users`        | ✅ Sí                                 | ✅           |
| Condominiums  | `/dashboard/condominiums` | ✅ Sí                                 | ✅           |
| Admins        | `/dashboard/admins`       | ✅ Sí                                 | ✅           |
| Rates         | `/dashboard/rates`        | ✅ Sí                                 | ✅           |
| Currencies    | `/dashboard/currencies`   | ✅ Sí                                 | ✅           |
| Billing       | `/dashboard/billing`      | ✅ Sí, pero NO IMPLEMENTADO           | ❌ Link roto |
| Tickets       | `/dashboard/tickets`      | ✅ Sí                                 | ✅           |
| **Quotas**    | `/dashboard/quotas`       | ❌ **NO — operacional de condominio** | ❌           |
| **Payments**  | `/dashboard/payments`     | ❌ **NO — operacional de condominio** | ❌           |
| **Expenses**  | `/dashboard/expenses`     | ❌ **NO — operacional de condominio** | ❌           |
| **Amenities** | `/dashboard/amenities`    | ❌ **NO — operacional de condominio** | ❌           |
| Settings      | `/dashboard/settings`     | ✅ Sí                                 | ✅           |

> **HALLAZGO CRÍTICO:** El sidebar de SUPERADMIN incluye 4 módulos operacionales de condominio (Quotas, Payments, Expenses, Amenities) que **NO debería mostrar según la skill de roles**. El SUPERADMIN opera a nivel plataforma y NO debe ver ni gestionar datos operacionales de condominio.

---

## 4. Auditoría de Tests Existentes

### 4.1 Test Infrastructure

| Archivo                         | Función                                        | Calidad              |
| ------------------------------- | ---------------------------------------------- | -------------------- |
| `tests/setup/preload.ts`        | Mock Firebase + auth middleware                | ✅ Bien implementado |
| `tests/setup/test-container.ts` | PostgreSQL test container con schema isolation | ✅ Excelente         |

### 4.2 Controller Tests (26 archivos)

| Archivo                                   | Funcionalidad              | # Tests  | Auth Testing | Assertions | Calidad |
| ----------------------------------------- | -------------------------- | -------- | ------------ | ---------- | ------- |
| `condominiums.controller.test.ts`         | CRUD condominios           | 13       | ❌ No        | ✅ Buenas  | ⚠️      |
| `management-companies.controller.test.ts` | CRUD management companies  | 12       | ❌ No        | ✅ Buenas  | ⚠️      |
| `payments.controller.test.ts`             | CRUD + verify/reject pagos | 27       | ❌ No        | ✅ Buenas  | ⚠️      |
| `buildings.controller.test.ts`            | CRUD edificios             | ~8       | ❌ No        | ✅ Buenas  | ⚠️      |
| `units.controller.test.ts`                | CRUD unidades              | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| `users.controller.test.ts`                | CRUD usuarios              | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| `quotas.controller.test.ts`               | CRUD cuotas                | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| `expenses.controller.test.ts`             | CRUD gastos                | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| `currencies.controller.test.ts`           | CRUD monedas               | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| `locations.controller.test.ts`            | CRUD ubicaciones           | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| `audit-logs.controller.test.ts`           | Queries audit              | ~8       | ❌ No        | ⚠️ Básicas | ⚠️      |
| Otros 15 controllers                      | CRUD estándar              | ~5-8 c/u | ❌ No        | ⚠️ Básicas | ⚠️      |

> **HALLAZGO:** 0/26 controller tests verifican autorización por rol. Todos usan mocks que bypasean la autenticación.

### 4.3 Controllers SIN Tests (21 controllers)

| Controller                       | Criticidad | Estado   |
| -------------------------------- | ---------- | -------- |
| admin-invitations                | ALTA       | 🚫 Falta |
| amenities                        | ALTA       | 🚫 Falta |
| amenity-reservations             | ALTA       | 🚫 Falta |
| auth                             | CRÍTICA    | 🚫 Falta |
| management-company-members       | MEDIA      | 🚫 Falta |
| management-company-subscriptions | MEDIA      | 🚫 Falta |
| notification-templates           | BAJA       | 🚫 Falta |
| notifications                    | MEDIA      | 🚫 Falta |
| payment-pending-allocations      | ALTA       | 🚫 Falta |
| quota-formulas                   | ALTA       | 🚫 Falta |
| quota-generation-rules           | ALTA       | 🚫 Falta |
| reports                          | MEDIA      | 🚫 Falta |
| subscription-acceptances         | MEDIA      | 🚫 Falta |
| subscription-invoices            | MEDIA      | 🚫 Falta |
| subscription-rates               | MEDIA      | 🚫 Falta |
| subscription-terms-conditions    | BAJA       | 🚫 Falta |
| support-ticket-messages          | MEDIA      | 🚫 Falta |
| support-tickets                  | ALTA       | 🚫 Falta |
| user-fcm-tokens                  | BAJA       | 🚫 Falta |
| user-invitations                 | ALTA       | 🚫 Falta |
| user-notification-preferences    | BAJA       | 🚫 Falta |

### 4.4 Middleware Tests (2 archivos)

| Archivo                              | # Tests | Calidad                               |
| ------------------------------------ | ------- | ------------------------------------- |
| `auth.middleware.test.ts`            | 5       | ⚠️ Cubre basics, falta token expirado |
| `can-access-user.middleware.test.ts` | 8       | ✅ Buena — verifica access control    |

### 4.5 Service Tests (~90 archivos)

| Categoría              | # Archivos | Calidad Promedio                |
| ---------------------- | ---------- | ------------------------------- |
| Payments               | 12         | ⚠️ Buena lógica, sin auth tests |
| Quotas                 | 5          | ⚠️ Básica                       |
| Audit Logs             | 6          | ⚠️ Básica                       |
| Documents              | 3          | ⚠️ Básica                       |
| Expenses               | 5          | ⚠️ Básica                       |
| Buildings              | 2          | ⚠️ Básica                       |
| Units                  | 2          | ⚠️ Básica                       |
| Unit Ownerships        | 4          | ⚠️ Básica                       |
| User Roles             | 1          | ⚠️ Básica                       |
| Users                  | 3          | ⚠️ Básica                       |
| Currencies             | 2          | ⚠️ Básica                       |
| Payment-related        | 8          | ⚠️ Básica                       |
| Quota Adjustments      | 4          | ⚠️ Básica                       |
| Quota Formulas         | 3          | ⚠️ Básica                       |
| Quota Generation Rules | 3          | ⚠️ Básica                       |
| Others                 | ~27        | ⚠️ Básica                       |

### 4.6 Service Tests con BUENA calidad

| Archivo                                              | Calidad | Nota                         |
| ---------------------------------------------------- | ------- | ---------------------------- |
| `create-company-with-existing-admin.service.test.ts` | ✅      | 7 tests, verifica edge cases |
| `create-payment.service.test.ts`                     | ✅      | 8 tests, valida errores      |
| `verify-payment.service.test.ts`                     | ⚠️      | 4 tests, cubre lo básico     |

### 4.7 Services SIN Tests

| Servicio                                    | Criticidad |
| ------------------------------------------- | ---------- |
| Todos los servicios de amenities            | ALTA       |
| Todos los servicios de amenity-reservations | ALTA       |
| Todos los servicios de support-tickets      | ALTA       |
| Todos los servicios de subscriptions        | MEDIA      |
| Todos los servicios de reports              | MEDIA      |
| Auth services (register, register-google)   | ALTA       |
| Notification services (send, FCM)           | MEDIA      |
| User invitation services                    | ALTA       |
| GenerateQuotasForScheduleService            | CRÍTICA    |

---

## 5. Cobertura de Tests

### 5.1 Por Módulo

| Módulo                   | Servicios | Controller Tests | Service Tests | Total Coverage |
| ------------------------ | --------- | ---------------- | ------------- | -------------- |
| **Payments**             | 12        | ✅ (27 tests)    | ✅ (12 files) | ~65%           |
| **Quotas**               | 5         | ✅ (8 tests)     | ✅ (5 files)  | ~60%           |
| **Users**                | 3         | ✅ (8 tests)     | ✅ (3 files)  | ~55%           |
| **Buildings**            | 2         | ✅ (8 tests)     | ✅ (2 files)  | ~60%           |
| **Units**                | 2         | ✅ (8 tests)     | ✅ (2 files)  | ~60%           |
| **Condominiums**         | 2         | ✅ (13 tests)    | ❌            | ~40%           |
| **Management Companies** | 2         | ✅ (12 tests)    | ❌            | ~40%           |
| **Expenses**             | 5         | ✅ (8 tests)     | ✅ (5 files)  | ~50%           |
| **Amenities**            | 2         | ❌               | ❌            | **0%**         |
| **Amenity Reservations** | 4         | ❌               | ❌            | **0%**         |
| **Support Tickets**      | 5         | ❌               | ❌            | **0%**         |
| **Admin Invitations**    | 8         | ❌               | ✅ (1 file)   | ~15%           |
| **User Invitations**     | 5         | ❌               | ❌            | **0%**         |
| **Subscriptions**        | 4         | ❌               | ❌            | **0%**         |
| **Auth**                 | 2         | ❌               | ❌            | **0%**         |
| **Notifications**        | 7         | ❌               | ❌            | **0%**         |
| **Reports**              | 2         | ❌               | ❌            | **0%**         |
| **Middleware**           | 5         | N/A              | ✅ (2 files)  | ~40%           |

### 5.2 Cobertura por Tipo

| Tipo               | Existentes | Con Tests       | % Cobertura   |
| ------------------ | ---------- | --------------- | ------------- |
| Controllers        | 47         | 26              | **55%**       |
| Services           | ~100       | ~60             | **~60%**      |
| Middleware         | 5 auth     | 2               | **40%**       |
| Repositories       | 40+        | 0 (integration) | **0%** (unit) |
| Schemas/Validation | ~30 inline | 0               | **0%**        |
| Auth (role-based)  | N/A        | 1               | **~2%**       |
| Integration tests  | N/A        | 0               | **0%**        |

### 5.3 Cobertura Estimada Total: **~35-40%**

> **Lo más preocupante:** Cobertura de autorización/roles es ~2%. Solo 1 middleware test verifica access control real.

---

## 6. Auditoría de Schemas y Validaciones

### 6.1 Patrón de Validación

Los controllers definen schemas Zod inline. Cada controller tiene schemas para:

- `IdParamSchema` (común): `z.object({ id: z.string().uuid() })`
- Body schemas para create/update
- Query schemas para filtros

### 6.2 Problemas Encontrados

#### ❌ Sin validación de precisión decimal en montos financieros

```typescript
// Múltiples controllers - no validan precisión decimal
amount: z.string() // Solo string, no valida formato numérico
// O
amount: z.number().positive() // No valida 2 decimales max
```

**Riesgo:** Se pueden enviar montos como `1.123456789` que serán truncados por la BD.

#### ❌ Validación de fechas con regex en lugar de tipo Date

```typescript
effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // Acepta "9999-99-99"
```

**Riesgo:** Acepta fechas inválidas como "2026-13-45".

#### ❌ Sin validación cruzada entre campos

```typescript
// Ejemplo: effectiveFrom y effectiveTo no se validan entre sí
effectiveFrom: z.string().regex(dateRegex),
effectiveTo: z.string().regex(dateRegex).optional(),
// No verifica que effectiveTo > effectiveFrom
```

#### ⚠️ Schemas de update demasiado permisivos

```typescript
// Patrón común: todos los campos opcionales
const UpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  // No tiene .min(1) - permite objetos vacíos {}
})
```

**Riesgo:** Se puede hacer PATCH con `{}` (sin cambios reales).

#### ⚠️ Sin sanitización de strings

No se encontró sanitización XSS en inputs de texto. Los valores se almacenan tal cual.

### 6.3 Schemas por Módulo

| Módulo                 | Tiene Schema | Calidad | Problemas                                  |
| ---------------------- | ------------ | ------- | ------------------------------------------ |
| Quotas                 | Sí           | ⚠️      | Sin validación de monto, sin cross-field   |
| Payments               | Sí           | ⚠️      | Amount como string sin validación numérica |
| Expenses               | Sí           | ⚠️      | Sin validación de categoría válida         |
| Buildings              | Sí           | ✅      | Básico pero correcto                       |
| Units                  | Sí           | ✅      | Básico pero correcto                       |
| Quota Generation Rules | Sí           | ⚠️      | Fechas como regex                          |
| Amenities              | Sí           | ⚠️      | Nuevo, sin validación de horarios          |
| Amenity Reservations   | Sí           | ⚠️      | Sin validación de solapamiento             |

---

## 7. Auditoría de Servicios y Lógica de Negocio

### 7.1 Hallazgos Críticos

#### ❌ CRÍTICO: Sin scoping de condominio en queries de lectura

**Afecta:** TODOS los servicios de lectura

```typescript
// Ejemplo: GetPaymentsByUserService
async execute(input) {
  const payments = await this.repository.getByUserId(input.userId)
  return success(payments) // No verifica que el userId pertenezca al condominio del caller
}
```

**Impacto:** Un usuario puede consultar datos de CUALQUIER condominio si conoce los IDs.

#### ❌ CRÍTICO: Sin transacciones en operaciones multi-paso

**Afecta:**

- `CreateCompanyWithAdminService` — Crea user + company + invitation sin transacción
- `CreateCompanyWithExistingAdminService` — Crea company + member + subscription sin transacción
- `CreateUserWithInvitationService` — Crea user + role assignment sin transacción
- `GenerateQuotasForScheduleService` — Loop de creación sin transacción

**Impacto:** Si falla a mitad del proceso, quedan registros huérfanos en la BD.

#### ❌ CRÍTICO: Race condition en generación de cuotas

```typescript
// GenerateQuotasForScheduleService
for (const unit of units) {
  const existingQuotas = await this.quotasRepo.getByPeriod(year, month)
  const alreadyExists = existingQuotas.some(q => q.unitId === unit.id && ...)
  if (alreadyExists) continue
  // CREATE - dos ejecuciones simultáneas crean duplicados
}
```

**Impacto:** Cuotas duplicadas si el cron se ejecuta dos veces simultáneamente.

#### ❌ CRÍTICO: Refund no revierte aplicaciones de pago

```typescript
// RefundPaymentService
const payment = await this.repository.update(paymentId, {
  status: 'refunded',
  notes: refundReason,
})
// ❌ No revierte payment applications
// ❌ No ajusta saldos de cuotas
// ❌ No crea registro de auditoría
```

**Impacto:** Datos financieros inconsistentes tras un reembolso.

### 7.2 Hallazgos de Severidad Alta

#### ⚠️ Validación insuficiente de montos

```typescript
// CreatePaymentService
const amount = parseFloat(input.amount)
if (isNaN(amount) || amount <= 0) {
  return failure('Amount must be positive', 'BAD_REQUEST')
}
// ❌ No valida precisión decimal (2 decimales)
// ❌ No valida monto máximo
// ❌ No valida que la moneda exista y esté activa
```

#### ⚠️ Mensajes de error revelan información

```typescript
// CreateCompanyWithAdminService
if (!existingUser.isActive) {
  return failure('A pending user with this email already exists', 'CONFLICT')
}
return failure('A user with this email already exists', 'CONFLICT')
// Revela si el email existe y su estado
```

#### ⚠️ Sin máquina de estados para Payment status

Los servicios `VerifyPayment`, `RejectPayment`, `RefundPayment` implementan transiciones de estado de forma dispersa. No hay validador centralizado.

#### ⚠️ Sin auditoría de operaciones financieras

`CreatePaymentService`, `RefundPaymentService`, `AdjustQuotaService` no generan registros de auditoría automáticos.

### 7.3 Servicios por Módulo

| Módulo               | # Servicios | Transacciones           | Error Handling | Scoping    | Calidad |
| -------------------- | ----------- | ----------------------- | -------------- | ---------- | ------- |
| payments             | 12          | ❌ No                   | ✅ Bueno       | ❌ No      | ⚠️      |
| quotas               | 5           | ❌ No                   | ✅ Bueno       | ❌ No      | ⚠️      |
| admin-invitations    | 8           | ❌ No                   | ✅ Bueno       | N/A        | ⚠️      |
| user-invitations     | 5           | ❌ No (rollback manual) | ✅ Bueno       | ❌ No      | ⚠️      |
| support-tickets      | 5           | ❌ No                   | ✅ Bueno       | ⚠️ Parcial | ⚠️      |
| notifications        | 7           | ❌ No                   | ⚠️ Básico      | ❌ No      | ⚠️      |
| auth                 | 2           | ❌ No                   | ✅ Bueno       | N/A        | ✅      |
| expenses             | 5           | ❌ No                   | ✅ Bueno       | ❌ No      | ⚠️      |
| amenities            | 2           | ❌ No                   | ✅ Bueno       | ❌ No      | ⚠️      |
| amenity-reservations | 4           | ❌ No                   | ✅ Bueno       | ❌ No      | ⚠️      |
| quota-generation     | 3           | ❌ No                   | ⚠️             | ❌ No      | ❌      |
| quota-adjustments    | 5           | ❌ No                   | ✅ Bueno       | ❌ No      | ⚠️      |

### 7.4 Buenas Prácticas Encontradas

- ✅ Patrón `TServiceResult<T>` consistente en todos los servicios
- ✅ Separación de concerns (controllers → services → repositories)
- ✅ Soft delete con `isActive` flag
- ✅ `BaseRepository` con CRUD unificado
- ✅ Token comparison timing-safe en `AcceptSubscriptionService`
- ✅ Verificación de duplicados en `RegisterUserService`

---

## 8. Resumen Ejecutivo

### 8.1 Total de Problemas por Severidad

| Severidad      | Cantidad | Categoría Principal                  |
| -------------- | -------- | ------------------------------------ |
| 🔴 **CRÍTICO** | **8**    | Autorización, transacciones, scoping |
| 🟠 **ALTO**    | **12**   | Validaciones, estados, auditoría     |
| 🟡 **MEDIO**   | **15**   | Schemas, UI, tests                   |
| 🔵 **BAJO**    | **10**   | Documentación, naming, UI polish     |
| **TOTAL**      | **45**   |                                      |

### 8.2 Top 10 Problemas Más Urgentes

| #   | Problema                                                                                               | Severidad  | Impacto                              |
| --- | ------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------ |
| 1   | **~149 rutas API sin verificación de rol** — cualquier usuario autenticado accede a TODO               | 🔴 CRÍTICO | Seguridad total comprometida         |
| 2   | **SUPERADMIN accede a módulos de condominio** (Cuotas, Pagos, Gastos, Amenidades) en sidebar Y páginas | 🔴 CRÍTICO | Viola separación platform/condominio |
| 3   | **Sin scoping de condominio en queries** — usuario puede ver datos de otros condominios                | 🔴 CRÍTICO | Fuga de datos entre tenants          |
| 4   | **Sin transacciones** en operaciones multi-paso (crear company+admin, generar cuotas)                  | 🔴 CRÍTICO | Datos inconsistentes/huérfanos       |
| 5   | **Race condition en generación de cuotas** — cron concurrente genera duplicados                        | 🔴 CRÍTICO | Cuotas duplicadas                    |
| 6   | **Refund no revierte payment applications** — saldos inconsistentes                                    | 🔴 CRÍTICO | Inconsistencia financiera            |
| 7   | **0% tests de autorización** — ningún test verifica que roles sean rechazados                          | 🟠 ALTO    | Bugs de seguridad no detectados      |
| 8   | **21 controllers sin ningún test** (45% del total)                                                     | 🟠 ALTO    | Sin safety net                       |
| 9   | **Sidebar muestra todos los items** a todos los roles sin filtrar                                      | 🟡 MEDIO   | UX confusa                           |
| 10  | **Schemas no validan precisión decimal** ni fechas válidas                                             | 🟡 MEDIO   | Datos corruptos                      |

### 8.3 Análisis de Riesgo

```
RIESGO DE SEGURIDAD:    ████████████████████ CRÍTICO
RIESGO DE DATOS:        ████████████████░░░░ ALTO
RIESGO DE UX:           ████████░░░░░░░░░░░░ MEDIO
COBERTURA DE TESTS:     ████████░░░░░░░░░░░░ 35-40%
```

### 8.4 Estado Actual vs Deseado

| Aspecto                   | Estado Actual                 | Estado Deseado                                             |
| ------------------------- | ----------------------------- | ---------------------------------------------------------- |
| Autenticación             | ✅ Funcional (Firebase + JWT) | ✅ Mantener                                                |
| Autorización (roles)      | ❌ No existe (solo auth)      | Middleware por rol en cada ruta                            |
| Scoping (multi-tenant)    | ❌ No existe                  | Scoping automático por condominio                          |
| Separación platform/condo | ❌ Mezclados                  | Rutas separadas: `/api/platform/*` vs `/api/condominium/*` |
| Sidebar por rol           | ❌ Todo visible               | Filtrado dinámico por rol                                  |
| Tests de seguridad        | ❌ ~2%                        | >80% de rutas con test de auth                             |
| Transacciones             | ❌ No se usan                 | Todas las operaciones multi-paso                           |
| Validaciones              | ⚠️ Básicas                    | Estrictas con business rules                               |

---

_Fin del Audit Report — Continúa en ACTION_PLAN.md_
