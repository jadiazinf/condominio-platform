'use client'

import type { IWizardFormData } from '../CreatePaymentConceptWizard'

import { useMemo, useEffect } from 'react'
import { useMyCompanyBankAccountsPaginated, useReceipts } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'
import { Switch } from '@/ui/components/switch'
import { Textarea } from '@/ui/components/textarea'
import { useTranslation } from '@/contexts'

interface ReviewStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  currencies: Array<{ id: string; code: string }>
  buildings: Array<{ id: string; name: string }>
  managementCompanyId: string
  isEditMode?: boolean
}

export function ReviewStep({
  formData,
  onUpdate,
  currencies,
  buildings,
  managementCompanyId,
  isEditMode,
}: ReviewStepProps) {
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

  // Check if receipts already exist for the current period
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const { data: receiptsData } = useReceipts({
    periodYear: currentYear,
    periodMonth: currentMonth,
    enabled: !isEditMode,
  })
  const receiptsExist = (receiptsData?.data?.length ?? 0) > 0

  // Auto-disable generateReceipt if receipts already exist
  useEffect(() => {
    if (receiptsExist && formData.generateReceipt) {
      onUpdate({ generateReceipt: false })
    }
  }, [receiptsExist])

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

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-default-500 sm:min-w-[160px] shrink-0">{label}</span>
      <span className="text-sm font-medium text-right sm:text-right">{children}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <Typography color="muted" variant="body2">
        {t(`${w}.description`)}
      </Typography>

      {/* Basic Info */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold" variant="body2">
            {t(`${w}.basicInfo`)}
          </Typography>
          <div className="flex flex-col gap-3">
            <Field label={t(`${w}.name`)}>{formData.name}</Field>
            <Field label={t(`${w}.type`)}>{getTypeLabel(formData.conceptType)}</Field>
            <Field label={t(`${w}.currency`)}>{currencyCode}</Field>
            <Field label={t(`${w}.effectiveFrom`)}>{formData.effectiveFrom || '-'}</Field>
            {formData.effectiveUntil && (
              <Field label={t(`${w}.effectiveUntil`)}>{formData.effectiveUntil}</Field>
            )}
            <Field label={t(`${w}.recurring`)}>
              {formData.isRecurring ? t('common.yes') : t('common.no')}
            </Field>
            {formData.isRecurring && formData.recurrencePeriod && (
              <Field label={t(`${w}.recurrence`)}>
                {t(`admin.paymentConcepts.recurrence.${formData.recurrencePeriod}`)}
              </Field>
            )}
            {formData.isRecurring && (
              <Field label={t(`${w}.chargeGenerationStrategy`)}>
                {formData.chargeGenerationStrategy === 'auto' && t(`${w}.strategyAuto`)}
                {formData.chargeGenerationStrategy === 'bulk' && t(`${w}.strategyBulk`)}
                {formData.chargeGenerationStrategy === 'manual' && t(`${w}.strategyManual`)}
              </Field>
            )}
            {formData.description && (
              <Field label={t(`${w}.descriptionLabel`)}>{formData.description}</Field>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Charge Config */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold" variant="body2">
            {t(`${w}.chargeConfig`)}
          </Typography>
          <div className="flex flex-col gap-3">
            {formData.isRecurring && (
              <>
                <Field label={t(`${w}.issueDay`)}>{formData.issueDay || '-'}</Field>
                <Field label={t(`${w}.dueDay`)}>{formData.dueDay || '-'}</Field>
              </>
            )}
            <Field label={t(`${w}.partialPayment`)}>
              {formData.allowsPartialPayment ? t('common.yes') : t('common.no')}
            </Field>
            {formData.latePaymentType !== 'none' && (
              <Field label={t(`${w}.lateFee`)}>
                {formData.latePaymentType === 'percentage'
                  ? `${formData.latePaymentValue}%`
                  : `${currencyCode} ${formData.latePaymentValue}`}
                {formData.latePaymentGraceDays
                  ? ` (${formData.latePaymentGraceDays} ${t(`${w}.graceDays`)})`
                  : ''}
              </Field>
            )}
            {formData.earlyPaymentType !== 'none' && (
              <Field label={t(`${w}.earlyDiscount`)}>
                {formData.earlyPaymentType === 'percentage'
                  ? `${formData.earlyPaymentValue}%`
                  : `${currencyCode} ${formData.earlyPaymentValue}`}
                {formData.earlyPaymentDaysBeforeDue
                  ? ` (${formData.earlyPaymentDaysBeforeDue} ${t(`${w}.daysBefore`)})`
                  : ''}
              </Field>
            )}
            {formData.interestEnabled && (
              <Field label={t(`${w}.interest`)}>
                {formData.interestType === 'simple'
                  ? t(`${w}.interestSimple`)
                  : t(`${w}.interestCompound`)}
                {' — '}
                {formData.interestRate}%{' '}
                {formData.interestCalculationPeriod === 'monthly'
                  ? t(`${w}.interestMonthly`)
                  : t(`${w}.interestDaily`)}
                {formData.interestGracePeriodDays > 0 &&
                  ` (${formData.interestGracePeriodDays} ${t(`${w}.graceDays`)})`}
              </Field>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Services */}
      {formData.services.length > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t('admin.condominiums.detail.services.conceptServices.title')} (
              {formData.services.length})
            </Typography>
            <Divider />
            {formData.services.map((service, i) => (
              <div key={i} className="flex flex-col gap-1 py-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography className="font-medium" variant="body2">
                      {service.serviceName}
                    </Typography>
                    {service.execution && (
                      <Chip color="success" size="sm" variant="flat">
                        {t(
                          'admin.condominiums.detail.services.conceptServices.executionRegistered'
                        )}
                      </Chip>
                    )}
                  </div>
                  <Typography className="font-semibold" variant="body2">
                    {currencyCode}{' '}
                    {service.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </Typography>
                </div>
                {service.execution && (
                  <div className="pl-4 text-xs text-default-500">
                    {service.execution.title}
                    {' — '}
                    {currencyCode}{' '}
                    {Number(service.execution.totalAmount).toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                    })}
                    {' — '}
                    {service.execution.isTemplate
                      ? t('admin.condominiums.detail.services.detail.dayOfMonth') +
                        `: ${service.execution.executionDay}`
                      : service.execution.executionDate || ''}
                  </div>
                )}
              </div>
            ))}
            <Divider />
            <div className="flex items-center justify-between">
              <Typography className="font-semibold" variant="body2">
                {t('admin.condominiums.detail.services.conceptServices.total')}
              </Typography>
              <Typography className="font-bold" variant="body1">
                {currencyCode}{' '}
                {formData.services
                  .reduce((sum, s) => sum + s.amount, 0)
                  .toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </Typography>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Assignments */}
      {formData.assignments.length > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
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
                <div
                  key={i}
                  className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip color="primary" size="sm" variant="flat">
                      {scopeLabel}
                    </Chip>
                    <Chip color="secondary" size="sm" variant="flat">
                      {getMethodLabel(a.distributionMethod)}
                    </Chip>
                  </div>
                  <Typography className="font-semibold" variant="body2">
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
            <Typography className="font-semibold" variant="body2">
              {t(`${w}.bankAccounts`)} ({formData.bankAccountIds.length})
            </Typography>
            <Divider />
            {selectedBankAccounts.map(account => (
              <div key={account.id} className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <Typography className="font-medium" variant="body2">
                    {account.displayName || account.bankName}
                  </Typography>
                  <Typography color="muted" variant="caption">
                    {account.bankName}
                  </Typography>
                </div>
                <Chip color="default" size="sm" variant="flat">
                  {account.currency}
                </Chip>
              </div>
            ))}
            {selectedBankAccounts.length === 0 && formData.bankAccountIds.length > 0 && (
              <Typography color="muted" variant="caption">
                {t(`${w}.bankAccountsSelected`)}
              </Typography>
            )}
          </CardBody>
        </Card>
      )}

      {/* Change Reason (edit mode only) */}
      {isEditMode && (
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t(`${w}.changeReasonTitle`)}
            </Typography>
            <Typography color="muted" variant="caption">
              {t(`${w}.changeReasonHint`)}
            </Typography>
            <Textarea
              maxLength={5000}
              maxRows={4}
              minRows={2}
              placeholder={t(`${w}.changeReasonPlaceholder`)}
              value={formData.changeReason}
              onValueChange={value => onUpdate({ changeReason: value })}
            />
          </CardBody>
        </Card>
      )}

      {/* Generate Receipt Switch */}
      {!isEditMode && (
        <Card>
          <CardBody className="flex flex-row items-center justify-between gap-4">
            <div>
              <Typography className="font-semibold" variant="body2">
                {t(`${w}.generateReceiptTitle`)}
              </Typography>
              <Typography color="muted" variant="caption">
                {receiptsExist
                  ? t(`${w}.generateReceiptDisabled`)
                  : formData.generateReceipt
                    ? t(`${w}.generateReceiptDescriptionOn`)
                    : t(`${w}.generateReceiptDescriptionOff`)}
              </Typography>
            </div>
            <Switch
              color="primary"
              isDisabled={receiptsExist}
              isSelected={formData.generateReceipt}
              onValueChange={value => onUpdate({ generateReceipt: value })}
            />
          </CardBody>
        </Card>
      )}

      {/* Notification Switch */}
      <Card>
        <CardBody className="flex flex-row items-center justify-between gap-4">
          <div>
            <Typography className="font-semibold" variant="body2">
              {t(`${w}.notifyTitle`)}
            </Typography>
            <Typography color="muted" variant="caption">
              {formData.notifyImmediately
                ? t(`${w}.notifyDescriptionOn`)
                : t(`${w}.notifyDescriptionOff`)}
            </Typography>
          </div>
          <Switch
            color="primary"
            isSelected={formData.notifyImmediately}
            onValueChange={value => onUpdate({ notifyImmediately: value })}
          />
        </CardBody>
      </Card>
    </div>
  )
}
