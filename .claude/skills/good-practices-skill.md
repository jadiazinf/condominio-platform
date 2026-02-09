---
name: code-quality
description: "Aplica esta skill a TODO el código que generes o modifiques en este proyecto. Define los estándares obligatorios de calidad: Clean Code, principios SOLID, arquitectura hexagonal, patrones de diseño. Usa esta skill como referencia constante antes y durante cualquier tarea de codificación, refactorización o revisión."
---

# Estándares de Calidad de Código

Esta skill define las reglas de calidad que TODO el código generado o modificado debe cumplir. No es opcional — es la línea base de calidad del proyecto.

---

## 1. Clean Code

### Nombrado

- **Nombres descriptivos e intencionados.** El nombre debe revelar el propósito sin necesidad de comentarios.
  - ✅ `getOverdueQuotasByCondominium(condominiumId)`
  - ❌ `getData(id)`, `process()`, `handle()`, `doStuff()`
- **Verbos para funciones, sustantivos para clases/interfaces.**
  - ✅ `calculateInterest()`, `QuotaGenerationService`, `PaymentsRepository`
  - ❌ `interestCalc()`, `DoPayment`, `repoQuotas`
- **Booleanos con prefijo semántico:** `is`, `has`, `can`, `should`, `was`
  - ✅ `isActive`, `hasPermission`, `canRefund`, `shouldGenerateQuota`
  - ❌ `active`, `permission`, `refund`
- **Sin abreviaciones ambiguas.** `condominium` no `condo`, `transaction` no `tx` (excepto en parámetros de scope corto como callbacks de transacciones DB donde `tx` es convención universal).
- **Constantes en SCREAMING_SNAKE_CASE.** `MAX_RETRY_ATTEMPTS`, `DEFAULT_CURRENCY_ID`
- **Consistencia con el idioma del proyecto.** Todo el código (nombres, comentarios de lógica) en inglés. Comentarios de contexto de negocio pueden ser en español si el dominio lo requiere.

### Funciones

- **Una función = una responsabilidad.** Si necesitás usar "y" para describir lo que hace, dividila.
- **Máximo 3 parámetros.** Si necesitás más, usa un objeto de input.
  - ✅ `execute(input: ICreatePaymentInput)`
  - ❌ `execute(userId, unitId, amount, currencyId, method, date)`
- **Máximo ~30 líneas por función.** Si es más larga, extraé subfunciones con nombres descriptivos.
- **Sin side effects ocultos.** Si la función modifica estado externo, el nombre debe indicarlo (`updateQuotaBalance`, no `getQuotaBalance` si además lo modifica).
- **Retorno temprano (early return).** Manejar errores y casos borde al inicio, no anidar en else.
  ```typescript
  // ✅
  if (!payment) return failure('Payment not found', 'NOT_FOUND')
  if (payment.status !== 'completed') return failure('Cannot refund', 'BAD_REQUEST')
  // lógica principal...

  // ❌
  if (payment) {
    if (payment.status === 'completed') {
      // lógica principal profundamente anidada...
    } else {
      return failure(...)
    }
  } else {
    return failure(...)
  }
  ```
- **Sin funciones que mezclen niveles de abstracción.** Una función de alto nivel no debe contener SQL inline junto con lógica de negocio.

### Archivos y estructura

- **Un concepto principal por archivo.** Un servicio, un controller, un repository.
- **Imports organizados:** externos → internos (packages/domain) → relativos del proyecto. Separados por línea en blanco.
- **Sin código muerto.** No dejar funciones, imports, o variables sin usar. No comentar código "por si acaso".
- **Sin números mágicos.** Extraer a constantes con nombre.
  ```typescript
  // ✅
  const MAX_INVITATION_EXPIRY_DAYS = 7
  const expiresAt = calculateExpirationDate(MAX_INVITATION_EXPIRY_DAYS)

  // ❌
  const expiresAt = calculateExpirationDate(7)
  ```

### Comentarios

