'use client'

import type { IConceptPreviewData } from '@packages/http-client/hooks'

import { useConceptPreview } from '@packages/http-client/hooks'
import { formatAmount } from '@packages/utils/currency'
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  BadgePercent,
  DollarSign,
  Info,
  Repeat,
  CreditCard,
} from 'lucide-react'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { Divider } from '@/ui/components/divider'

export interface ConceptPreviewTranslations {
  title: string
  close: string
  // Concept fields
  description: string
  conceptType: string
  currency: string
  recurrence: string
  generationStrategy: string
  allowsPartialPayment: string
  // Schedule
  scheduleTitle: string
  issueDay: string
  dueDay: string
  effectiveFrom: string
  effectiveUntil: string
  // Late payment
  latePaymentTitle: string
  latePaymentType: string
  latePaymentValue: string
  latePaymentGraceDays: string
  // Early payment
  earlyPaymentTitle: string
  earlyPaymentType: string
  earlyPaymentValue: string
  earlyPaymentDaysBeforeDue: string
  // Amount
  amountTitle: string
  totalAmount: string
  unitAmount: string
  assignmentScope: string
  distributionMethod: string
  noAssignment: string
  // Labels
  yes: string
  no: string
  notConfigured: string
  conceptTypes: Record<string, string>
  recurrencePeriods: Record<string, string>
  strategies: Record<string, string>
  scopes: Record<string, string>
  distributions: Record<string, string>
  adjustmentTypes: Record<string, string>
}

interface ConceptPreviewPanelProps {
  isOpen: boolean
  onClose: () => void
  unitId: string
  conceptId: string
  translations: ConceptPreviewTranslations
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-default/10 text-default-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <Typography className="text-xs" color="muted" variant="body2">
          {label}
        </Typography>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  )
}

