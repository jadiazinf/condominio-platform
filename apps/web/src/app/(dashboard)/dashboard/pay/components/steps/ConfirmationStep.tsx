'use client'

import type { IPaymentWizardState } from '../PaymentWizardClient'

import { useMemo } from 'react'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'

interface ConfirmationStepProps {
  state: IPaymentWizardState
}

export function ConfirmationStep({ state }: ConfirmationStepProps) {
  const { t } = useTranslation()
  const p = 'resident.pay.confirm'

  // Build quota details for display
  const quotaDetails = useMemo(() => {
    if (!state.validationResult) return []

    return state.validationResult.validatedQuotas.map(vq => {
      // Find the original quota from groups
      const group = state.quotaGroups.find(g => g.quotas.some(q => q.id === vq.quotaId))
      const quota = group?.quotas.find(q => q.id === vq.quotaId)

      return {
        quotaId: vq.quotaId,
        conceptName: group?.concept.name ?? '',
        period: quota?.periodDescription ?? `${quota?.periodMonth}/${quota?.periodYear}`,
        amount: vq.amount,
      }
    })
  }, [state.validationResult, state.quotaGroups])

  const methodLabel = useMemo(() => {
    const methods: Record<string, string> = {
      c2p: t('resident.pay.method.methods.c2p'),
      vpos: t('resident.pay.method.methods.vpos'),
      transfer: t('resident.pay.method.methods.transfer'),
      mobile_payment: t('resident.pay.method.methods.mobile_payment'),
      cash: t('resident.pay.method.methods.cash'),
      other: t('resident.pay.method.methods.other'),
    }

    return methods[state.method] ?? state.method
  }, [state.method, t])

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4">{t(`${p}.title`)}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t(`${p}.subtitle`)}
        </Typography>
      </div>

      {/* Selected quotas */}
      <Card>
        <CardBody className="p-4">
          <Typography className="mb-3 font-medium" variant="body2">
            {t(`${p}.selectedQuotas`)}
          </Typography>
          <div className="space-y-2">
            {quotaDetails.map(detail => (
              <div key={detail.quotaId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-default-700 dark:text-default-300">
                    {detail.conceptName}
                  </span>
                  <span className="mx-2 text-default-400">·</span>
                  <span className="text-default-500">{detail.period}</span>
                </div>
                <span className="font-medium">{parseFloat(detail.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Divider className="my-3" />
          <div className="flex items-center justify-between">
            <Typography className="font-semibold" variant="body2">
              {t(`${p}.total`)}
            </Typography>
            <Typography className="text-lg font-bold text-primary">
              {state.validationResult
                ? `${state.quotaGroups[0]?.concept.currencySymbol ?? ''} ${new Intl.NumberFormat(
                    'es-VE',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ).format(parseFloat(state.validationResult.total))}`
                : '0,00'}
            </Typography>
          </div>
        </CardBody>
      </Card>

      {/* Payment info */}
      <Card>
        <CardBody className="p-4">
          <div className="grid gap-3 text-sm">
            <Field label={t(`${p}.paymentMethod`)} value={methodLabel} />

            {state.selectedBankAccount && (
              <Field
                label={t(`${p}.bankAccount`)}
                value={`${state.selectedBankAccount.bankName} - ${state.selectedBankAccount.displayName}`}
              />
            )}

            {/* C2P details */}
            {state.method === 'c2p' && (
              <>
                <Divider />
                <Typography className="font-medium" variant="body2">
                  {t(`${p}.paymentDetails`)}
                </Typography>
                <Field
                  label={t(`${p}.phone`)}
                  value={`${state.c2pPhoneCountryCode} ${state.c2pPhoneNumber}`}
                />
                <Field label={t(`${p}.bank`)} value={state.c2pBankCode} />
                <Field
                  label={t(`${p}.document`)}
                  value={`${state.c2pDocumentType}-${state.c2pDocumentNumber}`}
                />
              </>
            )}

            {/* VPOS details */}
            {state.method === 'vpos' && (
              <>
                <Divider />
                <Typography className="font-medium" variant="body2">
                  {t(`${p}.paymentDetails`)}
                </Typography>
                <Field label={t(`${p}.cardEnding`)} value={state.vposCardNumber.slice(-4)} />
              </>
            )}

            {/* Manual details */}
            {state.method !== 'c2p' && state.method !== 'vpos' && (
              <>
                <Divider />
                <Field label={t(`${p}.paymentDate`)} value={state.manualPaymentDate} />
                {state.manualReceiptNumber && (
                  <Field label={t(`${p}.receiptNumber`)} value={state.manualReceiptNumber} />
                )}
                {(state.method === 'transfer' || state.method === 'mobile_payment') && (
                  <>
                    {state.manualSenderBankCode && (
                      <Field label={t(`${p}.senderBank`)} value={state.manualSenderBankCode} />
                    )}
                    {state.manualSenderDocumentNumber && (
                      <Field
                        label={t(`${p}.senderDocument`)}
                        value={`${state.manualSenderDocumentType}-${state.manualSenderDocumentNumber}`}
                      />
                    )}
                    {state.method === 'mobile_payment' && state.manualSenderPhoneNumber && (
                      <Field
                        label={t(`${p}.senderPhone`)}
                        value={`${state.manualSenderPhoneCountryCode} ${state.manualSenderPhoneNumber}`}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-default-500">{label}</span>
      <span className="font-medium text-default-700 dark:text-default-300">{value}</span>
    </div>
  )
}