- **El código debe ser autoexplicativo.** No comentar QUÉ hace, solo POR QUÉ cuando no es obvio.
  ```typescript
  // ✅ — Explica una decisión de negocio no obvia
  // Gateway payments start as 'pending' for automatic processing
  // Manual methods require admin verification first
  const status = method === 'gateway' ? 'pending' : 'pending_verification'

  // ❌ — Repite lo que el código ya dice
  // Check if payment exists
  const payment = await this.repository.getById(id)
  ```
- **JSDoc en interfaces públicas** (inputs/outputs de servicios, interfaces de repos). No en métodos internos triviales.
- **TODO con contexto.** `// TODO(auth): Add rate limiting per user` no solo `// TODO: fix`

---

## 2. Principios SOLID

### S — Single Responsibility

Cada clase/módulo tiene UNA razón para cambiar.

- Un servicio hace UNA operación de negocio: `RefundPaymentService`, `VerifyPaymentService`, `CreatePaymentService` — NO `PaymentService` con 15 métodos.
- Un controller orquesta la request HTTP (validación → servicio → respuesta). NO contiene lógica de negocio.
- Un repository hace queries de datos. NO contiene lógica de negocio ni validaciones.

```
CORRECTO:
  Controller → recibe request, llama servicio, formatea response
  Service → ejecuta lógica de negocio, coordina repos
  Repository → accede a BD

INCORRECTO:
  Controller → valida permisos + calcula montos + consulta BD + envía email
```

### O — Open/Closed

Extender comportamiento sin modificar código existente.

- Usar composición sobre herencia. Los servicios reciben repos por constructor, no los instancian internamente.
- El sistema de roles usa datos (tabla `roles`) no código hardcodeado. Agregar un nuevo rol no requiere cambiar el middleware.
- Nuevos servicios se crean como clases nuevas, no como métodos adicionales en clases existentes.

### L — Liskov Substitution

Las subclases deben ser intercambiables con sus bases.

- `BaseRepository` define el contrato (`listAll`, `getById`, `create`, `update`, `delete`). Cualquier repo hijo debe cumplir ese contrato sin sorpresas.
- `withTx()` retorna `this` (el mismo tipo) — el repo transaccional es intercambiable con el normal.

### I — Interface Segregation

Interfaces específicas, no monolíticas.

- `IRepository<TEntity, TCreateDto, TUpdateDto>` para CRUD completo
- `IReadOnlyRepository<TEntity, TCreateDto>` para audit logs (sin update/delete)
- `IRepositoryWithHardDelete` para tablas sin soft delete
- Servicios implementan `IService<TInput, TOutput>` con input/output tipados específicamente

NO crear una interfaz gigante que todas las clases deban implementar.

### D — Dependency Inversion

Los módulos de alto nivel no dependen de módulos de bajo nivel. Ambos dependen de abstracciones.

- Los servicios reciben repos por **inyección de constructor**, no por instanciación directa.
  ```typescript
  // ✅
  class RefundPaymentService {
    constructor(
      private readonly paymentsRepo: PaymentsRepository,
      private readonly applicationsRepo: PaymentApplicationsRepository,
      private readonly db: TDrizzleClient
    ) {}
  }

  // ❌
  class RefundPaymentService {
    private readonly paymentsRepo = new PaymentsRepository(DatabaseService.getInstance().getDb())
  }
  ```
- Los controllers reciben servicios por constructor, los endpoints los ensamblan.
- EXCEPCIÓN aceptada: `DatabaseService.getInstance()` se usa en middlewares (singleton pattern). No refactorizar esto.

---

## 3. Arquitectura Hexagonal

### Capas del proyecto

