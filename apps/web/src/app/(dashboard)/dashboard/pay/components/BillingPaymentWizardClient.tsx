'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
  CircleDot,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Check,
} from 'lucide-react'
import {
  useBillingCharges,
  useBillingReceipts,
  useUnitBalance,
  useReportBillingPayment,
} from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Input } from '@/ui/components/input'
import { Select, SelectItem } from '@/ui/components/select'
import { Textarea } from '@/ui/components/textarea'
import { Stepper } from '@/ui/components/stepper'

// ─── Types ───

export interface IUnitOption {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumId: string
  condominiumName: string
}

interface IPayState {
  unitId: string
  condominiumId: string
  amount: string
  paymentMethod: string
  paymentDate: string
  receiptNumber: string
  notes: string
  selectedReceiptId: string
}

const INITIAL_STATE: IPayState = {
  unitId: '',
  condominiumId: '',
  amount: '',
  paymentMethod: '',
  paymentDate: new Date().toISOString().split('T')[0]!,
  receiptNumber: '',
  notes: '',
  selectedReceiptId: '',
}

const STEPS = ['amount', 'details', 'confirm'] as const
const STEP_ITEMS = [
  { key: 'amount' as const, title: 'Monto' },
  { key: 'details' as const, title: 'Detalles' },
  { key: 'confirm' as const, title: 'Confirmar' },
]

const METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  mobile_payment: 'Pago Móvil',
  cash: 'Efectivo',
  other: 'Otro',
}

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  transfer: Building2,
  mobile_payment: Smartphone,
  cash: Banknote,
  other: CircleDot,
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  issued: 'Emitido',
  partial: 'Parcial',
}

const RECEIPT_STATUS_COLORS: Record<string, 'warning' | 'danger'> = {
  issued: 'warning',
  partial: 'danger',
}

// ─── FIFO Allocation Preview ───

interface IFifoAllocation {
  chargeId: string
  description: string | null
  period: string
  chargeAmount: string
  chargeBalance: string
  allocated: string
  fullyCovered: boolean
}

function computeFifoAllocations(
  charges: Array<{
    id: string
    description: string | null
    periodYear: number
    periodMonth: number
    amount: string
    balance: string
    createdAt: string | Date
  }>,
  paymentAmount: number
): IFifoAllocation[] {
  const sorted = [...charges].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  let remaining = paymentAmount
  const allocations: IFifoAllocation[] = []

  for (const charge of sorted) {
    if (remaining <= 0) break
    const chargeBalance = parseFloat(charge.balance)
    if (chargeBalance <= 0) continue

    const allocated = Math.min(remaining, chargeBalance)
    remaining -= allocated

    allocations.push({
      chargeId: charge.id,
      description: charge.description,
      period: `${MONTH_NAMES[charge.periodMonth - 1]} ${charge.periodYear}`,
      chargeAmount: charge.amount,
      chargeBalance: charge.balance,
      allocated: allocated.toFixed(2),
      fullyCovered: allocated >= chargeBalance,
    })
  }

  return allocations
}

// ─── Component ───

interface Props {
  unitOptions: IUnitOption[]
  userId: string
}

