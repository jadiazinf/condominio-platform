# Fase 4.7 — Pseudocódigo y Diagramas de Flujo

> MVP: mantenible, escalable, flexible.
> Referencia legal: Ley de Propiedad Horizontal (LPH) Venezuela.
> No replicamos Grupo Taras — hacemos algo que la gente entienda.
> Sub-fase 4.7.11 (migración) SKIP — no hay data en producción, tabla rasa.

---

## TABLA DE CONTENIDOS

1. [Modelo de Datos](#1-modelo-de-datos)
2. [Crear Canal de Cobro](#2-crear-canal)
3. [Generación de Cargos y Recibos](#3-generacion)
4. [Pago y Aplicación FIFO](#4-pago-fifo)
5. [Intereses, Recargos y Descuentos](#5-intereses)
6. [Anulación y Corrección de Recibos](#6-anulacion)
7. [Notas de Crédito y Débito](#7-notas)
8. [PDF del Recibo](#8-pdf)
9. [Estado de Cuenta y Ledger](#9-estado-cuenta)
10. [Transferencia de Propiedad](#10-transferencia)
11. [Workers y Automatización](#11-workers)
12. [Frontend — Admin](#12-frontend-admin)
13. [Frontend — Residente](#13-frontend-residente)
14. [Edge Cases](#14-edge-cases)
15. [Validaciones y Middlewares](#15-validaciones)
16. [Serialización de Recibos](#16-serializacion)

---

## 1. MODELO DE DATOS {#1-modelo-de-datos}

### Patrones existentes del codebase (RESPETAR):
```
- PK:          uuid('id').primaryKey().defaultRandom()
- Montos:      decimal('field', { precision: 15, scale: 2 })
- Alícuotas:   decimal('field', { precision: 10, scale: 6 })
- Tasas:       decimal('field', { precision: 20, scale: 8 })
- Timestamps:  timestamp('createdAt').defaultNow()
- Audit:       createdBy uuid FK → users
- Metadata:    jsonb('metadata')
- FK cascade:  para hijos que se borran con padre
- FK restrict: para tablas de referencia (currencies, etc.)
- Zod:         baseModelSchema.extend({...})
- Enums:       pgEnum('name', [...])
```

### Diagrama de relaciones:

```
condominiums (+ rif varchar 20)
  │ 1:N
  ▼
billing_channels ──M:N──▶ billing_channel_bank_accounts ──▶ bank_accounts
  │ 1:N                                                      (existente)
  ▼
charge_types (category enum → define columnas del recibo)
  │ 1:N
  ▼
charges ──────────▶ receipts (solo si canal tipo 'receipt')
  │                   │
  │ via payment_      │ - receiptNumber (serial legal)
  │    allocations    │ - replacesReceiptId (self-ref)
  │                   │ - voidReason
  ▼                   │
payments (existente,  │
  + billingChannelId, │
  + receiptId)        │
                      │
unit_ledger_entries ◀─┘  (append-only, corazón del sistema)
  - entryType: debit | credit
  - runningBalance
  - referenceType + referenceId (polimórfico)
  - paymentAmount/paymentCurrencyId/exchangeRateId (cross-currency)

ownership_transfer_snapshots
  - balanceSnapshot (jsonb)
```

### Enums:

```typescript
// Reutilizamos del codebase existente:
// - distributionMethodEnum: by_aliquot, equal_split, fixed_per_unit (ya existe)
// - paymentMethodEnum: transfer, cash, card, mobile_payment, gateway, other (ya existe)
// - paymentStatusEnum: pending, pending_verification, completed, etc. (ya existe)

// NUEVOS:
channelTypeEnum = ['receipt', 'standalone']

frequencyEnum = ['monthly', 'quarterly', 'semi_annual', 'annual', 'one_time']

generationStrategyEnum = ['auto', 'manual']

feeTypeEnum = ['percentage', 'fixed', 'none']

interestTypeEnum = ['simple', 'compound', 'fixed_amount', 'none']
// ↑ YA EXISTE en codebase, reutilizar

allocationStrategyEnum = ['fifo', 'designated', 'fifo_interest_first']

chargeCategoryEnum = [
  'ordinary',           // gastos comunes ordinarios
  'extraordinary',      // requiere asamblea
  'reserve_fund',       // obligatorio Art. 12 LPH, mín 10%
  'social_benefits',    // fondo prestaciones sociales
  'non_common',         // gastos específicos de una unidad
  'fine',
  'interest',           // auto-generated
  'late_fee',           // auto-generated
  'discount',           // auto-generated
  'credit_note',
  'debit_note',         // ajuste cambiario, corrección al alza
  'other'
]

chargeStatusEnum = ['pending', 'paid', 'partial', 'cancelled', 'exonerated']
// ↑ Basado en quotaStatusEnum existente, sin 'overdue' (se calcula dinámicamente)

receiptStatusEnum = ['draft', 'issued', 'paid', 'partial', 'voided']

entryTypeEnum = ['debit', 'credit']

referenceTypeEnum = [
  'charge', 'receipt', 'payment', 'interest',
  'late_fee', 'discount', 'credit_note', 'debit_note',
  'adjustment', 'void_reversal'
]

interestCapTypeEnum = ['percentage_of_principal', 'fixed', 'none']
```

### Constraints críticos:

```sql
-- charges: evita duplicados manuales, permite múltiples auto-generated
-- NOTA: un charge_type puede tener múltiples instancias por período
-- (ej: 3 medidores de electricidad = 3 charges del mismo tipo)
-- El unique se aplica solo a charges que NO son auto-generated
-- y se controla a nivel de servicio, no de DB constraint
-- (porque el admin puede necesitar 3 líneas de "electricidad")

-- receipts: 1 activo por unidad+canal+período
UNIQUE (billingChannelId, unitId, periodYear, periodMonth)
  WHERE status != 'voided'

-- payment_allocations: un pago aplica a un cargo una sola vez
UNIQUE (paymentId, chargeId)

-- receiptNumber: único global (NUNCA se reutiliza)
UNIQUE (receiptNumber)

-- billing_channel_bank_accounts
UNIQUE (billingChannelId, bankAccountId)

-- ledger: índices para performance
INDEX (unitId, billingChannelId, entryDate)
INDEX (unitId, billingChannelId, createdAt)
```

---

## 2. CREAR CANAL DE COBRO {#2-crear-canal}

### Wizard (6 steps):

```
Step 1 — Info General:
  nombre, channelType (receipt|standalone), moneda, entidad gestora,
  fecha efectiva, referencia de asamblea

Step 2 — Distribución y Frecuencia:
  método distribución (by_aliquot|equal_split|fixed_per_unit),
  scope (condominio|edificio), frecuencia, estrategia generación,
  día generación (1-28), día vencimiento (1-28)

Step 3 — Tipos de Cargo (categorías del recibo):
  Lista dinámica de charge_types.
  Cada uno: nombre + categoría + recurrente? + monto default
  Las categorías elegidas definen las COLUMNAS del recibo PDF.
  Auto-generated (interés, recargo, descuento) se muestran read-only.
  Un mismo charge_type puede tener múltiples instancias por período.

Step 4 — Reglas (recargos/descuentos/intereses):
  Pago tardío: tipo + valor + gracia
  Pronto pago: tipo + valor + días antes
  Intereses: tipo + tasa + período + gracia + tope
  Estrategia asignación: fifo | designated | fifo_interest_first

Step 5 — Cuentas Bancarias:
  Selección múltiple (mín 1)

Step 6 — Revisión y confirmar
```

### Pseudocódigo — CreateBillingChannelService:

```
FUNCTION CreateBillingChannel(input):
  VALIDATE input.name no vacío, max 200
  VALIDATE input.condominiumId existe
  VALIDATE input.currencyId existe y activa
  VALIDATE input.generationDay y dueDay entre 1 y 28
  VALIDATE input.chargeTypes min 1
  VALIDATE input.bankAccountIds min 1
  
  IF input.channelType == 'receipt':
    VALIDATE al menos un chargeType con category 'ordinary'
  
  IF input.interestRate > 0.01:
    WARNING "Tasa excede 1% mensual. Asegure autorización de asamblea."
  
  IF any chargeType.category == 'extraordinary' AND !input.assemblyReference:
    WARNING "Cargo extraordinario sin referencia de asamblea"

  BEGIN TRANSACTION:
    channel = BillingChannelsRepo.create({ ...input, isActive: true })
    
    // Charge types del usuario
    FOR EACH ct IN input.chargeTypes:
      ChargeTypesRepo.create({
        billingChannelId: channel.id,
        name: ct.name,
        category: ct.category,
        isAutoGenerated: false,
        isRecurring: ct.isRecurring,
        defaultAmount: ct.defaultAmount,
        sortOrder: ct.sortOrder,
        isActive: true
      })
    
    // 3 charge types auto-generated
    FOR EACH auto IN [
      { name: "Interés por mora", category: 'interest', sort: 997 },
      { name: "Recargo por pago tardío", category: 'late_fee', sort: 998 },
      { name: "Descuento por pronto pago", category: 'discount', sort: 999 }
    ]:
      ChargeTypesRepo.create({
        billingChannelId: channel.id, ...auto,
        isAutoGenerated: true, isRecurring: false, isActive: true
      })
    
    // Vincular cuentas bancarias
    FOR EACH baId IN input.bankAccountIds:
      BillingChannelBankAccountsRepo.create({
        billingChannelId: channel.id, bankAccountId: baId
      })
    
    EventLog('billing_channel.created', channel.id)
  COMMIT
  RETURN success(channel)
```

---

## 3. GENERACIÓN DE CARGOS Y RECIBOS {#3-generacion}

### Contexto real:

```
Cada mes el admin:
1. Recopila facturas reales (electricidad, agua, vigilancia, etc.)
2. Los montos CAMBIAN cada mes (no son fijos)
3. Distribuye por alícuota a cada unidad
4. Genera el recibo con serial secuencial
```

### Flujo — Canal 'receipt' (manual):

```
Admin selecciona canal + período (Marzo 2026)
  │
  ▼
GET charge_types del canal
  │
  ▼
Formulario de montos (cada mes son diferentes):
  ┌────────────────────────────────────┐
  │ Tipo de Cargo      │ Monto Total  │
  │────────────────────│──────────────│
  │ Administración     │ [275.600,00] │
  │ Electricidad N787  │ [21.791,17]  │ ← múltiples instancias
  │ Electricidad N810  │ [40.159,94]  │   del mismo tipo OK
  │ Electricidad N800  │ [60.564,91]  │
  │ Vigilancia         │ [807.330,00] │
  │ Fondo Reserva      │ [auto 10%]   │ ← auto-calc, editable
  │ + Agregar línea    │              │
  └────────────────────────────────────┘
  
  [Cargar desde presupuesto]  [Preview →]
  │
  ├── OPCIÓN B: Cargar desde presupuesto
  │   GET /api/budgets/:id/items → pre-llena montos
  │   Admin ajusta antes de confirmar
  │
  ▼
POST /generate/preview → distribución por unidad SIN guardar
  ┌─────────────────────────────────────────────┐
  │ Unidad │ Alícuota │ Administ. │ Elect. │ ...│
  │ A-1-1  │ 2.15%    │ 5.925,40  │ 2.635  │    │
  │ B-2-4  │ 1.52%    │ 4.189,12  │ 1.862  │    │
  │ TOTAL  │ 100%     │275.600,00 │122.515 │    │
  └─────────────────────────────────────────────┘
  
  Validaciones en preview:
  - Unidades sin alícuota → error
  - Fondo reserva < 10% → warning (Art. 12 LPH)
  - Alícuotas no suman 100% → warning con residuo
  │
  ▼
Admin confirma → POST /generate
```

### Pseudocódigo — GenerateChannelPeriodService:

```
FUNCTION GenerateChannelPeriod(channelId, periodYear, periodMonth, chargeAmounts[]):
  channel = BillingChannelsRepo.findById(channelId)
  IF !channel OR !channel.isActive: RETURN failure

  // Verificar no duplicados
  existing = ReceiptsRepo.findActiveByChannelAndPeriod(channelId, periodYear, periodMonth)
  IF existing.length > 0:
    RETURN failure("Ya existen recibos para este período. Anúlelos primero.", CONFLICT)

  // Obtener unidades del scope
  units = channel.buildingId
    ? UnitsRepo.findByBuilding(channel.buildingId, { active: true })
    : UnitsRepo.findByCondominium(channel.condominiumId, { active: true })
  
  IF units.length == 0: RETURN failure("No hay unidades activas")

  // Validar alícuotas si distribución by_aliquot
  IF channel.distributionMethod == 'by_aliquot':
    missing = units.filter(u => !u.aliquotPercentage || u.aliquotPercentage <= 0)
    IF missing.length > 0:
      RETURN failure("Unidades sin alícuota: " + missing.map(u => u.unitNumber))

  chargeTypes = ChargeTypesRepo.findByChannel(channelId, { active: true, autoGenerated: false })

  BEGIN TRANSACTION:
    ACQUIRE pg_advisory_xact_lock(hash(channelId + periodYear + periodMonth))
    
    receipts = []

    FOR EACH unit IN units:
      // ── 1. Crear charges distribuidos por alícuota ──
      unitCharges = []
      FOR EACH ca IN chargeAmounts:
        unitAmount = DISTRIBUTE(ca.amount, unit, units, channel.distributionMethod)
        
        charge = ChargesRepo.create({
          billingChannelId: channelId,
          chargeTypeId: ca.chargeTypeId,
          unitId: unit.id,
          periodYear, periodMonth,
          description: ca.description || chargeType.name + " " + monthName(periodMonth) + " " + periodYear,
          amount: unitAmount,
          isCredit: false,
          currencyId: channel.currencyId,
          status: 'pending',
          paidAmount: 0,
          balance: unitAmount,
          sourceExpenseId: ca.expenseId || null,
          createdBy: currentUser.id
        })
        unitCharges.push(charge)

      // ── 2. Saldo anterior del canal para esta unidad ──
      lastEntry = UnitLedgerRepo.getLastEntry(unit.id, channelId)
      previousBalance = lastEntry?.runningBalance ?? 0

      // ── 3. Intereses si hay saldo vencido ──
      interestCharge = null
      IF channel.interestType != 'none' AND previousBalance > 0:
        interestAmount = CALCULATE_INTEREST(previousBalance, channel)
        IF interestAmount > 0:
          interestChargeType = ChargeTypesRepo.findAutoGenerated(channelId, 'interest')
          interestCharge = ChargesRepo.create({
            ...interestFields,
            amount: interestAmount,
            isAutoGenerated: true
          })
          unitCharges.push(interestCharge)

      // ── 4. Subtotales por categoría ──
      subtotal = SUM(unitCharges WHERE category IN ordinary/extraordinary/non_common/other AND !isCredit)
      reserveFundAmount = SUM(unitCharges WHERE category == 'reserve_fund')
      interestAmount = interestCharge?.amount ?? 0
      
      totalAmount = subtotal + reserveFundAmount + interestAmount + previousBalance

      // ── 5. Serial del recibo ──
      receiptNumber = GenerateReceiptNumber(channel.condominiumId, periodYear, periodMonth)

      // ── 6. Crear recibo ──
      dueDate = makeDueDate(periodYear, periodMonth, channel.dueDay)
      
      receipt = ReceiptsRepo.create({
        billingChannelId: channelId,
        unitId: unit.id,
        periodYear, periodMonth,
        receiptNumber,
        status: 'issued',
        issuedAt: NOW(),
        dueDate,
        subtotal, reserveFundAmount, previousBalance,
        interestAmount,
        lateFeeAmount: 0,
        discountAmount: 0,
        totalAmount,
        currencyId: channel.currencyId,
        budgetId: input.budgetId || null,
        generatedBy: currentUser.id
      })

      // ── 7. Asignar receiptId a charges ──
      FOR EACH charge IN unitCharges:
        ChargesRepo.update(charge.id, { receiptId: receipt.id })

      // ── 8. Entries en el ledger ──
      FOR EACH charge IN unitCharges:
        AppendLedgerEntry({
          unitId: unit.id,
          billingChannelId: channelId,
          entryDate: receipt.issuedAt,
          entryType: charge.isCredit ? 'credit' : 'debit',
          amount: charge.amount,
          currencyId: channel.currencyId,
          description: charge.description,
          referenceType: categoryToRefType(charge.category),
          referenceId: charge.id
        })
      
      receipts.push(receipt)
    
    EventLog('billing_channel.period_generated', channelId, {
      periodYear, periodMonth, count: receipts.length
    })
  COMMIT
  RETURN success({ receipts })


FUNCTION DISTRIBUTE(totalAmount, unit, allUnits, method):
  SWITCH method:
    'by_aliquot': RETURN round(totalAmount * unit.aliquotPercentage / 100, 2)
    'equal_split': RETURN round(totalAmount / allUnits.length, 2)
    'fixed_per_unit': RETURN totalAmount  // ya es el monto por unidad


FUNCTION CALCULATE_INTEREST(balance, channel):
  // Simplificado — el worker de intereses tiene la lógica completa
  IF channel.interestType == 'simple':
    RETURN round(balance * channel.interestRate, 2)
  IF channel.interestType == 'fixed_amount':
    RETURN channel.interestRate
  // compound: se calcula en el worker diario, no aquí
  RETURN 0
```

### Flujo — Canal 'standalone':

```
Admin selecciona canal standalone + período
  → Monto este mes: [$75.00] (puede cambiar cada mes)
  → Opción: monto diferente por unidad (tabla editable)
  → POST /generate-standalone
  → Para cada unidad: charge + entry debit (NO crea receipt)
```

---

## 4. PAGO Y APLICACIÓN FIFO {#4-pago-fifo}

### Flujo residente:

```
/dashboard/pay
  │
  ▼
Step 1 — Seleccionar canal:
  Cards con saldo actual por canal, indicador de mora
  │
  ▼
Step 2 — Qué pagar:
  A) Pagar recibo específico → selecciona de lista
  B) Pagar monto libre → FIFO preview de qué cargos se cubren
  C) Pagar saldo completo
  
  Preview de descuento/recargo si aplica
  │
  ▼
Step 3 — Método de pago:
  Cuenta destino (del canal) + método + referencia + comprobante
  Si moneda pago ≠ moneda canal: muestra tasa BCV y equivalente
  │
  ▼
Step 4 — Confirmación:
  Resumen: monto base ± descuento/recargo = total
  Si cross-currency: conversión detallada
  │
  ▼
POST /api/payments/report → status: pending_verification
Admin verifica → POST /api/payments/:id/apply
```

### Pseudocódigo — ApplyPaymentToChannelService:

```
FUNCTION ApplyPaymentToChannel(paymentId, channelId):
  payment = PaymentsRepo.findById(paymentId)
  channel = BillingChannelsRepo.findById(channelId)

  BEGIN TRANSACTION:
    ACQUIRE pg_advisory_xact_lock(hash(payment.unitId + channelId))

    // ── 1. Conversión de moneda ──
    amountInChannelCurrency = payment.amount
    exchangeRateId = null
    
    IF payment.currencyId != channel.currencyId:
      conversion = ConvertPaymentCurrency(payment, channel)
      amountInChannelCurrency = conversion.convertedAmount
      exchangeRateId = conversion.exchangeRateId
      // Si tasa stale: flag + notificar admin

    // ── 2. Descuento pronto pago ──
    IF channel.earlyPaymentType != 'none':
      currentReceipt = ReceiptsRepo.findCurrentForUnit(channelId, payment.unitId)
      IF currentReceipt AND TODAY() <= (currentReceipt.dueDate - channel.earlyPaymentDaysBefore):
        discountAmount = calculateFee(amountInChannelCurrency, channel.earlyPaymentType, channel.earlyPaymentValue)
        // Crear charge crédito + entry credit
        createDiscountCharge(channelId, payment.unitId, discountAmount)

    // ── 3. Recargo por mora ──
    IF channel.latePaymentType != 'none':
      overdueReceipts = ReceiptsRepo.findOverdueForUnit(channelId, payment.unitId)
      FOR EACH receipt IN overdueReceipts:
        IF daysOverdue > channel.gracePeriodDays AND !existsLateFeeForReceipt(receipt.id):
          fee = calculateFee(receipt.totalAmount, channel.latePaymentType, channel.latePaymentValue)
          // Crear charge débito + entry debit
          createLateFeeCharge(channelId, payment.unitId, fee, receipt)

    // ── 4. Entry credit del pago en ledger ──
    AppendLedgerEntry({
      unitId: payment.unitId,
      billingChannelId: channelId,
      entryType: 'credit',
      amount: amountInChannelCurrency,
      referenceType: 'payment',
      referenceId: payment.id,
      paymentAmount: payment.amount,
      paymentCurrencyId: payment.currencyId,
      exchangeRateId
    })

    // ── 5. FIFO allocation ──
    AllocatePaymentFIFO(payment.id, payment.unitId, channelId,
      amountInChannelCurrency, channel.allocationStrategy)

    // ── 6. Actualizar payment ──
    PaymentsRepo.update(payment.id, {
      billingChannelId: channelId, status: 'completed'
    })

    EventLog('payment.applied', payment.id)
  COMMIT
```

### Pseudocódigo — AllocatePaymentFIFO:

```
FUNCTION AllocatePaymentFIFO(paymentId, unitId, channelId, amount, strategy):
  remaining = amount

  // Obtener cargos pendientes según estrategia
  pendingCharges = SWITCH strategy:
    'fifo':
      ChargesRepo.findPending(unitId, channelId, ORDER BY createdAt ASC)
    'fifo_interest_first':
      [...findPending(WHERE category IN interest/late_fee, ORDER BY createdAt ASC),
       ...findPending(WHERE category NOT IN interest/late_fee, ORDER BY createdAt ASC)]
    'designated':
      // Se maneja en otro flujo (el pagador indica a qué cargo)
      RETURN

  FOR EACH charge IN pendingCharges:
    IF remaining <= 0: BREAK
    
    allocatable = MIN(remaining, charge.balance)
    
    PaymentAllocationsRepo.create({
      paymentId, chargeId: charge.id, allocatedAmount: allocatable
    })
    
    newPaidAmount = charge.paidAmount + allocatable
    newBalance = charge.amount - newPaidAmount
    ChargesRepo.update(charge.id, {
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newBalance <= 0 ? 'paid' : 'partial'
    })
    
    // Actualizar receipt status si aplica
    IF charge.receiptId:
      updateReceiptStatus(charge.receiptId)
    
    remaining -= allocatable
  
  // Sobrante queda como saldo a favor (runningBalance negativo)
  // Se compensa automáticamente con el próximo cargo


FUNCTION updateReceiptStatus(receiptId):
  charges = ChargesRepo.findByReceipt(receiptId)
  IF charges.every(c => c.status == 'paid'):
    ReceiptsRepo.update(receiptId, { status: 'paid' })
  ELIF charges.some(c => c.status == 'partial'):
    ReceiptsRepo.update(receiptId, { status: 'partial' })
```

### ConvertPaymentCurrency:

```
FUNCTION ConvertPaymentCurrency(payment, channel):
  rate = ExchangeRatesRepo.getLatestRate(payment.currencyId, channel.currencyId, TODAY())
  
  IF !rate:
    // Fallback: última tasa conocida
    rate = ExchangeRatesRepo.getLatestRate(payment.currencyId, channel.currencyId, null)
    IF !rate: RETURN failure("No hay tasa de cambio disponible")
    // Flag stale + notificar admin
  
  convertedAmount = round(payment.amount * rate.rate, 2)
  RETURN { convertedAmount, exchangeRateId: rate.id, isStaleRate }
```

---

## 5. INTERESES, RECARGOS Y DESCUENTOS {#5-intereses}

### Worker diario de intereses:

```
[CRON: 02:00 AM diario]

FOR EACH channel WHERE interestType != 'none' AND isActive:
  FOR EACH unit WHERE saldoVencido > 0 en este canal:
    │
    ├── Calcular saldo vencido del CANAL (no por cargo individual)
    │   = SUM(charges.balance WHERE status IN pending/partial
    │     AND dueDate < TODAY()
    │     AND category NOT IN interest/late_fee/discount)
    │
    ├── Restar días de gracia → si aún en gracia, SKIP
    │
    ├── Verificar que no se calculó hoy ya → si existe, SKIP
    │
    ├── Calcular:
    │   simple:  I = saldoVencido × tasaMensual/30 × díasVencidos
    │   compound: I = saldoVencido × ((1 + tasa)^(días/30) - 1)
    │   fixed:   I = montoFijo
    │
    ├── Aplicar tope (cap):
    │   percentage_of_principal: MAX = saldo × capValue
    │   fixed: MAX = capValue
    │
    ├── WARNING si tasa efectiva > 12% anual (Art. 14 LPH)
    │
    └── Crear charge interés + entry debit en ledger
```

---

## 6. ANULACIÓN Y CORRECCIÓN DE RECIBOS {#6-anulacion}

### Escenarios reales:

```
1. Error en montos → anular + generar reemplazo con montos correctos
2. Recibo ya tiene pagos parciales → reversar allocations, pagos quedan como saldo a favor
3. Moneda incorrecta → anular + regenerar
CLAVE: El serial del recibo anulado NUNCA se reutiliza (Art. 14 LPH)
```

### Pseudocódigo — VoidReceiptService:

```
FUNCTION VoidReceipt(receiptId, voidReason, generateReplacement, replacementData?):
  receipt = ReceiptsRepo.findById(receiptId)
  IF !receipt: RETURN failure(NOT_FOUND)
  IF receipt.status == 'voided': RETURN failure("Ya anulado", CONFLICT)
  
  VALIDATE voidReason min 10 chars (forzar razón descriptiva)

  charges = ChargesRepo.findByReceipt(receiptId)

  BEGIN TRANSACTION:
    // 1. Anular recibo (el serial queda como anulado, NUNCA se reutiliza)
    ReceiptsRepo.update(receiptId, { status: 'voided', voidReason })

    // 2. Revertir cada charge
    FOR EACH charge IN charges:
      // Revertir allocations si hay pagos aplicados
      allocations = PaymentAllocationsRepo.findByCharge(charge.id)
      FOR EACH alloc IN allocations:
        PaymentAllocationsRepo.update(alloc.id, { reversed: true, reversedAt: NOW() })
      
      ChargesRepo.update(charge.id, { status: 'cancelled', paidAmount: 0, balance: 0 })
      
      // Entry de reverso en ledger
      AppendLedgerEntry({
        unitId: receipt.unitId,
        billingChannelId: receipt.billingChannelId,
        entryType: charge.isCredit ? 'debit' : 'credit',  // inverso
        amount: charge.amount,
        description: "Anulación recibo " + receipt.receiptNumber,
        referenceType: 'void_reversal',
        referenceId: charge.id
      })

    // 3. Generar reemplazo si solicitado
    IF generateReplacement AND replacementData:
      newReceipt = GenerateChannelPeriodForUnit(...)
      ReceiptsRepo.update(newReceipt.id, { replacesReceiptId: receiptId })
      // NUEVO serial — los pagos previos quedan como saldo a favor

    EventLog('receipt.voided', receiptId, { voidReason, hasReplacement: !!newReceipt })
  COMMIT
  RETURN success({ voidedReceipt: receipt, replacementReceipt: newReceipt })
```

---

## 7. NOTAS DE CRÉDITO Y DÉBITO {#7-notas}

```
NOTA DE CRÉDITO: Reduce deuda
  - Admin cobró de más → emite nota de crédito
  - Reintegro aprobado por asamblea

NOTA DE DÉBITO: Aumenta deuda
  - Diferencial cambiario
  - Cargo no incluido en recibo original

AMBAS: Son cargos nuevos en el ledger. NUNCA modifican el recibo original.
```

### IssueCreditNoteService:

```
FUNCTION IssueCreditNote(channelId, unitId, amount, reason, sourceChargeId?):
  VALIDATE amount > 0, reason min 10 chars
  
  IF sourceChargeId:
    sourceCharge = ChargesRepo.findById(sourceChargeId)
    IF amount > sourceCharge.balance:
      RETURN failure("Monto excede saldo del cargo")

  BEGIN TRANSACTION:
    charge = ChargesRepo.create({
      billingChannelId: channelId, unitId,
      chargeTypeId: findChargeType(channelId, 'credit_note'),
      description: "Nota de crédito: " + reason,
      amount, isCredit: true,
      status: 'paid',  // se aplica inmediatamente
      sourceChargeId
    })

    AppendLedgerEntry({
      unitId, billingChannelId: channelId,
      entryType: 'credit', amount,
      referenceType: 'credit_note', referenceId: charge.id
    })

    // Actualizar sourceCharge si existe
    IF sourceChargeId:
      updateChargeBalance(sourceChargeId, -amount)
  COMMIT
```

### IssueDebitNoteService:

```
FUNCTION IssueDebitNote(channelId, unitId, amount, reason, sourceChargeId?):
  // Mismo patrón pero isCredit: false, entryType: 'debit'
  // El cargo queda como pendiente (el propietario lo debe pagar)
```

---

## 8. PDF DEL RECIBO {#8-pdf}

### Diseño: simple y entendible (NO réplica de Grupo Taras)

```
┌────────────────────────────────────────────────────────┐
│  [LOGO]  RECIBO DE CONDOMINIO         N° REC-LV-202603-001 │
│                                                         │
│  Residencias Las Villas                                 │
│  Urb. Guaicay, Sector VA   |   RIF: J-XXXXXXXX-X      │
│                                                         │
│  Propietario: Jesus Díaz Rodriguez                      │
│  Unidad: B-2-4  |  Alícuota: 1.520000%                │
│  Período: Marzo 2026                                    │
│  Emisión: 05/03/2026  |  Vencimiento: 28/04/2026      │
│─────────────────────────────────────────────────────────│
│                                                         │
│  GASTOS COMUNES                                         │
│  ─────────────────────────────────────────              │
│  Administración .......................... Bs. 4.189,12 │
│  Electricidad (medidor N787) ............. Bs.   331,23 │
│  Electricidad (medidor N810) ............. Bs.   610,43 │
│  Electricidad (medidor N800) ............. Bs.   920,59 │
│  Vigilancia .............................. Bs.12.271,42 │
│  Mant. Ascensores ........................ Bs. 3.507,00 │
│  (más items...)                                         │
│                              Subtotal:    Bs.48.431,09  │
│                                                         │
│  FONDO DE RESERVA                                       │
│  ─────────────────────────────────────────              │
│  Aporte mensual (10%) ................... Bs. 4.367,02  │
│                                                         │
│  ─────────────────────────────────────────              │
│  Neto del mes:                            Bs.52.798,11  │
│  Saldo anterior:                          Bs.     0,00  │
│  Interés de mora:                         Bs.     0,00  │
│  ─────────────────────────────────────────              │
│  TOTAL A PAGAR:                           Bs.52.798,11  │
│                                                         │
│  Ref. USD: $112,00 (tasa BCV: 471,41)                  │
│                                                         │
│  Administradora: Grupo Taras C.A.                       │
│  RIF: J-30850713-0 | Tel: (0212) 762-6927              │
└─────────────────────────────────────────────────────────┘

Las secciones/columnas dependen de las CATEGORÍAS configuradas
por la administradora al crear el canal.
Si configuró reserve_fund → aparece sección "Fondo de Reserva"
Si configuró social_benefits → aparece sección "Fondo Prest. Sociales"
Si configuró non_common → aparece sección "Gastos No Comunes"
```

### Pseudocódigo:

```
FUNCTION GenerateReceiptPdf(receiptId):
  receipt = ReceiptsRepo.findById(receiptId)
  channel = BillingChannelsRepo.findById(receipt.billingChannelId)
  unit = UnitsRepo.findById(receipt.unitId)
  owner = UsersRepo.findOwnerOfUnit(unit.id)
  condominium = CondominiumsRepo.findById(channel.condominiumId)
  company = ManagementCompaniesRepo.findByCondominium(condominium.id)
  charges = ChargesRepo.findByReceipt(receiptId, ORDER BY sortOrder)
  
  // Agrupar por categoría (las categorías configuradas = secciones del PDF)
  sections = groupByCategory(charges)
  // { ordinary: [...], reserve_fund: [...], non_common: [...], etc. }

  // Referencia USD si moneda del canal es VES
  usdRef = null
  IF channel.currencyId == VES:
    rate = ExchangeRatesRepo.getLatest(VES, USD)
    IF rate: usdRef = receipt.totalAmount / rate.rate

  // Generar PDF con pdfkit
  pdf = buildPdf({
    header: { logo: company.logoUrl, receiptNumber: receipt.receiptNumber },
    condominium: { name, address, rif: condominium.rif },
    unit: { name: unit.unitNumber, aliquot: unit.aliquotPercentage },
    owner: { fullName: owner.fullName },
    period: { year: receipt.periodYear, month: receipt.periodMonth },
    dates: { issued: receipt.issuedAt, due: receipt.dueDate },
    sections: sections,  // agrupado por categoría
    summary: {
      subtotal: receipt.subtotal,
      reserveFund: receipt.reserveFundAmount,
      previousBalance: receipt.previousBalance,
      interest: receipt.interestAmount,
      total: receipt.totalAmount
    },
    usdReference: usdRef,
    footer: { company: company.name, rif: company.rif, phones, address }
  })
  
  RETURN pdf.toBuffer()
```

---

## 9. ESTADO DE CUENTA Y LEDGER {#9-estado-cuenta}

```
GET /api/units/:unitId/statement?channelId=X&from=2026-01&to=2026-03

  FECHA       │ DESCRIPCIÓN                  │ DÉBITO    │ CRÉDITO   │ SALDO
  05/01/2026  │ Recibo Ene (#REC-001)        │ 48.500,00 │           │  48.500
  15/01/2026  │ Pago transferencia #REF123   │           │ 48.500,00 │       0
  05/02/2026  │ Recibo Feb (#REC-045)        │ 51.200,00 │           │  51.200
  28/02/2026  │ Interés moratorio            │    512,00 │           │  51.712
  05/03/2026  │ Recibo Mar (#REC-089)        │ 50.899,15 │           │ 102.611
  10/03/2026  │ Nota crédito (ajuste)        │           │  5.000,00 │  97.611
  15/03/2026  │ Pago parcial #REF456         │           │ 60.000,00 │  37.611
  
  SALDO ACTUAL: Bs. 37.611,15
  
  Aging: 0-30d: 37.611 | 31-60d: 0 | 61-90d: 0 | >90d: 0
```

### Pseudocódigo:

```
FUNCTION GetAccountStatement(unitId, channelId, fromDate, toDate):
  initialEntry = UnitLedgerRepo.getLastEntryBefore(unitId, channelId, fromDate)
  initialBalance = initialEntry?.runningBalance ?? 0

  entries = UnitLedgerRepo.getEntries(unitId, channelId, fromDate, toDate,
    ORDER BY entryDate ASC, createdAt ASC)

  // Aging basado en cargos pendientes
  pendingCharges = ChargesRepo.findPending(unitId, channelId)
  aging = calculateAging(pendingCharges)

  lastEntry = UnitLedgerRepo.getLastEntry(unitId, channelId)

  RETURN {
    initialBalance,
    entries: entries.map(e => ({
      date: e.entryDate,
      description: e.description,
      debit: e.entryType == 'debit' ? e.amount : null,
      credit: e.entryType == 'credit' ? e.amount : null,
      balance: e.runningBalance,
      referenceType: e.referenceType,
      paymentInfo: e.paymentAmount ? { originalAmount, currency, rate } : null
    })),
    currentBalance: lastEntry?.runningBalance ?? 0,
    aging
  }
```

---

## 10. TRANSFERENCIA DE PROPIEDAD {#10-transferencia}

```
Admin registra cambio de propietario
  │
  ├── GET balance-summary de la unidad
  │
  ├── SI hay deuda:
  │   WARNING: "Deuda pendiente. Las deudas de condominio son
  │   obligaciones propter rem (Art. 12 LPH) — se adhieren
  │   a la propiedad. El nuevo propietario hereda la deuda."
  │
  ├── Genera ownership_transfer_snapshot:
  │   { saldo por canal, cargos pendientes, fecha }
  │
  └── PDF descargable: "Estado de cuenta para transferencia"
```

---

## 11. WORKERS {#11-workers}

```
Auto-generación [CRON: día X de cada mes por canal]:
  - Solo para canales con generationStrategy = 'auto'
  - Solo funciona con charge_types que tienen defaultAmount (montos fijos)
  - Si montos varían cada mes → admin usa generación manual

Intereses [CRON: diario 02:00]:
  - Calcula sobre saldo del CANAL, no por cargo individual
  - Crea charge de interés + entry debit

Recordatorios [CRON: configurable]:
  - X días antes del vencimiento → recordatorio
  - Después del vencimiento → aviso de mora
  - 60+ días mora → notificar admin para cobranza legal
```

---

## 12. FRONTEND — ADMIN {#12-frontend-admin}

```
/dashboard/condominiums/[id]/
  ├── billing-channels/              ← Lista de canales
  │   ├── create                     ← Wizard 6 steps
  │   ├── [channelId]/               ← Detalle + config
  │   │   └── generate               ← Generar período (formulario + preview)
  │   └── REEMPLAZA: payment-concepts/*
  │
  ├── receipts/                      ← Lista de recibos
  │   └── [receiptId]/               ← Detalle + anular + PDF + email
  │
  ├── charges/                       ← Lista de cargos
  │   └── [chargeId]/                ← Cancelar + exonerar + nota crédito/débito
  │
  └── ledger/                        ← Estado de cuenta por unidad
```

### UX de generación:

```
1. Selector de período (año + mes)
   → Si ya hay recibos: "Anúlelos antes de generar nuevos"

2. Tabla de montos por tipo de cargo
   → Cada fila es editable (los montos cambian cada mes)
   → Fondo reserva auto-calculado (editable si admin necesita ajustar)
   → Botón "Cargar desde presupuesto"
   → Botón "+ Agregar línea" (para instancias extras, ej: 3 medidores)

3. Preview de distribución por unidad
   → Tabla: unidad | alícuota | monto por tipo | total
   → Warnings si fondo reserva < 10%

4. Confirmar → resultado + opciones (ver recibos, descargar PDFs, enviar emails)
```

---

## 13. FRONTEND — RESIDENTE {#13-frontend-residente}

```
/dashboard/
  ├── my-statement/          ← Estado de cuenta (tabs por canal)
  │                            Tabla de movimientos, saldo, botón "Pagar"
  │
  ├── my-charges/            ← Cargos pendientes agrupados por canal
  │
  ├── my-receipts/           ← Recibos con PDF descargable
  │
  └── pay/                   ← Flujo de pago (4 steps)
```

---

## 14. EDGE CASES {#14-edge-cases}

### Base de datos:
```
1. Redondeo alícuotas: residuo se asigna a última unidad procesada
2. Unidad sin propietario: cargo se genera igual (deuda es de la propiedad)
3. Pago > deuda total: sobrante = saldo a favor (runningBalance negativo)
4. Tasa BCV no disponible: usar última conocida + flag stale + warning admin
5. Dos pagos simultáneos: advisory lock por (unitId, channelId)
6. Saldo a favor + nuevo cargo: previousBalance negativo reduce totalAmount
7. generationDay > días del mes (31 en Feb): usar último día del mes
```

### API:
```
8.  Double-click en generación: advisory lock previene duplicados → 409
9.  Timeout en generación masiva: transacción se revierte (atómica)
10. Cambio config canal con cargos pendientes: solo afecta futuros
```

### Legal:
```
11. Serial anulado NUNCA se reutiliza → reemplazo obtiene nuevo serial
12. Recibo sin RIF: warning (no bloqueo)
13. Interés > 12% anual: warning (asamblea puede autorizar diferente)
14. Fondo reserva < 10%: warning (no bloqueo)
```

### Múltiples instancias:
```
15. Un charge_type puede tener múltiples cargos en el mismo período
    (ej: 3 medidores de electricidad = 3 charges del tipo "Electricidad")
    → No hay unique constraint por charge_type+período
    → Se controla a nivel de servicio
```

---

## 15. VALIDACIONES Y MIDDLEWARES {#15-validaciones}

### Middlewares (existentes + nuevos):
```
isUserAuthenticated  → JWT (existente)
isAdmin              → admin del condominio (existente)
isResident           → residente de la unidad (existente)
auditFinancialOp     → NUEVO: log automático de operaciones financieras
```

### Validaciones por endpoint:

```
POST /billing-channels
  name: required, max 200
  condominiumId: exists
  currencyId: exists, active
  generationDay, dueDay: 1-28
  chargeTypes: min 1
  bankAccountIds: min 1

POST /billing-channels/:id/generate
  periodYear: 2000-2100
  periodMonth: 1-12
  chargeAmounts: min 1, each with chargeTypeId (exists, belongs to channel) + amount >= 0
  No duplicados para período existente

POST /receipts/:id/void
  voidReason: required, min 10 chars

POST /payments/report
  unitId, billingChannelId: exist
  amount: > 0
  paymentMethod: valid enum
  referenceNumber: required for non-cash

POST /charges/:id/credit-note
  amount: > 0
  reason: required, min 10 chars

GET /units/:id/statement
  channelId: required
  from, to: valid dates, from <= to
```

---

## 16. SERIALIZACIÓN DE RECIBOS {#16-serializacion}

### Reglas:
```
1. Único por condominio (no global)
2. NUNCA se reutiliza (ni en voided)
3. Secuencial dentro de cada condominio
4. Formato CONFIGURABLE por administradora
```

### Formatos soportados:
```
Default:      REC-{CODE}-{YYYYMM}-{SEQ:4}    → REC-LV-202603-0001
Grupo Taras:  {YYMMDD}{CODE:3}{SEQ:3}         → 260305200001
Compacto:     RC{YYYY}{MM}{SEQ:4}             → RC2026030001

Placeholders:
  {CODE}    → código corto del condominio
  {YYYY}    → año 4 dígitos
  {YY}      → año 2 dígitos
  {MM}      → mes 2 dígitos
  {DD}      → día 2 dígitos
  {SEQ}     → secuencia auto-incremento
  {SEQ:N}   → con padding de N dígitos
```

### Pseudocódigo:

```
FUNCTION GenerateReceiptNumber(condominiumId, periodYear, periodMonth):
  // Dentro de la transacción (ya tiene advisory lock)
  lastReceipt = ReceiptsRepo.findLastByCondominium(condominiumId, ORDER BY receiptNumber DESC)
  nextSeq = extractSequence(lastReceipt?.receiptNumber) + 1 || 1
  
  condominium = CondominiumsRepo.findById(condominiumId)
  format = condominium.receiptNumberFormat || "REC-{CODE}-{YYYYMM}-{SEQ:4}"
  
  receiptNumber = applyFormat(format, {
    CODE: condominium.code,
    YYYY: periodYear, MM: padStart(periodMonth, 2),
    SEQ: nextSeq
  })
  
  // Belt and suspenders: UNIQUE constraint en DB como última defensa
  RETURN receiptNumber
```

---

## RESUMEN DE ENDPOINTS

```
// Billing Channels
POST   /api/billing-channels                          → Create
GET    /api/billing-channels?condominiumId=X           → List
GET    /api/billing-channels/:id                       → GetById
PUT    /api/billing-channels/:id                       → Update
POST   /api/billing-channels/:id/generate/preview      → Preview
POST   /api/billing-channels/:id/generate              → GeneratePeriod
POST   /api/billing-channels/:id/generate-standalone   → GenerateStandalone
POST   /api/billing-channels/:id/bank-accounts         → LinkBankAccount
DELETE /api/billing-channels/:id/bank-accounts/:baId   → UnlinkBankAccount

// Charge Types
POST   /api/billing-channels/:id/charge-types          → Create
GET    /api/billing-channels/:id/charge-types           → List
PUT    /api/charge-types/:id                            → Update

// Charges
GET    /api/charges?unitId&channelId&period             → List
GET    /api/charges/:id                                 → GetById
POST   /api/charges/:id/cancel                          → Cancel
POST   /api/charges/:id/exonerate                       → Exonerate
POST   /api/charges/:id/credit-note                     → CreditNote
POST   /api/charges/:id/debit-note                      → DebitNote

// Receipts
GET    /api/receipts?channelId&period                   → List
GET    /api/receipts/:id                                 → GetById
POST   /api/receipts/:id/void                            → Void
GET    /api/receipts/:id/pdf                             → PDF
POST   /api/receipts/:id/send-email                      → SendEmail

// Ledger
GET    /api/units/:id/statement                          → AccountStatement
GET    /api/units/:id/balance?channelId                  → Balance
GET    /api/units/:id/balance-summary                    → AllChannels

// Payment Allocations
GET    /api/payments/:id/allocations                     → ByPayment
GET    /api/charges/:id/allocations                      → ByCharge

// Payments (adaptados — tabla existente)
POST   /api/payments/report                              → Report (residente)
POST   /api/payments/:id/apply                           → Apply (admin)
POST   /api/payments/:id/refund                          → Refund

// Ownership Transfer
POST   /api/units/:id/transfer-ownership                 → Transfer
GET    /api/units/:id/transfer-snapshots                 → Snapshots
```

---

## RESUMEN DE SERVICIOS

```
// Core Ledger
AppendLedgerEntryService            → Entry + runningBalance (advisory lock)
GetUnitBalanceService               → Último runningBalance
GetAccountStatementService          → Entries + aging + filtros

// Generation
GenerateChannelPeriodService        → Cargos + recibos (canal receipt)
GenerateStandaloneChargeService     → Cargo standalone
PreviewGenerationService            → Preview sin persistir
AutoGenerateChannelChargesService   → Para canales auto con defaultAmount

// Payments
ApplyPaymentToChannelService        → Conversión + descuento/recargo + FIFO
ConvertPaymentCurrencyService       → BCV rate + fallback
AllocatePaymentFIFOService          → Distribución a cargos pendientes
RefundPaymentService                → Reverso en ledger

// Interest/Fees
CalculateChannelInterestService     → Interés sobre saldo vencido
ApplyLateFeeService                 → Recargo
ApplyEarlyPaymentDiscountService    → Descuento pronto pago

// Receipts
VoidReceiptService                  → Anular + reversar + reemplazo
GenerateReceiptPdfService           → PDF simple y entendible
SendReceiptEmailService             → Email con PDF

// Notes
IssueCreditNoteService              → Reduce deuda
IssueDebitNoteService               → Aumenta deuda

// Transfer
GenerateOwnershipTransferSnapshotService → Snapshot al transferir
```

---

## NOTAS LEGALES

```
1. SERIAL: No es factura SENIAT. Secuencial para fuerza ejecutiva (Art. 14 LPH).
   Anulados NUNCA se reutilizan.

2. FUERZA EJECUTIVA (Art. 14): Requiere: unidad, propietario, período,
   desglose, alícuota, total, numeración secuencial.

3. FONDO RESERVA (Art. 12): Obligatorio, mín 10% de ordinarios.

4. INTERESES: Máx 12% anual (CC Art. 1746). Asamblea puede fijar diferente.

5. EXTRAORDINARIOS: 75% alícuotas para mejoras (Art. 9 LPH).

6. PROPTER REM (Art. 12): Deudas se adhieren a la propiedad.
```
