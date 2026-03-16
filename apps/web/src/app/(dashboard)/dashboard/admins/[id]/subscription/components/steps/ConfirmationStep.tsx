'use client'

import type { ISubscriptionFormData } from '../../hooks'

import { DollarSign, Calendar, HardDrive, Users, Building2, Home, Check } from 'lucide-react'
import { formatCurrency } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

import { Card, CardBody } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { useTranslation } from '@/contexts'

interface ConfirmationStepProps {
  data: ISubscriptionFormData
}

export function ConfirmationStep({ data }: ConfirmationStepProps) {
  const { t } = useTranslation()

  const formatDate = (date: string) => {
    if (!date) return '-'

    return formatFullDate(date)
  }

  const getBillingCycleLabel = (cycle: string) => {
    return t(`superadmin.companies.subscription.form.billingCycles.${cycle}`)
  }

  const getStatusLabel = (status: string) => {
    return t(`superadmin.companies.subscription.form.statuses.${status}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'primary'
      case 'inactive':
        return 'default'
      default:
        return 'default'
    }
  }

  const enabledFeatures = Object.entries(data.customFeatures).filter(([, enabled]) => enabled)

  const featureLabels: Record<string, string> = {
    reportes_avanzados: t('superadmin.companies.subscription.form.features.reportes_avanzados'),
    notificaciones_push: t('superadmin.companies.subscription.form.features.notificaciones_push'),
    soporte_prioritario: t('superadmin.companies.subscription.form.features.soporte_prioritario'),
    api_access: t('superadmin.companies.subscription.form.features.api_access'),
    backup_automatico: t('superadmin.companies.subscription.form.features.backup_automatico'),
    multi_moneda: t('superadmin.companies.subscription.form.features.multi_moneda'),
    integracion_bancaria: t('superadmin.companies.subscription.form.features.integracion_bancaria'),
    facturacion_electronica: t(
      'superadmin.companies.subscription.form.features.facturacion_electronica'
    ),
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Typography variant="subtitle2">
          {t('superadmin.companies.subscription.form.confirmation.title')}
        </Typography>
        <Typography color="muted" variant="caption">
          {t('superadmin.companies.subscription.form.confirmation.description')}
        </Typography>
      </div>

      {/* Subscription Info Card */}
      <Card className="border border-default-200" shadow="none">
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="subtitle2">
              {t('superadmin.companies.subscription.form.confirmation.subscriptionInfo')}
            </Typography>
            <Chip color={getStatusColor(data.status)} size="sm" variant="flat">
              {getStatusLabel(data.status)}
            </Chip>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Typography color="muted" variant="caption">
                {t('superadmin.companies.subscription.form.fields.subscriptionName')}
              </Typography>
              <Typography variant="body2">{data.subscriptionName || '-'}</Typography>
            </div>

            <div className="space-y-1">
              <Typography color="muted" variant="caption">
                {t('superadmin.companies.subscription.form.fields.billingCycle')}
              </Typography>
              <Typography variant="body2">{getBillingCycleLabel(data.billingCycle)}</Typography>
            </div>

            <div className="space-y-1">
              <Typography color="muted" variant="caption">
                {t('superadmin.companies.subscription.form.fields.basePrice')}
              </Typography>
              <div className="flex items-center gap-1">
                <DollarSign className="text-success" size={14} />
                <Typography className="font-semibold" variant="body2">
                  {formatCurrency(data.basePrice)}
                </Typography>
              </div>
            </div>

            <div className="space-y-1">
              <Typography color="muted" variant="caption">
                {t('superadmin.companies.subscription.form.fields.autoRenew')}
              </Typography>
              <Typography variant="body2">
                {data.autoRenew ? t('common.yes') : t('common.no')}
              </Typography>
            </div>

            <div className="space-y-1">
              <Typography color="muted" variant="caption">
                {t('superadmin.companies.subscription.form.fields.startDate')}
              </Typography>
              <div className="flex items-center gap-1">
                <Calendar className="text-default-400" size={14} />
                <Typography variant="body2">{formatDate(data.startDate)}</Typography>
              </div>
            </div>

            {data.endDate && (
              <div className="space-y-1">
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.subscription.form.fields.endDate')}
                </Typography>
                <div className="flex items-center gap-1">
                  <Calendar className="text-default-400" size={14} />
                  <Typography variant="body2">{formatDate(data.endDate)}</Typography>
                </div>
              </div>
            )}

            {data.status === 'trial' && data.trialEndsAt && (
              <div className="space-y-1">
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.subscription.form.fields.trialEndsAt')}
                </Typography>
                <div className="flex items-center gap-1">
                  <Calendar className="text-warning" size={14} />
                  <Typography variant="body2">{formatDate(data.trialEndsAt)}</Typography>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Limits Card */}
      <Card className="border border-default-200" shadow="none">
        <CardBody className="space-y-4">
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.confirmation.limitsInfo')}
          </Typography>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg bg-default-50 p-3">
              <Building2 className="text-primary" size={20} />
              <div>
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.subscription.form.fields.maxCondominiums')}
                </Typography>
                <Typography className="font-semibold" variant="body2">
                  {data.maxCondominiums ||
                    t('superadmin.companies.subscription.form.confirmation.unlimited')}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-default-50 p-3">
              <Home className="text-secondary" size={20} />
              <div>
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.subscription.form.fields.maxUnits')}
                </Typography>
                <Typography className="font-semibold" variant="body2">
                  {data.maxUnits ||
                    t('superadmin.companies.subscription.form.confirmation.unlimited')}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-default-50 p-3">
              <Users className="text-primary" size={20} />
              <div>
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.subscription.form.fields.maxUsers')}
                </Typography>
                <Typography className="font-semibold" variant="body2">
                  {data.maxUsers ||
                    t('superadmin.companies.subscription.form.confirmation.unlimited')}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-default-50 p-3">
              <HardDrive className="text-primary" size={20} />
              <div>
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.subscription.form.fields.maxStorageGb')}
                </Typography>
                <Typography className="font-semibold" variant="body2">
                  {data.maxStorageGb
                    ? `${data.maxStorageGb} GB`
                    : t('superadmin.companies.subscription.form.confirmation.unlimited')}
                </Typography>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Features Card */}
      {enabledFeatures.length > 0 && (
        <Card className="border border-default-200" shadow="none">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="subtitle2">
                {t('superadmin.companies.subscription.form.confirmation.featuresInfo')}
              </Typography>
              <Chip color="success" size="sm" variant="flat">
                {enabledFeatures.length}{' '}
                {t('superadmin.companies.subscription.form.confirmation.enabled')}
              </Chip>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {enabledFeatures.map(([key]) => (
                <div key={key} className="flex items-center gap-2">
                  <Check className="text-success" size={14} />
                  <Typography variant="body2">
                    {featureLabels[key] ||
                      key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pricing Notes */}
      {data.pricingNotes && (
        <Card className="border border-default-200" shadow="none">
          <CardBody className="space-y-2">
            <Typography variant="subtitle2">
              {t('superadmin.companies.subscription.form.sections.pricingNotes')}
            </Typography>
            <Typography color="muted" variant="body2">
              {data.pricingNotes}
            </Typography>
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      {data.notes && (
        <Card className="border border-default-200" shadow="none">
          <CardBody className="space-y-2">
            <Typography variant="subtitle2">
              {t('superadmin.companies.subscription.form.sections.notes')}
            </Typography>
            <Typography color="muted" variant="body2">
              {data.notes}
            </Typography>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