export function BillingPaymentWizardClient({ unitOptions, userId }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [state, setState] = useState<IPayState>(() => ({
    ...INITIAL_STATE,
    unitId: unitOptions.length === 1 ? unitOptions[0]!.unitId : '',
    condominiumId: unitOptions.length === 1 ? unitOptions[0]!.condominiumId : '',
  }))
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const update = useCallback((updates: Partial<IPayState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Data hooks
  const { data: balanceData } = useUnitBalance(state.unitId, state.condominiumId, {
    enabled: !!state.unitId && !!state.condominiumId,
  })
  const balance = balanceData?.data?.balance ?? '0'

  const { data: chargesData } = useBillingCharges(
    { unitId: state.unitId, condominiumId: state.condominiumId },
    { enabled: !!state.unitId && !!state.condominiumId }
  )
  const pendingCharges = (chargesData?.data ?? []).filter(
    c => c.status === 'pending' || c.status === 'partial'
  )

  // Receipts for selected condominium (pending ones for the unit)
  const { data: receiptsData } = useBillingReceipts(
    { condominiumId: state.condominiumId },
    { enabled: !!state.condominiumId && !!state.unitId }
  )
  const pendingReceipts = useMemo(() => {
    const all = receiptsData?.data ?? []
    return all.filter(
      r => r.unitId === state.unitId && (r.status === 'issued' || r.status === 'partial')
    )
  }, [receiptsData, state.unitId])

  // FIFO allocation preview
  const fifoAllocations = useMemo(() => {
    const amount = parseFloat(state.amount)
    if (!amount || amount <= 0 || pendingCharges.length === 0) return []
    return computeFifoAllocations(pendingCharges, amount)
  }, [state.amount, pendingCharges])

  const { mutateAsync: reportPayment, isPending: isSubmitting } = useReportBillingPayment({
    onSuccess: () => {
      setResult({ success: true, message: 'Pago reportado exitosamente. Será revisado por un administrador.' })
      setCurrentStep(3) // result step
    },
    onError: (error) => {
      setResult({ success: false, message: error.message || 'Error al reportar el pago' })
      setCurrentStep(3)
    },
  })

  // ─── Navigation ───

  const canProceed = (): boolean => {
    switch (STEPS[currentStep]) {
      case 'amount':
        return !!state.unitId && !!state.amount && parseFloat(state.amount) > 0 && !!state.paymentMethod
      case 'details':
        return !!state.paymentDate
      case 'confirm':
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!canProceed()) return
    if (currentStep === 2) {
      handleSubmit()
      return
    }
    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleSubmit = async () => {
    try {
      await reportPayment({
        unitId: state.unitId,
        condominiumId: state.condominiumId,
        amount: state.amount,
        currencyId: '',
        paymentMethod: state.paymentMethod,
        paymentDate: state.paymentDate,
        receiptNumber: state.receiptNumber || undefined,
        notes: state.notes || undefined,
      })
    } catch {
      // handled by hook
    }
  }

  const handleReset = () => {
    setState({
      ...INITIAL_STATE,
      unitId: unitOptions.length === 1 ? unitOptions[0]!.unitId : '',
      condominiumId: unitOptions.length === 1 ? unitOptions[0]!.condominiumId : '',
    })
    setCurrentStep(0)
    setResult(null)
  }

  // ─── Render Steps ───

  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'amount':
        return (
          <div className="space-y-5">
            {/* Unit selector */}
            {unitOptions.length > 1 && (
              <Select
                label="Unidad"
                placeholder="Selecciona tu unidad"
                selectedKeys={state.unitId ? [state.unitId] : []}
                onSelectionChange={keys => {
                  const uid = Array.from(keys as Set<string>)[0] as string
                  const unit = unitOptions.find(u => u.unitId === uid)
                  update({ unitId: uid, condominiumId: unit?.condominiumId ?? '', amount: '', selectedReceiptId: '' })
                }}
              >
                {unitOptions.map(u => (
                  <SelectItem key={u.unitId}>
                    {u.buildingName ? `${u.buildingName} - ${u.unitNumber}` : u.unitNumber}
                    {` (${u.condominiumName})`}
                  </SelectItem>
                ))}
              </Select>
            )}

            {/* Balance info */}
            {state.unitId && (
              <Card className={`p-4 ${parseFloat(balance) > 0 ? 'bg-danger-50' : 'bg-success-50'}`}>
                <Typography variant="caption" color="muted">Saldo actual</Typography>
                <Typography className={`text-2xl font-bold ${parseFloat(balance) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                  {formatAmount(balance)}
                </Typography>
                {parseFloat(balance) <= 0 && (
                  <Typography variant="caption" color="muted">No tienes saldo pendiente</Typography>
                )}
                {pendingCharges.length > 0 && (
                  <Typography variant="caption" color="muted" className="mt-1">
                    {pendingCharges.length} cargo{pendingCharges.length > 1 ? 's' : ''} pendiente{pendingCharges.length > 1 ? 's' : ''}
                  </Typography>
                )}
              </Card>
            )}

            {/* Pending receipts */}
            {state.unitId && pendingReceipts.length > 0 && (
              <>
                <Typography variant="caption" className="font-semibold">
                  Recibos pendientes (selecciona uno para pagar su monto)
                </Typography>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pendingReceipts.map(receipt => {
                    const isSelected = state.selectedReceiptId === receipt.id
                    return (
                      <Card
                        key={receipt.id}
                        isPressable
                        className={isSelected ? 'border-primary border-2' : ''}
                        onPress={() => {
                          if (isSelected) {
                            update({ selectedReceiptId: '', amount: '' })
                          } else {
                            update({ selectedReceiptId: receipt.id, amount: receipt.totalAmount })
                          }
                        }}
                      >
                        <CardBody className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <FileText className="mt-0.5 h-5 w-5 text-default-400" />
                              <div>
                                <Typography className="font-semibold">
                                  {receipt.receiptNumber}
                                </Typography>
                                <Typography variant="caption" color="muted">
                                  {MONTH_NAMES[receipt.periodMonth - 1]} {receipt.periodYear}
                                </Typography>
                                {receipt.dueDate && (
                                  <Typography variant="caption" color="muted" className="block">
                                    Vence: {receipt.dueDate}
                                  </Typography>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Typography className="font-bold">
                                {formatAmount(receipt.totalAmount)}
                              </Typography>
                              <Chip
                                size="sm"
                                color={RECEIPT_STATUS_COLORS[receipt.status] ?? 'warning'}
                                variant="flat"
                              >
                                {RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status}
                              </Chip>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-2 flex items-center gap-1 text-primary">
                              <Check className="h-4 w-4" />
                              <Typography variant="caption" className="text-primary font-medium">
                                Seleccionado
                              </Typography>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}

            <Typography variant="caption" className="font-semibold">
              Ingresa el monto a pagar y selecciona el método de pago
            </Typography>

            {/* Quick amount buttons */}
            {parseFloat(balance) > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={state.amount === balance ? 'solid' : 'flat'}
                  color="primary"
                  onPress={() => update({ amount: balance, selectedReceiptId: '' })}
                >
                  Saldo completo ({formatAmount(balance)})
                </Button>
                {state.selectedReceiptId && (() => {
                  const selectedReceipt = pendingReceipts.find(r => r.id === state.selectedReceiptId)
                  return selectedReceipt ? (
                    <Button
                      size="sm"
                      variant={state.amount === selectedReceipt.totalAmount ? 'solid' : 'flat'}
                      color="secondary"
                      onPress={() => update({ amount: selectedReceipt.totalAmount })}
                    >
                      Recibo {selectedReceipt.receiptNumber} ({formatAmount(selectedReceipt.totalAmount)})
                    </Button>
                  ) : null
                })()}
              </div>
            )}

            <Input
              isRequired
              label="Monto a pagar"
              type="number"
              value={state.amount}
              onValueChange={v => update({ amount: v })}
              placeholder="0.00"
              description={parseFloat(balance) > 0 ? `Saldo pendiente: ${formatAmount(balance)}` : undefined}
            />

            {/* FIFO allocation preview */}
            {fifoAllocations.length > 0 && (
              <div className="space-y-3">
                <Typography variant="caption" className="font-semibold">
                  Vista previa de aplicación (FIFO)
                </Typography>
                <Card className="overflow-hidden">
                  <div className="divide-y divide-default-200">
                    {fifoAllocations.map((alloc, idx) => (
                      <div key={alloc.chargeId} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${alloc.fullyCovered ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <Typography className="truncate text-sm font-medium">
                              {alloc.description ?? `Cargo - ${alloc.period}`}
                            </Typography>
                            <Typography variant="caption" color="muted">
                              {alloc.period} — Pendiente: {formatAmount(alloc.chargeBalance)}
                            </Typography>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <Typography className={`text-sm font-semibold ${alloc.fullyCovered ? 'text-success-600' : 'text-warning-600'}`}>
                              {formatAmount(alloc.allocated)}
                            </Typography>
                            {alloc.fullyCovered && (
                              <Typography variant="caption" color="muted" className="text-success-500">
                                Cubierto
                              </Typography>
                            )}
                          </div>
                          {alloc.fullyCovered ? (
                            <CheckCircle2 className="h-4 w-4 text-success-500" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-warning-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const totalAllocated = fifoAllocations.reduce((sum, a) => sum + parseFloat(a.allocated), 0)
                    const payAmount = parseFloat(state.amount)
                    const surplus = payAmount - totalAllocated
                    return surplus > 0.005 ? (
                      <div className="border-t border-default-200 bg-primary-50 px-4 py-2">
                        <Typography variant="caption" className="text-primary-700">
                          Excedente a favor: {formatAmount(surplus.toFixed(2))}
                        </Typography>
                      </div>
                    ) : null
                  })()}
                </Card>
              </div>
            )}

            {/* Payment method selection */}
            <Typography variant="caption" className="font-semibold">Método de pago</Typography>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(METHOD_LABELS).map(([method, label]) => {
                const Icon = METHOD_ICONS[method] ?? CircleDot
                return (
                  <Card
                    key={method}
                    isPressable
                    className={state.paymentMethod === method ? 'border-primary border-2' : ''}
                    onPress={() => update({ paymentMethod: method })}
                  >
                    <CardBody className="flex flex-col items-center gap-2 p-3">
                      <Icon className={`h-6 w-6 ${state.paymentMethod === method ? 'text-primary' : 'text-default-400'}`} />
                      <Typography variant="caption" className="text-center">{label}</Typography>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </div>
        )

      case 'details':
        return (
          <div className="space-y-5">
            <Typography variant="caption" className="font-semibold">
              Detalles del pago
            </Typography>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                isRequired
                label="Fecha de pago"
                type="date"
                value={state.paymentDate}
                onValueChange={v => update({ paymentDate: v })}
              />
              <Input
                label="N° de referencia"
                placeholder="Ej: 123456789"
                value={state.receiptNumber}
                onValueChange={v => update({ receiptNumber: v })}
              />
            </div>

            <Textarea
              label="Notas (opcional)"
              placeholder="Información adicional del pago"
              value={state.notes}
              onValueChange={v => update({ notes: v })}
              minRows={2}
            />
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-5">
            <Typography variant="caption" className="font-semibold">
              Revisa los datos antes de enviar
            </Typography>

            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Typography color="muted">Unidad</Typography>
                  <Typography className="font-medium">
                    {unitOptions.find(u => u.unitId === state.unitId)?.unitNumber ?? '-'}
                  </Typography>
                </div>
                <div className="flex justify-between">
                  <Typography color="muted">Método</Typography>
                  <Typography className="font-medium">
                    {METHOD_LABELS[state.paymentMethod] ?? state.paymentMethod}
                  </Typography>
                </div>
                <div className="flex justify-between">
                  <Typography color="muted">Fecha</Typography>
                  <Typography className="font-medium">{state.paymentDate}</Typography>
                </div>
                {state.receiptNumber && (
                  <div className="flex justify-between">
                    <Typography color="muted">Referencia</Typography>
                    <Typography className="font-medium">{state.receiptNumber}</Typography>
                  </div>
                )}
                <hr />
                <div className="flex justify-between">
                  <Typography className="font-semibold">Monto a pagar</Typography>
                  <Typography className="text-xl font-bold text-primary">
                    {formatAmount(state.amount)}
                  </Typography>
                </div>
              </div>
            </Card>

            {/* FIFO summary in confirm step */}
            {fifoAllocations.length > 0 && (
              <Card className="p-4">
                <Typography variant="caption" className="mb-2 font-semibold">
                  Cargos que se cubrirán (FIFO)
                </Typography>
                <div className="space-y-2">
                  {fifoAllocations.map(alloc => (
                    <div key={alloc.chargeId} className="flex justify-between text-sm">
                      <Typography variant="caption">
                        {alloc.description ?? `Cargo - ${alloc.period}`}
                      </Typography>
                      <Typography variant="caption" className={alloc.fullyCovered ? 'text-success-600 font-medium' : 'text-warning-600 font-medium'}>
                        {formatAmount(alloc.allocated)}{alloc.fullyCovered ? '' : ' (parcial)'}
                      </Typography>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="bg-warning-50 p-4">
              <Typography variant="caption" color="muted">
                Al enviar, tu pago quedará pendiente de verificación por parte del administrador.
                Se aplicará automáticamente a tus cargos más antiguos (FIFO) una vez verificado.
              </Typography>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  // ─── Result Step ───
  if (currentStep === 3 && result) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        {result.success ? (
          <CheckCircle2 className="h-16 w-16 text-success" />
        ) : (
          <XCircle className="h-16 w-16 text-danger" />
        )}
        <Typography variant="h3" className="text-center">
          {result.success ? 'Pago Reportado' : 'Error'}
        </Typography>
        <Typography color="muted" className="text-center max-w-md">
          {result.message}
        </Typography>
        <Button color="primary" onPress={handleReset}>
          {result.success ? 'Reportar otro pago' : 'Intentar de nuevo'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        hideLabelsOnMobile
        color="primary"
        currentStep={STEPS[currentStep]!}
        steps={STEP_ITEMS}
        onStepChange={key => {
          const idx = STEPS.indexOf(key)
          if (idx >= 0 && idx < currentStep) setCurrentStep(idx)
        }}
      />

      <Card>
        <CardBody className="p-4 sm:p-6">
          {renderStep()}
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        {currentStep > 0 && (
          <Button variant="bordered" onPress={handleBack}>Anterior</Button>
        )}
        <Button
          color="primary"
          isDisabled={!canProceed()}
          isLoading={isSubmitting}
          onPress={handleNext}
        >
          {currentStep === 2 ? 'Confirmar Pago' : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}
