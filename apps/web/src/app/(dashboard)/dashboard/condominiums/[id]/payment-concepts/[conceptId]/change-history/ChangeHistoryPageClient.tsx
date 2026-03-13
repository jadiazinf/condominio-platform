'use client'

import { History, FileText, User, StickyNote } from 'lucide-react'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import {
  usePaymentConceptDetail,
  usePaymentConceptChangeHistory,
} from '@packages/http-client'

interface ChangeHistoryPageClientProps {
  condominiumId: string
  conceptId: string
  managementCompanyId: string
}

// Human-readable labels for field keys
const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripcion',
  conceptType: 'Tipo',
  currencyId: 'Moneda',
  isRecurring: 'Recurrente',
  recurrencePeriod: 'Periodo',
  effectiveFrom: 'Vigente desde',
  effectiveUntil: 'Vigente hasta',
  issueDay: 'Dia de emision',
  dueDay: 'Dia de vencimiento',
  allowsPartialPayment: 'Pago parcial',
  latePaymentType: 'Tipo mora',
  latePaymentValue: 'Valor mora',
  latePaymentGraceDays: 'Dias de gracia',
  earlyPaymentType: 'Tipo descuento',
  earlyPaymentValue: 'Valor descuento',
  earlyPaymentDaysBeforeDue: 'Dias antes del vencimiento',
  amount: 'Monto',
  scopeType: 'Alcance',
  distributionMethod: 'Metodo de distribucion',
  services: 'Servicios',
  bankAccounts: 'Cuentas bancarias',
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.length === 0 ? '-' : `${value.length} items`
  return JSON.stringify(value)
}

export function ChangeHistoryPageClient({
  conceptId,
  managementCompanyId,
}: ChangeHistoryPageClientProps) {
  const { t } = useTranslation()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'

  const { data: conceptData } = usePaymentConceptDetail({
    companyId: managementCompanyId,
    conceptId,
    enabled: !!conceptId && !!managementCompanyId,
  })

  const { data: changeHistoryData, isLoading } = usePaymentConceptChangeHistory({
    companyId: managementCompanyId,
    conceptId,
    enabled: !!conceptId && !!managementCompanyId,
  })

  const concept = conceptData?.data
  const changes = changeHistoryData?.data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <History className="text-default-500" size={22} />
        <div>
          <Typography color="muted" variant="body2">
            {t(`${d}.changeHistory`)}
          </Typography>
          <Typography variant="h3">{concept?.name ?? ''}</Typography>
        </div>
      </div>

      {/* Timeline */}
      {!Array.isArray(changes) || changes.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <History className="mx-auto mb-3 text-default-300" size={40} />
            <Typography color="muted" variant="body2">
              {t(`${d}.noChanges`)}
            </Typography>
          </CardBody>
        </Card>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-default-200" />

          {changes.map((change: any, index: number) => {
            const changedFields = Object.keys(change.newValues ?? {})
            const date = new Date(change.createdAt)

            return (
              <div key={change.id} className="relative pl-12 pb-6">
                {/* Timeline dot */}
                <div className="absolute left-3.5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />

                <Card>
                  <CardBody className="space-y-3">
                    {/* Date & meta */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat" color="default">
                          {date.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Chip>
                        <span className="text-xs text-default-400">
                          {date.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <Chip size="sm" variant="flat" color="primary">
                        {changedFields.length} {changedFields.length === 1 ? 'campo' : 'campos'}
                      </Chip>
                    </div>

                    {/* Notes */}
                    {change.notes && (
                      <div className="flex items-start gap-2 rounded-lg bg-default-50 p-2">
                        <StickyNote size={14} className="mt-0.5 shrink-0 text-default-400" />
                        <p className="text-sm text-default-600 italic">{change.notes}</p>
                      </div>
                    )}

                    {/* Changed fields table */}
                    <div className="overflow-hidden rounded-lg border border-default-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-default-50">
                            <th className="px-3 py-2 text-left text-xs font-medium text-default-500">
                              Campo
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-default-500">
                              Anterior
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-default-500">
                              Nuevo
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-default-100">
                          {changedFields.map((key) => (
                            <tr key={key}>
                              <td className="px-3 py-2 font-medium text-default-700">
                                {FIELD_LABELS[key] ?? key}
                              </td>
                              <td className="px-3 py-2 text-danger-500 line-through">
                                {formatValue(change.previousValues?.[key])}
                              </td>
                              <td className="px-3 py-2 text-success-600 font-medium">
                                {formatValue(change.newValues?.[key])}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
