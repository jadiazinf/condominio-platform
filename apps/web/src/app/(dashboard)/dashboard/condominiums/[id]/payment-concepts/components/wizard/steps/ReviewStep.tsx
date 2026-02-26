'use client'

import { useMemo } from 'react'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'
import { Switch } from '@/ui/components/switch'
import { useTranslation } from '@/contexts'
import { useMyCompanyBankAccountsPaginated } from '@packages/http-client'
import type { IWizardFormData } from '../CreatePaymentConceptWizard'

interface ReviewStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  currencies: Array<{ id: string; code: string }>
  buildings: Array<{ id: string; name: string }>
  managementCompanyId: string
}

export function ReviewStep({ formData, onUpdate, currencies, buildings, managementCompanyId }: ReviewStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.review'

  const currencyCode = currencies.find(c => c.id === formData.currencyId)?.code || ''

  // Fetch bank accounts (already cached from BankAccountsStep)
  const { data: bankAccountsData } = useMyCompanyBankAccountsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 50, isActive: true },
    enabled: !!managementCompanyId,
  })

  const selectedBankAccounts = useMemo(() => {
    const all = bankAccountsData?.data ?? []
    return all.filter(a => formData.bankAccountIds.includes(a.id))
  }, [bankAccountsData, formData.bankAccountIds])

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maintenance: t('admin.paymentConcepts.types.maintenance'),
      condominium_fee: t('admin.paymentConcepts.types.condominiumFee'),
      extraordinary: t('admin.paymentConcepts.types.extraordinary'),
      fine: t('admin.paymentConcepts.types.fine'),
      reserve_fund: t('admin.paymentConcepts.types.reserveFund'),
      other: t('admin.paymentConcepts.types.other'),
    }
    return labels[type] || type
  }

  const getMethodLabel = (method: string) => {
    const aw = 'admin.condominiums.detail.paymentConcepts.wizard.assignments'
    const labels: Record<string, string> = {
      by_aliquot: t(`${aw}.methodAliquot`),
      equal_split: t(`${aw}.methodEqualSplit`),
      fixed_per_unit: t(`${aw}.methodFixed`),
    }
    return labels[method] || method
  }

  return (
    <div className="flex flex-col gap-5">
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      {/* Basic Info */}
      <Card>
        <CardBody className="space-y-2">
          <Typography variant="body2" className="font-semibold">
            {t(`${w}.basicInfo`)}
          </Typography>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-default-500">{t(`${w}.name`)}</span>
            <span className="font-medium">{formData.name}</span>

            <span className="text-default-500">{t(`${w}.type`)}</span>
            <span>{getTypeLabel(formData.conceptType)}</span>

            <span className="text-default-500">{t(`${w}.currency`)}</span>
            <span>{currencyCode}</span>

            <span className="text-default-500">{t(`${w}.recurring`)}</span>
            <span>{formData.isRecurring ? t('common.yes') : t('common.no')}</span>

            {formData.isRecurring && formData.recurrencePeriod && (
              <>
                <span className="text-default-500">{t(`${w}.recurrence`)}</span>
                <span>{t(`admin.paymentConcepts.recurrence.${formData.recurrencePeriod}`)}</span>
              </>
            )}

            {formData.description && (
              <>
                <span className="text-default-500">{t(`${w}.descriptionLabel`)}</span>
                <span>{formData.description}</span>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Charge Config */}
      <Card>
        <CardBody className="space-y-2">
          <Typography variant="body2" className="font-semibold">
            {t(`${w}.chargeConfig`)}
          </Typography>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {formData.isRecurring && (
              <>
                <span className="text-default-500">{t(`${w}.issueDay`)}</span>
                <span>{formData.issueDay || '-'}</span>
                <span className="text-default-500">{t(`${w}.dueDay`)}</span>
                <span>{formData.dueDay || '-'}</span>
              </>
            )}
            <span className="text-default-500">{t(`${w}.partialPayment`)}</span>
            <span>{formData.allowsPartialPayment ? t('common.yes') : t('common.no')}</span>

            {formData.latePaymentType !== 'none' && (
              <>
                <span className="text-default-500">{t(`${w}.lateFee`)}</span>
                <span>
                  {formData.latePaymentType === 'percentage'
                    ? `${formData.latePaymentValue}%`
                    : `${currencyCode} ${formData.latePaymentValue}`}
                  {formData.latePaymentGraceDays
                    ? ` (${formData.latePaymentGraceDays} ${t(`${w}.graceDays`)})`
                    : ''}
                </span>
              </>
            )}

            {formData.earlyPaymentType !== 'none' && (
              <>
                <span className="text-default-500">{t(`${w}.earlyDiscount`)}</span>
                <span>
                  {formData.earlyPaymentType === 'percentage'
                    ? `${formData.earlyPaymentValue}%`
                    : `${currencyCode} ${formData.earlyPaymentValue}`}
                  {formData.earlyPaymentDaysBeforeDue
                    ? ` (${formData.earlyPaymentDaysBeforeDue} ${t(`${w}.daysBefore`)})`
                    : ''}
                </span>
              </>
            )}

            {formData.interestEnabled && (
              <>
                <span className="text-default-500">{t(`${w}.interest`)}</span>
                <span>
                  {formData.interestType === 'simple' ? t(`${w}.interestSimple`) : t(`${w}.interestCompound`)}
                  {' — '}
                  {formData.interestRate}%{' '}
                  {formData.interestCalculationPeriod === 'monthly' ? t(`${w}.interestMonthly`) : t(`${w}.interestDaily`)}
                  {formData.interestGracePeriodDays > 0 &&
                    ` (${formData.interestGracePeriodDays} ${t(`${w}.graceDays`)})`}
                </span>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Services */}
      {formData.services.length > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <Typography variant="body2" className="font-semibold">
              {t('admin.condominiums.detail.services.conceptServices.title')} ({formData.services.length})
            </Typography>
            <Divider />
            {formData.services.map((service, i) => (
              <div key={i} className="flex flex-col gap-1 py-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Typography variant="body2" className="font-medium">
                      {service.serviceName}
                    </Typography>
                    {service.execution && (
                      <Chip size="sm" variant="flat" color="success">
                        {t('admin.condominiums.detail.services.conceptServices.executionRegistered')}
                      </Chip>
                    )}
                  </div>
                  <Typography variant="body2" className="font-semibold">
                    {currencyCode} {service.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </Typography>
                </div>
                {service.execution && (
                  <div className="pl-4 text-xs text-default-500">
                    {service.execution.title}
                    {' — '}
                    {currencyCode} {Number(service.execution.totalAmount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            ))}
            <Divider />
            <div className="flex items-center justify-between">
              <Typography variant="body2" className="font-semibold">
                {t('admin.condominiums.detail.services.conceptServices.total')}
              </Typography>
              <Typography variant="body1" className="font-bold">
                {currencyCode} {formData.services.reduce((sum, s) => sum + s.amount, 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </Typography>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Assignments */}
      {formData.assignments.length > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <Typography variant="body2" className="font-semibold">
              {t(`${w}.assignments`)} ({formData.assignments.length})
            </Typography>
            <Divider />
            {formData.assignments.map((a, i) => {
              const aw = 'admin.condominiums.detail.paymentConcepts.wizard.assignments'
              let scopeLabel: string
              if (a.scopeType === 'unit') {
                scopeLabel = t(`${aw}.unitsSelected`, { count: String(a.unitIds?.length ?? 0) })
              } else if (a.scopeType === 'building') {
                scopeLabel = buildings.find(b => b.id === a.buildingId)?.name || a.scopeType
              } else {
                scopeLabel = t(`${aw}.scopeCondominium`)
              }

              return (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat" color="primary">
                      {scopeLabel}
                    </Chip>
                    <Chip size="sm" variant="flat" color="secondary">
                      {getMethodLabel(a.distributionMethod)}
                    </Chip>
                  </div>
                  <Typography variant="body2" className="font-semibold">
                    {currencyCode} {a.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </Typography>
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      {/* Bank Accounts */}
      {formData.bankAccountIds.length > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <Typography variant="body2" className="font-semibold">
              {t(`${w}.bankAccounts`)} ({formData.bankAccountIds.length})
            </Typography>
            <Divider />
            {selectedBankAccounts.map(account => (
              <div key={account.id} className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <Typography variant="body2" className="font-medium">
                    {account.displayName || account.bankName}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {account.bankName}
                  </Typography>
                </div>
                <Chip size="sm" variant="flat" color="default">
                  {account.currency}
                </Chip>
              </div>
            ))}
            {selectedBankAccounts.length === 0 && formData.bankAccountIds.length > 0 && (
              <Typography variant="caption" color="muted">
                {t(`${w}.bankAccountsSelected`)}
              </Typography>
            )}
          </CardBody>
        </Card>
      )}

      {/* Notification Switch */}
      <Card>
        <CardBody className="flex flex-row items-center justify-between gap-4">
          <div>
            <Typography variant="body2" className="font-semibold">
              {t(`${w}.notifyTitle`)}
            </Typography>
            <Typography variant="caption" color="muted">
              {formData.notifyImmediately
                ? t(`${w}.notifyDescriptionOn`)
                : t(`${w}.notifyDescriptionOff`)}
            </Typography>
          </div>
          <Switch
            isSelected={formData.notifyImmediately}
            onValueChange={(value) => onUpdate({ notifyImmediately: value })}
            color="primary"
          />
        </CardBody>
      </Card>
    </div>
  )
}