```
                    ┌─────────────────────────┐
                    │   Adapters (entrada)     │
                    │   • Controllers (HTTP)   │
                    │   • Cron jobs            │
                    │   • WebSocket handlers   │
                    └──────────┬──────────────┘
                               │ llama a
                    ┌──────────▼──────────────┐
                    │   Application Layer      │
                    │   • Services             │
                    │   • Use cases            │
                    │   • Orquestación         │
                    └──────────┬──────────────┘
                               │ usa
                    ┌──────────▼──────────────┐
                    │   Domain                 │
                    │   • Entities/Types       │
                    │   • Schemas (Zod)        │
                    │   • Business rules       │
                    │   • Value objects         │
                    └──────────┬──────────────┘
                               │ implementa
                    ┌──────────▼──────────────┐
                    │   Adapters (salida)       │
                    │   • Repositories (DB)     │
                    │   • Email service         │
                    │   • Firebase adapter      │
                    │   • External APIs         │
                    └─────────────────────────┘
```

### Reglas de dependencia

- Las capas internas NO conocen las externas. Domain no importa de controllers. Services no importan de Hono.
- **Controllers** pueden importar de: Services, Domain (types/schemas), Middlewares
- **Services** pueden importar de: Repositories (interfaces), Domain, otros Services
- **Repositories** pueden importar de: Domain (types/schemas), Database (Drizzle schema)
- **Domain** (packages/domain) NO importa de ninguna capa del backend

### En la práctica para este proyecto

```typescript
// ✅ — Controller importa servicio y tipos
import { RefundPaymentService } from '@src/services/payments'
import type { TPayment } from '@packages/domain'

// ✅ — Servicio importa repository (por tipo, no implementación)
import type { PaymentsRepository } from '@database/repositories'

// ❌ — Servicio importa de Hono (acoplamiento al framework HTTP)
import type { Context } from 'hono'

// ❌ — Repository contiene lógica de negocio
class PaymentsRepository {
  async refundPayment(id: string) {
    // NO — esto es lógica de negocio, va en el servicio
  }
}

// ❌ — Controller contiene lógica de negocio
class PaymentsController {
  private verifyPayment = async (c: Context) => {
    const payment = await this.repo.getById(id)
    if (payment.amount > 1000) { /* ... */ }  // NO — lógica de negocio en controller
  }
}
```

---

## 4. Patrones del Proyecto

### Service Pattern (un servicio = un caso de uso)

```typescript
export interface IRefundPaymentInput {
  paymentId: string
  refundReason: string
  refundedByUserId: string
}

export interface IRefundPaymentOutput {
  payment: TPayment
  message: string
}

export class RefundPaymentService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly applicationsRepo: PaymentApplicationsRepository,
    private readonly quotasRepo: QuotasRepository,
    private readonly auditRepo: AuditLogsRepository,
    private readonly db: TDrizzleClient
  ) {}

  async execute(input: IRefundPaymentInput): Promise<TServiceResult<IRefundPaymentOutput>> {
    // ... lógica
  }
}
```

- Input/Output siempre tipados con interfaces `I[Action]Input` / `I[Action]Output`
- Retorna `TServiceResult<T>` (success/failure) — NUNCA throw para errores de negocio
- Throw solo para errores de infraestructura (DB down, etc.)
- El controller mapea `TServiceResult` a HTTP status codes

### Repository Pattern

```typescript
// Los repos extienden BaseRepository para CRUD estándar
// Métodos custom para queries específicas del dominio
export class QuotasRepository extends BaseRepository<TQuota, TQuotaCreate, TQuotaUpdate> {
  // Métodos custom del dominio
  async listByCondominium(condominiumId: string): Promise<TQuota[]> { ... }
  async getOverdue(today: string): Promise<TQuota[]> { ... }
  async adjustBalance(quotaId: string, amount: number): Promise<TQuota | null> { ... }
}
```

- `withTx(tx)` para participar en transacciones
- Queries complejas en métodos del repo, NO en servicios (el servicio no debe conocer SQL/Drizzle)
- Nombres de métodos reflejan el dominio: `getOverdue`, `listByCondominium`, NO `findWithCondition`

### Transaction Pattern

