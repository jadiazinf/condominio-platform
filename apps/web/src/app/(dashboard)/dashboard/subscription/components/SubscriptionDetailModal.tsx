'use client'

import { CreditCard, Calendar, Clock, RefreshCw, FileText, AlertTriangle } from 'lucide-react'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import type { TManagementCompanySubscription } from '@packages/domain'
import { formatCurrency } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <Typography color="muted" variant="caption">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </div>
    </div>
  )
}

const statusColorMap: Record<string, 'success' | 'primary' | 'default' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'primary',
  inactive: 'default',
  cancelled: 'warning',
  suspended: 'danger',
}

const billingCycleLabels: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual',
  custom: 'Personalizado',
}

interface SubscriptionDetailModalProps {
  subscription: TManagementCompanySubscription | null
  isOpen: boolean
  onClose: () => void
}

export function SubscriptionDetailModal({
  subscription,
  isOpen,
  onClose,
}: SubscriptionDetailModalProps) {
  const { t } = useTranslation()
  const tp = 'admin.subscription'

  if (!subscription) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <CreditCard className="text-primary" size={20} />
          {t(`${tp}.detail.title`)}
        </ModalHeader>
        <ModalBody className="space-y-4 pb-6">
          {/* Plan Name + Status */}
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="text-xl">
              {subscription.subscriptionName || 'Plan'}
            </Typography>
            <Chip color={statusColorMap[subscription.status] || 'default'} variant="flat">
              {t(`${tp}.status.${subscription.status}`)}
            </Chip>
          </div>

          {/* Pricing */}
          <div>
            <Typography color="muted" variant="caption">
              {t(`${tp}.price`)}
            </Typography>
            <div className="flex items-baseline gap-2">
              <Typography variant="h2" className="text-2xl font-bold">
                {formatCurrency(subscription.basePrice)}
              </Typography>
              <Typography color="muted" variant="body2">
                / {billingCycleLabels[subscription.billingCycle] || subscription.billingCycle}
              </Typography>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <InfoRow
              icon={<Calendar className="text-primary" size={18} />}
              label={t(`${tp}.startDate`)}
              value={formatFullDate(subscription.startDate)}
            />
            {subscription.endDate && (
              <InfoRow
                icon={<Calendar className="text-danger" size={18} />}
                label={t(`${tp}.endDate`)}
                value={formatFullDate(subscription.endDate)}
              />
            )}
            {subscription.nextBillingDate && (
              <InfoRow
                icon={<Clock className="text-warning" size={18} />}
                label={t(`${tp}.nextBilling`)}
                value={formatFullDate(subscription.nextBillingDate)}
              />
            )}
            {subscription.trialEndsAt && (
              <InfoRow
                icon={<Clock className="text-primary" size={18} />}
                label={t(`${tp}.trialEnds`)}
                value={formatFullDate(subscription.trialEndsAt)}
              />
            )}
            <InfoRow
              icon={<RefreshCw className="text-default-500" size={18} />}
              label={t(`${tp}.autoRenew`)}
              value={subscription.autoRenew ? t(`${tp}.yes`) : t(`${tp}.no`)}
            />
          </div>

          {/* Limits */}
          <div className="space-y-2">
            <Typography
              variant="h4"
              className="text-sm font-semibold uppercase tracking-wide text-default-500"
            >
              {t(`${tp}.limits`)}
            </Typography>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="text-sm">
                <span className="text-default-500">{t(`${tp}.condominiums`)}:</span>{' '}
                <span className="font-medium">
                  {subscription.maxCondominiums?.toLocaleString()}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-default-500">{t(`${tp}.units`)}:</span>{' '}
                <span className="font-medium">{subscription.maxUnits?.toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="text-default-500">{t(`${tp}.users`)}:</span>{' '}
                <span className="font-medium">{subscription.maxUsers?.toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="text-default-500">{t(`${tp}.storage`)}:</span>{' '}
                <span className="font-medium">
                  {subscription.maxStorageGb?.toLocaleString()} GB
                </span>
              </div>
            </div>
          </div>

          {/* Features */}
          {subscription.customFeatures && typeof subscription.customFeatures === 'object' && (
            <div className="space-y-2">
              <Typography
                variant="h4"
                className="text-sm font-semibold uppercase tracking-wide text-default-500"
              >
                {t(`${tp}.features`)}
              </Typography>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(subscription.customFeatures as Record<string, boolean>).map(
                  ([key, enabled]) =>
                    enabled && (
                      <div key={key} className="flex items-center gap-2 text-sm text-default-600">
                        <span className="text-success">✓</span>
                        {key.replace(/_/g, ' ')}
                      </div>
                    )
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {subscription.notes && (
            <InfoRow
              icon={<FileText className="text-default-400" size={18} />}
              label={t(`${tp}.notes`)}
              value={subscription.notes}
            />
          )}

          {/* Cancellation Info */}
          {subscription.cancelledAt && (
            <div className="rounded-lg bg-warning-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-warning" size={18} />
                <Typography variant="body2" className="font-medium text-warning-700">
                  {t(`${tp}.cancelledInfo`)}
                </Typography>
              </div>
              <Typography variant="caption" color="muted">
                {t(`${tp}.cancelledAt`)}: {formatFullDate(subscription.cancelledAt)}
              </Typography>
              {subscription.cancellationReason && (
                <Typography variant="caption" color="muted" className="mt-1 block">
                  {t(`${tp}.cancellationReason`)}: {subscription.cancellationReason}
                </Typography>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
