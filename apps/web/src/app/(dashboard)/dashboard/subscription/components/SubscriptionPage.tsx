import type { TManagementCompanySubscription } from '@packages/domain'
import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'
import { CreditCard, Calendar, Clock, RefreshCw, FileText, AlertTriangle } from 'lucide-react'
import {
  getMyCompanySubscription,
  getMyCompanyUsageStats,
  type TManagementCompanyUsageStats,
} from '@packages/http-client'
import { formatCurrency } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

import { AdminCancelSubscriptionButton } from './AdminCancelSubscriptionButton'

import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Progress } from '@/ui/components/progress'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession, getServerAuthToken } from '@/libs/session'

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
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

export async function SubscriptionPage() {
  const [{ t }, session, token] = await Promise.all([
    getTranslations(),
    getFullSession(),
    getServerAuthToken(),
  ])

  const companyId = session.managementCompanies?.[0]?.managementCompanyId

  if (!companyId || !token) {
    redirect('/dashboard')
  }

  let subscription: TManagementCompanySubscription | null = null
  let usageStats: TManagementCompanyUsageStats | null = null

  try {
    ;[subscription, usageStats] = await Promise.all([
      getMyCompanySubscription(token, companyId),
      getMyCompanyUsageStats(token, companyId),
    ])
  } catch {
    // If API fails, show empty state
  }

  const tp = 'admin.subscription'

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      {subscription ? (
        <Card className="p-6">
          {/* Plan Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="text-primary" size={24} />
              </div>
              <div>
                <Typography className="text-xl" variant="h3">
                  {subscription.subscriptionName || t(`${tp}.currentPlan`)}
                </Typography>
                <Chip
                  color={statusColorMap[subscription.status] || 'default'}
                  size="sm"
                  variant="flat"
                >
                  {t(`${tp}.status.${subscription.status}`)}
                </Chip>
              </div>
            </div>
            {(subscription.status === 'active' || subscription.status === 'trial') && (
              <AdminCancelSubscriptionButton
                companyId={companyId}
                subscriptionName={subscription.subscriptionName}
              />
            )}
          </div>

          {/* Pricing */}
          <div className="mb-6">
            <Typography color="muted" variant="caption">
              {t(`${tp}.price`)}
            </Typography>
            <div className="flex items-baseline gap-2">
              <Typography className="text-3xl font-bold" variant="h2">
                {formatCurrency(subscription.basePrice)}
              </Typography>
              <Typography color="muted" variant="body2">
                / {billingCycleLabels[subscription.billingCycle] || subscription.billingCycle}
              </Typography>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
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

          {/* Limits & Usage */}
          {usageStats && (
            <div className="space-y-4">
              <Typography
                className="text-sm font-semibold uppercase tracking-wide text-default-500"
                variant="h4"
              >
                {t(`${tp}.limits`)}
              </Typography>

              {[
                {
                  label: t(`${tp}.condominiums`),
                  current: usageStats.condominiumsCount,
                  max: subscription.maxCondominiums ?? 0,
                },
                {
                  label: t(`${tp}.units`),
                  current: usageStats.unitsCount,
                  max: subscription.maxUnits ?? 0,
                },
                {
                  label: t(`${tp}.users`),
                  current: usageStats.usersCount,
                  max: subscription.maxUsers ?? 0,
                },
                {
                  label: t(`${tp}.storage`),
                  current: usageStats.storageGb ?? 0,
                  max: subscription.maxStorageGb ?? 0,
                },
              ].map(({ label, current, max }) => {
                const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0
                const isNearLimit = percentage >= 80

                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-default-600">{label}</span>
                      <span
                        className={isNearLimit ? 'text-warning font-medium' : 'text-default-500'}
                      >
                        {current.toLocaleString()} / {max.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      color={isNearLimit ? 'warning' : 'primary'}
                      size="sm"
                      value={percentage}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Features */}
          {subscription.customFeatures && typeof subscription.customFeatures === 'object' && (
            <div className="mt-6 space-y-2">
              <Typography
                className="text-sm font-semibold uppercase tracking-wide text-default-500"
                variant="h4"
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
            <div className="mt-6">
              <InfoRow
                icon={<FileText className="text-default-400" size={18} />}
                label={t(`${tp}.notes`)}
                value={subscription.notes}
              />
            </div>
          )}

          {/* Cancellation Info */}
          {subscription.cancelledAt && (
            <div className="mt-6 rounded-lg bg-warning-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-warning" size={18} />
                <Typography className="font-medium text-warning-700" variant="body2">
                  {t(`${tp}.cancelledInfo`)}
                </Typography>
              </div>
              <Typography color="muted" variant="caption">
                {t(`${tp}.cancelledAt`)}: {formatFullDate(subscription.cancelledAt)}
              </Typography>
              {subscription.cancellationReason && (
                <Typography className="mt-1" color="muted" variant="caption">
                  {t(`${tp}.cancellationReason`)}: {subscription.cancellationReason}
                </Typography>
              )}
            </div>
          )}
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16 px-6">
          <CreditCard className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t(`${tp}.noPlan`)}
          </Typography>
          <Typography className="mt-1 text-center" color="muted" variant="body2">
            {t(`${tp}.noPlanDescription`)}
          </Typography>
        </Card>
      )}
    </div>
  )
}