```typescript
// El servicio orquesta la transacción
async execute(input): Promise<TServiceResult<TOutput>> {
  return await this.db.transaction(async (tx) => {
    const payment = await this.paymentsRepo.withTx(tx).getById(input.paymentId)
    // validaciones...

    const applications = await this.applicationsRepo.withTx(tx).getByPaymentId(payment.id)
    for (const app of applications) {
      await this.quotasRepo.withTx(tx).adjustBalance(app.quotaId, -app.amount)
      await this.applicationsRepo.withTx(tx).update(app.id, { status: 'reversed' })
    }

    await this.paymentsRepo.withTx(tx).update(payment.id, { status: 'refunded' })
    return success({ payment, message: 'Refunded' })
  })
}
```

- TODOS los repos dentro del callback usan `.withTx(tx)`
- NUNCA mezclar repos con tx y repos sin tx en la misma operación
- Si algún paso falla, todo se revierte automáticamente

### Middleware Chain Pattern

```typescript
get routes(): TRouteDefinition[] {
  return [
    {
      method: 'post',
      path: '/:id/verify',
      handler: this.verifyPayment,
      middlewares: [
        authMiddleware,                              // 1. Autenticación
        requireRole('ADMIN', 'ACCOUNTANT'),          // 2. Autorización
        paramsValidator(IdParamSchema),               // 3. Validación de params
        bodyValidator(VerificationBodySchema),         // 4. Validación de body
      ],
    },
  ]
}
```

Orden siempre: Auth → Authorization → Validation → Handler

### Error Handling Pattern

- **Errores de negocio:** Usar `TServiceResult` con `failure()`. El controller los mapea a HTTP.
- **Errores de infraestructura:** Throw `AppError` que el global error handler middleware captura.
- **NUNCA** catch genérico que traga errores silenciosamente.
  ```typescript
  // ❌
  try { ... } catch (e) { return null }

  // ✅
  try { ... } catch (error) {
    if (error instanceof AppError) throw error
    throw AppError.internal('Unexpected error during payment refund', error)
  }
  ```

---

## 5. TypeScript Estricto

- **NO usar `any`.** Usa `unknown` si el tipo es desconocido, luego narrowing.
- **NO usar `!` (non-null assertion)** excepto en tests o cuando TypeScript no puede inferir un null check previo.
- **Interfaces para contratos públicos, types para uniones/utilidades.**
  ```typescript
  // Interface para contratos
  interface ICreatePaymentInput { ... }

  // Type para uniones
  type TPaymentStatus = 'pending' | 'completed' | 'refunded'

  // Type para derivados
  type TPaymentWithUnit = TPayment & { unit: TUnit }
  ```
- **Readonly por defecto.** Params de constructor con `private readonly`.
- **Discriminated unions** para resultados:
  ```typescript
  type TServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code: TErrorCode }
  ```
- **Generics con constraints** cuando sea necesario, no genéricos abiertos.
- **Zod para validación runtime**, TypeScript para validación compile-time. Ambos.

---

## 6. Checklist de Calidad (verificar ANTES de commitear)

Antes de dar por terminada cualquier tarea de código, verifica:

- [ ] **Nombrado:** ¿Se entiende el propósito de cada función/variable sin leer el cuerpo?
- [ ] **SRP:** ¿Cada clase tiene una sola razón para cambiar?
- [ ] **DI:** ¿Las dependencias se inyectan por constructor, no se instancian internamente?
- [ ] **Capas:** ¿Los controllers NO contienen lógica de negocio? ¿Los repos NO contienen lógica de negocio?
- [ ] **Transacciones:** ¿Las operaciones multi-write usan transacciones?
- [ ] **Tipos:** ¿Cero `any`? ¿Input/Output tipados?
- [ ] **Early return:** ¿Los errores se manejan al inicio, sin anidación profunda?
- [ ] **Código muerto:** ¿No hay imports, variables, o funciones sin usar?
- [ ] **Números mágicos:** ¿Todos extraídos a constantes con nombre?
- [ ] **Error handling:** ¿Errores de negocio usan TServiceResult? ¿Errores de infra usan throw?
- [ ] **Tests:** ¿El código nuevo tiene tests que verifican tanto el happy path como los casos de error?
