# Flujo de Pagos — Documentación Técnica

## Índice

1. [Resumen General](#resumen-general)
2. [Estados de un Pago](#estados-de-un-pago)
3. [Métodos de Pago](#métodos-de-pago)
4. [Flujos Principales](#flujos-principales)
   - [Reporte de Pago Externo (Tenant)](#1-reporte-de-pago-externo-tenant)
   - [Pago vía Gateway Integrado](#2-pago-vía-gateway-integrado)
   - [Verificación Manual (Admin)](#3-verificación-manual-admin)
   - [Rechazo de Pago (Admin)](#4-rechazo-de-pago-admin)
   - [Reembolso de Pago (Admin)](#5-reembolso-de-pago-admin)
   - [Aplicación de Pago a Cuota](#6-aplicación-de-pago-a-cuota)
5. [Diagrama de Estados](#diagrama-de-estados)
6. [Modelo de Datos](#modelo-de-datos)
7. [Pasarelas de Pago (Gateway Adapters)](#pasarelas-de-pago)
8. [Control de Acceso por Rol](#control-de-acceso-por-rol)
9. [Notificaciones](#notificaciones)

---

## Resumen General

El sistema de pagos soporta dos modelos de operación:

- **Manual**: El residente reporta un pago externo (transferencia, efectivo, pago móvil) → un administrador lo verifica o rechaza manualmente.
- **Automático**: El sistema se integra con una pasarela de pago (banco, Stripe) → el pago se verifica automáticamente sin intervención del admin.

Ambos modelos coexisten. Un condominio puede tener una pasarela bancaria configurada (verificación automática) y al mismo tiempo recibir pagos en efectivo (verificación manual).

---

## Estados de un Pago

| Estado | Descripción |
|--------|-------------|
| `pending` | Pago iniciado vía gateway. Esperando confirmación automática del gateway externo. |
| `pending_verification` | Pago reportado manualmente. Esperando que un admin lo verifique. |
| `completed` | Pago verificado y aprobado (manual o automáticamente). |
| `failed` | El procesamiento automático del gateway falló. |
| `rejected` | Un admin rechazó el pago reportado. |
| `refunded` | Pago reembolsado. Todas las aplicaciones a cuotas fueron revertidas. |

### Transiciones Válidas

```
pending               → failed       (gateway reporta fallo)
pending_verification  → completed    (admin verifica / auto-verificación bancaria)
pending_verification  → rejected     (admin rechaza)
completed             → refunded     (admin reembolsa)
```

> **Importante**: No se puede pasar de `pending` a `completed` directamente desde el servicio de verificación manual. Un pago en `pending` solo puede fallar (`failed`) o ser completado vía webhook/auto-verificación.

---

## Métodos de Pago

| Método | Tipo | Estado Inicial | Verificación |
|--------|------|----------------|-------------|
| `transfer` | Manual | `pending_verification` | Admin o auto-verificación bancaria |
| `cash` | Manual | `pending_verification` | Admin |
| `card` | Manual | `pending_verification` | Admin |
| `mobile_payment` | Manual | `pending_verification` | Admin o auto-verificación bancaria |
| `gateway` | Automático | `pending` | Webhook del gateway |
| `other` | Manual | `pending_verification` | Admin |

---

## Flujos Principales

### 1. Reporte de Pago Externo (Tenant)

**Endpoint**: `POST /condominium/payments/report`
**Servicio**: `ReportPaymentService`
**Quién lo usa**: El residente que hizo un pago fuera del sistema (transferencia, pago móvil, etc.)

```
┌─────────────────────────────────────────────────────────────┐
│  Residente hace transferencia bancaria                      │
│  (fuera del sistema, en su banco)                           │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /condominium/payments/report                          │
│  Body: { paymentData, externalReference?, condominiumId? }  │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Crear pago con status = 'pending_verification'          │
│     - Se fuerza este status independientemente del input     │
│     - Se asigna registeredBy = userId del que reporta       │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
              ┌────────────────┐
              │ ¿Hay gateway   │
              │ bancario       │  NO ──→ Queda en 'pending_verification'
              │ configurado    │         (el admin lo revisa manualmente)
              │ para este      │
              │ condominio?    │
              └───────┬────────┘
                      │ SÍ
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Llamar adapter.verifyPayment() SINCRÓNICAMENTE          │
│     - Se envía el externalReference (nro. de referencia)    │
│     - El adapter consulta la API del banco en tiempo real   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
              ┌────────────────┐
              │ ¿El banco      │
              │ encontró la    │  NO ──→ Queda en 'pending_verification'
              │ referencia?    │         (el admin lo revisa manualmente)
              └───────┬────────┘
                      │ SÍ
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Auto-verificar el pago                                  │
│     - Status → 'completed'                                  │
│     - verifiedBy = SYSTEM_USER_ID (00000000-...)            │
│     - verificationNotes = "Auto-verified via bank gateway"  │
│     - SIN intervención del administrador                    │
└─────────────────────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Crear registro en gateway_transactions (auditoría)      │
│     - Se guarda request/response del banco                  │
│     - Se guarda si fue encontrado o no                      │
│     - Queda como evidencia para cualquier disputa           │
└─────────────────────────────────────────────────────────────┘
```

**Resultado**: `{ payment, autoVerified: boolean }`

> **Clave**: La verificación es **síncrona**. No hay workers, no hay cron, no hay polling. Se llama a la API del banco en el momento exacto en que el residente reporta el pago.

---

### 2. Pago vía Gateway Integrado

**Endpoint**: `POST /condominium/payments`
**Servicio**: `CreatePaymentService`
**Quién lo usa**: Admin/Contador crea el pago con `paymentMethod = 'gateway'`

```
┌─────────────────────────────────────────────────────────────┐
│  Admin crea pago con método 'gateway'                       │
│  POST /condominium/payments                                 │
│  Body: { paymentMethod: 'gateway', paymentGatewayId, ... }  │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Validaciones                                            │
│     - Usuario existe                                        │
│     - Unidad existe                                         │
│     - Moneda existe y está activa                           │
│     - Monto es positivo                                     │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Crear pago con status = 'pending'                       │
│     (los pagos por gateway empiezan como 'pending',         │
│      no 'pending_verification')                             │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Llamar adapter.initiatePayment()                        │
│     - El adapter crea la sesión en el gateway externo       │
│     - Ej: Stripe crea un Checkout Session                   │
│     - Retorna redirectUrl + externalTransactionId           │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Crear gateway_transaction (auditoría)                   │
│     - Guarda request/response del gateway                   │
│     - Status = 'initiated'                                  │
│     - maxAttempts = 10                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Retornar al cliente                                     │
│     - { payment, redirectUrl, gatewayTransactionId }        │
│     - El frontend redirige al usuario al checkout           │
└─────────────────────────────────────────────────────────────┘
                       ▼
             (El usuario paga en el gateway externo)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Gateway envía webhook                                   │
│     POST /api/webhooks/:gatewayType                         │
│     - El adapter valida la firma del webhook                │
│     - Extrae paymentId y status                             │
│     - Actualiza gateway_transaction (auditoría)             │
│     - Si status = 'completed':                              │
│       → Auto-verifica el pago (status → completed)          │
│       → Notifica al residente (push + in_app)               │
│     - Si status = 'failed':                                 │
│       → Marca gateway_tx como failed                        │
│       → Notifica al residente del fallo (prioridad alta)    │
└─────────────────────────────────────────────────────────────┘
```

> **Nota**: Si la iniciación del gateway falla, el pago se crea de todas formas. El error no es bloqueante.

---

### 3. Verificación Manual (Admin)

**Endpoint**: `POST /condominium/payments/:id/verify`
**Servicio**: `VerifyPaymentService`
**Roles**: Admin, Contador

```
┌─────────────────────────────────────────────────────────────┐
│  Admin revisa comprobante del pago                          │
│  POST /:id/verify                                           │
│  Body: { verifiedByUserId, verificationNotes? }             │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Validaciones:                                              │
│  - Pago existe                                              │
│  - Status actual = 'pending_verification'                   │
│    (si no, retorna error 400)                               │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Transición:                                                │
│  - Status: pending_verification → completed                 │
│  - verifiedBy = ID del admin que verificó                   │
│  - verifiedAt = timestamp actual                            │
│  - verificationNotes = notas opcionales                     │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Notificación al residente:                                 │
│  - Tipo: in_app + push                                      │
│  - Título: "Payment Verified"                               │
│  - Fire-and-forget (no bloquea la respuesta)                │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Rechazo de Pago (Admin)

**Endpoint**: `POST /condominium/payments/:id/reject`
**Servicio**: `RejectPaymentService`
**Roles**: Admin, Contador

```
┌─────────────────────────────────────────────────────────────┐
│  Admin determina que el pago no es válido                   │
│  POST /:id/reject                                           │
│  Body: { verifiedByUserId, rejectionNotes? }                │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Validaciones:                                              │
│  - Pago existe                                              │
│  - Status actual = 'pending_verification'                   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Transición:                                                │
│  - Status: pending_verification → rejected                  │
│  - verifiedBy = ID del admin (quién rechazó)                │
│  - verifiedAt = timestamp actual                            │
│  - verificationNotes = razón del rechazo                    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Notificación al residente:                                 │
│  - Tipo: in_app + push                                      │
│  - Título: "Payment Rejected"                               │
│  - Incluye razón del rechazo                                │
│  - Prioridad: alta                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Reembolso de Pago (Admin)

**Endpoint**: `POST /condominium/payments/:id/refund`
**Servicio**: `RefundPaymentService`
**Roles**: Admin, Contador

Este es el flujo más complejo porque revierte todas las aplicaciones a cuotas.

```
┌─────────────────────────────────────────────────────────────┐
│  Admin solicita reembolso                                   │
│  POST /:id/refund                                           │
│  Body: { refundedByUserId, refundReason }                   │
│  (refundReason es obligatorio)                              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Validaciones:                                              │
│  - Pago existe                                              │
│  - Status actual = 'completed'                              │
│  - refundReason no está vacío                               │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Reversión transaccional (todo en una transacción DB):      │
│                                                             │
│  Para cada payment_application del pago:                    │
│    1. Restaurar paidAmount de la cuota                      │
│       (restar el monto que se había aplicado)               │
│    2. Recalcular balance de la cuota                        │
│    3. Si balance > 0: status de cuota → 'pending'           │
│    4. Eliminar el registro payment_application              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Transición del pago:                                       │
│  - Status: completed → refunded                             │
│  - Notes: se agrega razón, admin ID y timestamp             │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Notificación al residente:                                 │
│  - Tipo: in_app + push                                      │
│  - Título: "Payment Refunded"                               │
│  - Incluye cantidad de cuotas revertidas                    │
│  - Prioridad: alta                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Aplicación de Pago a Cuota

**Endpoint**: `POST /condominium/payment-applications`
**Servicio**: `ApplyPaymentToQuotaService`
**Roles**: Admin, Contador

Este flujo conecta un pago completado con una cuota pendiente. Incluye lógica inteligente de intereses.

```
┌─────────────────────────────────────────────────────────────┐
│  Admin aplica pago a cuota                                  │
│  POST /condominium/payment-applications                     │
│  Body: { paymentId, quotaId, appliedAmount }                │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Validaciones:                                              │
│  - Pago en status 'completed'                               │
│  - Cuota NO en status 'paid' ni 'cancelled'                 │
│  - Monto aplicado > 0                                       │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Recálculo inteligente de intereses:                        │
│                                                             │
│  SI paymentDate <= dueDate (pago a tiempo):                 │
│    → Reversar TODOS los intereses                           │
│    → interestAmount = 0                                     │
│                                                             │
│  SI paymentDate > dueDate (pago tarde):                     │
│    → Recalcular interés solo hasta fecha de pago            │
│    → Si el nuevo interés < actual: reversar la diferencia   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  División del pago (Payment Splitting):                     │
│                                                             │
│  1. Primero se aplica a intereses                           │
│     (hasta cubrir el interés pendiente)                     │
│  2. El resto se aplica al principal                         │
│                                                             │
│  Se registra:                                               │
│    - appliedToInterest = monto aplicado a intereses         │
│    - appliedToPrincipal = monto aplicado al principal       │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Actualización de la cuota:                                 │
│  - paidAmount += appliedAmount                              │
│  - balance = baseAmount + interestAmount - paidAmount       │
│  - Si balance <= 0: status → 'paid'                         │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Auditoría:                                                 │
│  - Crear quota_adjustment si los intereses cambiaron        │
│  - Razón: "Interest reversal/recalculation"                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Diagrama de Estados

```
                    ┌──────────────────┐
                    │     CREACIÓN     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     método='gateway'    método manual   reporte externo
              │              │         con auto-verificación
              ▼              ▼              │
        ┌──────────┐  ┌─────────────────┐  │
        │ pending  │  │ pending_        │  │
        │          │  │ verification    │  │
        └────┬─────┘  └───┬────────┬───┘  │
             │             │        │      │
        webhook/       verify()  reject() │
        mark-failed        │        │      │
             │             │        │      │
      ┌──────┴──────┐     │        │      │
      │             │      │        │      │
      ▼             ▼      ▼        ▼      │
  ┌────────┐  ┌──────────┐    ┌──────────┐ │
  │ failed │  │completed │◄───────────────┘
  │        │  │          │    │ rejected │
  └────────┘  └────┬─────┘    └──────────┘
                   │
              refund()
                   │
                   ▼
             ┌──────────┐
             │ refunded │
             └──────────┘
```

---

## Modelo de Datos

### Relaciones entre entidades

```
PaymentConcept (qué se cobra)
       │
       │ genera
       ▼
     Quota (cuota específica por unidad/período)
       │                          │
       │ se aplica vía            │ tiene
       ▼                          ▼
PaymentApplication ◄──────── Payment (pago del residente)
                                  │
                                  │ tiene (si usó gateway)
                                  ▼
                          GatewayTransaction (auditoría del gateway)
                                  │
                                  │ procesado por
                                  ▼
                          PaymentGateway (configuración del gateway)
                                  │
                                  │ asignado a entidad vía
                                  ▼
                          EntityPaymentGateway (gateway por condominio)
```

### Tabla `payments`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `paymentNumber` | VARCHAR | Número de pago (auto-generado) |
| `userId` | UUID FK → users | Residente que paga |
| `unitId` | UUID FK → units | Unidad asociada |
| `amount` | DECIMAL | Monto reportado |
| `currencyId` | UUID FK → currencies | Moneda |
| `paidAmount` | DECIMAL | Monto efectivamente pagado (puede diferir) |
| `paidCurrencyId` | UUID FK → currencies | Moneda en que se pagó |
| `exchangeRate` | DECIMAL | Tasa de cambio aplicada |
| `paymentMethod` | ENUM | transfer, cash, card, mobile_payment, gateway, other |
| `paymentGatewayId` | UUID FK → payment_gateways | Gateway usado (si aplica) |
| `paymentDetails` | JSONB | Datos adicionales del pago |
| `paymentDate` | DATE | Fecha del pago |
| `status` | ENUM | pending, pending_verification, completed, failed, refunded, rejected |
| `receiptUrl` | TEXT | URL del comprobante |
| `receiptNumber` | VARCHAR | Número de recibo |
| `notes` | TEXT | Notas del pago |
| `registeredBy` | UUID FK → users | Quién lo registró |
| `verifiedBy` | UUID FK → users | Quién lo verificó/rechazó |
| `verifiedAt` | TIMESTAMP | Cuándo se verificó |
| `verificationNotes` | TEXT | Notas de verificación/rechazo |

### Tabla `gateway_transactions`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `paymentId` | UUID FK → payments | Pago asociado |
| `gatewayType` | ENUM | stripe, banco_plaza, paypal, zelle, other |
| `externalTransactionId` | VARCHAR(255) | ID de transacción del gateway |
| `externalReference` | VARCHAR(255) | Referencia bancaria, session ID de Stripe |
| `requestPayload` | JSONB | Lo que se envió al gateway |
| `responsePayload` | JSONB | Lo que respondió el gateway |
| `status` | VARCHAR(50) | initiated, processing, completed, failed |
| `attempts` | INTEGER | Contador de intentos |
| `maxAttempts` | INTEGER | Máximo de intentos (default 10) |
| `lastAttemptAt` | TIMESTAMP | Último intento |
| `verifiedAt` | TIMESTAMP | Cuándo se verificó exitosamente |
| `errorMessage` | TEXT | Mensaje de error si falló |

---

## Pasarelas de Pago

### Arquitectura (Strategy Pattern)

```
PaymentGatewayManager
├── register(adapter)     → Registra un adapter en el mapa
├── getAdapter(type)      → Resuelve el adapter para un tipo de gateway
└── hasAdapter(type)      → Verifica si existe adapter para ese tipo

IPaymentGatewayAdapter (interfaz)
├── initiatePayment()     → Iniciar pago (crear sesión de checkout, etc.)
├── verifyPayment()       → Verificar referencia contra API del banco
├── getTransactionStatus()→ Consultar estado de transacción existente
├── processWebhook()      → Procesar webhook entrante
└── refund()              → Solicitar reembolso por el gateway
```

### Adapters Implementados

| Adapter | Gateway Types | Comportamiento |
|---------|--------------|----------------|
| `ManualPaymentAdapter` | `other`, `zelle`, `paypal` | No-op. No hay API externa. `verifyPayment()` retorna `{ found: false }`. |
| `BankPaymentAdapter` | `banco_plaza` | **Stub**. Simula respuestas. Listo para conectar con API bancaria real. |
| `StripePaymentAdapter` | `stripe` | **Stub**. Retorna URLs de checkout mock. Listo para integrar Stripe SDK. |

### Agregar un nuevo gateway

1. Crear adapter que implemente `IPaymentGatewayAdapter`
2. Registrarlo en el constructor de `PaymentGatewayManager`
3. No se necesita cambiar nada más

### Configuración por condominio

Cada condominio puede tener gateways distintos configurados:

- `payment_gateways` → Define el gateway y su configuración (JSONB con API keys, URLs, etc.)
- `entity_payment_gateways` → Asocia un gateway a un condominio/edificio específico

---

## Control de Acceso por Rol

| Operación | Endpoint | Roles Permitidos |
|-----------|----------|-----------------|
| Reportar pago | `POST /report` | Cualquier usuario autenticado |
| Crear pago | `POST /` | Admin, Contador |
| Verificar pago | `POST /:id/verify` | Admin, Contador |
| Rechazar pago | `POST /:id/reject` | Admin, Contador |
| Reembolsar pago | `POST /:id/refund` | Admin, Contador |
| Eliminar pago | `DELETE /:id` | Admin |
| Ver pagos | `GET /` y variantes | Admin, Contador |
| Ver pagos de mi unidad | `GET /unit/:unitId/paginated` | Usuario, Soporte, Contador, Admin |
| Aplicar pago a cuota | `POST /payment-applications` | Admin, Contador |

---

## Notificaciones

| Evento | Canal | Prioridad | Destinatario |
|--------|-------|-----------|-------------|
| Pago verificado (manual) | in_app + push | Normal | Residente que pagó |
| Pago verificado (webhook) | in_app + push | Normal | Residente que pagó |
| Pago rechazado | in_app + push | Alta | Residente que pagó |
| Pago fallido (webhook) | in_app + push | Alta | Residente que pagó |
| Pago reembolsado | in_app + push | Alta | Residente que pagó |

Todas las notificaciones son fire-and-forget (no bloquean la respuesta HTTP).

---

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/services/payments/create-payment.service.ts` | Creación de pagos + inicio de gateway |
| `apps/api/src/services/payments/report-payment.service.ts` | Reporte externo + auto-verificación sincrónica |
| `apps/api/src/services/payments/verify-payment.service.ts` | Verificación manual por admin |
| `apps/api/src/services/payments/reject-payment.service.ts` | Rechazo por admin |
| `apps/api/src/services/payments/refund-payment.service.ts` | Reembolso + reversión de aplicaciones |
| `apps/api/src/services/payments/mark-payment-as-failed.service.ts` | Marcar como fallido (gateway) |
| `apps/api/src/services/payment-applications/apply-payment-to-quota.service.ts` | Aplicación de pago a cuota |
| `apps/api/src/services/payment-gateways/gateway-manager.ts` | Registry de adapters |
| `apps/api/src/services/payment-gateways/adapters/types.ts` | Interfaz IPaymentGatewayAdapter |
| `apps/api/src/services/payment-gateways/adapters/bank.adapter.ts` | Adapter bancario (stub) |
| `apps/api/src/services/payment-gateways/adapters/stripe.adapter.ts` | Adapter Stripe (stub) |
| `apps/api/src/services/webhooks/process-webhook.service.ts` | Lógica de negocio del webhook (auditoría + notificaciones) |
| `apps/api/src/http/endpoints/webhooks.endpoint.ts` | Endpoint HTTP de webhooks (delega al servicio) |
| `packages/database/src/drizzle/schema/tables/gateway-transactions.ts` | Schema de gateway_transactions |
| `packages/domain/src/models/gateway-transactions/` | Modelo de dominio |