export function ConceptPreviewPanel({
  isOpen,
  onClose,
  unitId,
  conceptId,
  translations: t,
}: ConceptPreviewPanelProps) {
  const { data, isLoading } = useConceptPreview(unitId, conceptId, {
    enabled: isOpen && !!conceptId,
  })
  const preview = data?.data

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t.title}</Typography>
        </ModalHeader>
        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !preview ? (
            <Typography color="muted" variant="body2">
              No data available
            </Typography>
          ) : (
            <ConceptPreviewContent preview={preview} t={t} />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            {t.close}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function ConceptPreviewContent({
  preview,
  t,
}: {
  preview: IConceptPreviewData
  t: ConceptPreviewTranslations
}) {
  const c = preview.concept
  const sym = c.currency?.symbol || c.currency?.code || '$'

  const hasLatePayment = c.latePaymentType !== 'none'
  const hasEarlyPayment = c.earlyPaymentType !== 'none'

  const formatAdjustmentValue = (type: string, value: number | null) => {
    if (!value) return '-'

    return type === 'percentage' ? `${value}%` : `${sym} ${formatAmount(value)}`
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Basic Info */}
      <Typography className="font-semibold" variant="body1">
        {c.name}
      </Typography>
      {c.description && (
        <Typography className="mb-2" color="muted" variant="body2">
          {c.description}
        </Typography>
      )}

      <div className="grid grid-cols-2 gap-x-4">
        <InfoRow
          icon={<Info size={14} />}
          label={t.conceptType}
          value={
            <Chip size="sm" variant="flat">
              {t.conceptTypes[c.conceptType] || c.conceptType}
            </Chip>
          }
        />
        <InfoRow
          icon={<DollarSign size={14} />}
          label={t.currency}
          value={c.currency ? `${c.currency.name} (${c.currency.code})` : c.currencyId}
        />
        <InfoRow
          icon={<Repeat size={14} />}
          label={t.recurrence}
          value={
            c.isRecurring
              ? t.recurrencePeriods[c.recurrencePeriod ?? ''] || c.recurrencePeriod || '-'
              : t.no
          }
        />
        <InfoRow
          icon={<Info size={14} />}
          label={t.generationStrategy}
          value={t.strategies[c.chargeGenerationStrategy] || c.chargeGenerationStrategy}
        />
        <InfoRow
          icon={<CreditCard size={14} />}
          label={t.allowsPartialPayment}
          value={c.allowsPartialPayment ? t.yes : t.no}
        />
      </div>

      {/* Amount Section */}
      <Divider className="my-2" />
      <Typography className="font-semibold text-sm" variant="body1">
        {t.amountTitle}
      </Typography>

      {preview.assignment ? (
        <div className="rounded-lg bg-primary/5 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Typography className="text-xs" color="muted" variant="body2">
                {t.assignmentScope}
              </Typography>
              <Chip className="mt-0.5" size="sm" variant="flat">
                {t.scopes[preview.assignment.scopeType] || preview.assignment.scopeType}
              </Chip>
            </div>
            <div>
              <Typography className="text-xs" color="muted" variant="body2">
                {t.distributionMethod}
              </Typography>
              <Chip className="mt-0.5" size="sm" variant="flat">
                {t.distributions[preview.assignment.distributionMethod] ||
                  preview.assignment.distributionMethod}
              </Chip>
            </div>
            <div>
              <Typography className="text-xs" color="muted" variant="body2">
                {t.totalAmount}
              </Typography>
              <Typography className="font-medium" variant="body1">
                {sym} {formatAmount(preview.assignment.totalAmount)}
              </Typography>
            </div>
            <div>
              <Typography className="text-xs" color="muted" variant="body2">
                {t.unitAmount}
              </Typography>
              <Typography className="font-semibold text-primary" variant="body1">
                {preview.unitAmount !== null ? `${sym} ${formatAmount(preview.unitAmount)}` : '-'}
              </Typography>
            </div>
          </div>
        </div>
      ) : (
        <Typography className="text-sm" color="danger" variant="body2">
          {t.noAssignment}
        </Typography>
      )}

      {/* Schedule */}
      <Divider className="my-2" />
      <Typography className="font-semibold text-sm" variant="body1">
        {t.scheduleTitle}
      </Typography>

      <div className="grid grid-cols-2 gap-x-4">
        <InfoRow icon={<CalendarDays size={14} />} label={t.issueDay} value={c.issueDay ?? '-'} />
        <InfoRow icon={<CalendarDays size={14} />} label={t.dueDay} value={c.dueDay ?? '-'} />
        {c.effectiveFrom && (
          <InfoRow
            icon={<Clock size={14} />}
            label={t.effectiveFrom}
            value={new Date(c.effectiveFrom).toLocaleDateString('es-VE')}
          />
        )}
        {c.effectiveUntil && (
          <InfoRow
            icon={<Clock size={14} />}
            label={t.effectiveUntil}
            value={new Date(c.effectiveUntil).toLocaleDateString('es-VE')}
          />
        )}
      </div>

      {/* Late Payment */}
      {hasLatePayment && (
        <>
          <Divider className="my-2" />
          <Typography className="font-semibold text-sm text-warning" variant="body1">
            <AlertTriangle className="inline mr-1" size={14} />
            {t.latePaymentTitle}
          </Typography>
          <div className="grid grid-cols-2 gap-x-4">
            <InfoRow
              icon={<Info size={14} />}
              label={t.latePaymentType}
              value={t.adjustmentTypes[c.latePaymentType] || c.latePaymentType}
            />
            <InfoRow
              icon={<DollarSign size={14} />}
              label={t.latePaymentValue}
              value={formatAdjustmentValue(c.latePaymentType, c.latePaymentValue)}
            />
            <InfoRow
              icon={<CalendarDays size={14} />}
              label={t.latePaymentGraceDays}
              value={`${c.latePaymentGraceDays} días`}
            />
          </div>
        </>
      )}

      {/* Early Payment */}
      {hasEarlyPayment && (
        <>
          <Divider className="my-2" />
          <Typography className="font-semibold text-sm text-success" variant="body1">
            <BadgePercent className="inline mr-1" size={14} />
            {t.earlyPaymentTitle}
          </Typography>
          <div className="grid grid-cols-2 gap-x-4">
            <InfoRow
              icon={<Info size={14} />}
              label={t.earlyPaymentType}
              value={t.adjustmentTypes[c.earlyPaymentType] || c.earlyPaymentType}
            />
            <InfoRow
              icon={<DollarSign size={14} />}
              label={t.earlyPaymentValue}
              value={formatAdjustmentValue(c.earlyPaymentType, c.earlyPaymentValue)}
            />
            <InfoRow
              icon={<CalendarDays size={14} />}
              label={t.earlyPaymentDaysBeforeDue}
              value={`${c.earlyPaymentDaysBeforeDue} días`}
            />
          </div>
        </>
      )}

      {/* No late/early payment configured */}
      {!hasLatePayment && !hasEarlyPayment && (
        <>
          <Divider className="my-2" />
          <Typography className="text-sm" color="muted" variant="body2">
            {t.notConfigured}
          </Typography>
        </>
      )}
    </div>
  )
}
