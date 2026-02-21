'use client'

import { useEffect } from 'react'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { PAYMENT_METHOD_LABELS } from '@packages/domain'
import type { IWizardFormData } from '../CreateBankAccountWizard'

interface ReviewStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
}

export function ReviewStep({ formData, onUpdate }: ReviewStepProps) {
  const { t } = useTranslation()

  // Auto-generate display name if empty
  useEffect(() => {
    if (!formData.displayName) {
      const autoName = `${formData.bankName} - ${formData.accountCategory === 'national' ? formData.accountType ?? '' : formData.internationalSubType ?? ''} (${formData.currency})`
      onUpdate({ displayName: autoName })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 py-1">
      {/* Display name */}
      <Input
        label={t('admin.company.myCompany.bankAccounts.wizard.displayName')}
        value={formData.displayName}
        onValueChange={v => onUpdate({ displayName: v })}
        isRequired
      />

      {/* Notes */}
      <Textarea
        label={t('admin.company.myCompany.bankAccounts.wizard.notes')}
        value={formData.notes ?? ''}
        onValueChange={v => onUpdate({ notes: v || undefined })}
        minRows={2}
      />

      {/* Summary */}
      <div className="rounded-lg border border-default-200 p-4 space-y-4">
        <Typography variant="body1" className="font-semibold">
          {t('admin.company.myCompany.bankAccounts.wizard.review')}
        </Typography>

        {/* Category */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500">
            {t('admin.company.myCompany.bankAccounts.columns.category')}:
          </span>
          <Chip
            color={formData.accountCategory === 'national' ? 'primary' : 'secondary'}
            variant="flat"
            size="sm"
          >
            {formData.accountCategory === 'national'
              ? t('admin.company.myCompany.bankAccounts.national')
              : t('admin.company.myCompany.bankAccounts.international')}
          </Chip>
        </div>

        {/* Bank & Account Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-default-500">
              {t('admin.company.myCompany.bankAccounts.columns.bankName')}:
            </span>
            <p className="font-medium">
              {formData.bankName}
              {formData.bankCode && (
                <span className="text-default-400 ml-1">({formData.bankCode})</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-default-500">
              {t('admin.company.myCompany.bankAccounts.wizard.accountHolderName')}:
            </span>
            <p className="font-medium">{formData.accountHolderName}</p>
          </div>
          <div>
            <span className="text-default-500">
              {t('admin.company.myCompany.bankAccounts.columns.currency')}:
            </span>
            <p className="font-medium font-mono">{formData.currency}</p>
          </div>

          {/* National-specific fields */}
          {formData.accountCategory === 'national' && (
            <>
              {formData.accountNumber && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.accountNumber')}:
                  </span>
                  <p className="font-medium font-mono">
                    ****{formData.accountNumber.slice(-4)}
                  </p>
                </div>
              )}
              {formData.accountType && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.accountType')}:
                  </span>
                  <p className="font-medium">
                    {t(`admin.company.myCompany.bankAccounts.wizard.${formData.accountType}`)}
                  </p>
                </div>
              )}
              {formData.identityDocType && formData.identityDocNumber && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.identityDocNumber')}:
                  </span>
                  <p className="font-medium">{formData.identityDocType}-{formData.identityDocNumber}</p>
                </div>
              )}
              {formData.phoneNumber && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.phoneNumber')}:
                  </span>
                  <p className="font-medium">{formData.phoneCountryCode ?? '+58'}{formData.phoneNumber}</p>
                </div>
              )}
            </>
          )}

          {/* International-specific fields */}
          {formData.accountCategory === 'international' && (
            <>
              {formData.intlAccountNumber && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.accountNumber')}:
                  </span>
                  <p className="font-medium font-mono">
                    ****{formData.intlAccountNumber.slice(-4)}
                  </p>
                </div>
              )}
              {formData.swiftCode && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.swiftCode')}:
                  </span>
                  <p className="font-medium font-mono">{formData.swiftCode}</p>
                </div>
              )}
              {formData.iban && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.iban')}:
                  </span>
                  <p className="font-medium font-mono">{formData.iban}</p>
                </div>
              )}
              {formData.routingNumber && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.routingNumber')}:
                  </span>
                  <p className="font-medium font-mono">{formData.routingNumber}</p>
                </div>
              )}
              {formData.zelleEmail && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.zelleEmail')}:
                  </span>
                  <p className="font-medium">{formData.zelleEmail}</p>
                </div>
              )}
              {formData.zellePhone && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.zellePhone')}:
                  </span>
                  <p className="font-medium">{formData.zellePhone}</p>
                </div>
              )}
              {formData.paypalEmail && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.paypalEmail')}:
                  </span>
                  <p className="font-medium">{formData.paypalEmail}</p>
                </div>
              )}
              {formData.wiseEmail && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.wiseEmail')}:
                  </span>
                  <p className="font-medium">{formData.wiseEmail}</p>
                </div>
              )}
              {formData.walletAddress && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.walletAddress')}:
                  </span>
                  <p className="font-medium font-mono text-xs break-all">{formData.walletAddress}</p>
                </div>
              )}
              {formData.cryptoNetwork && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.cryptoNetwork')}:
                  </span>
                  <p className="font-medium">{formData.cryptoNetwork}</p>
                </div>
              )}
              {formData.cryptoCurrency && (
                <div>
                  <span className="text-default-500">
                    {t('admin.company.myCompany.bankAccounts.wizard.cryptoCurrency')}:
                  </span>
                  <p className="font-medium">{formData.cryptoCurrency}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Methods */}
        <div>
          <span className="text-sm text-default-500">
            {t('admin.company.myCompany.bankAccounts.wizard.paymentMethods')}:
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {formData.acceptedPaymentMethods.map(m => (
              <Chip key={m} size="sm" variant="flat">
                {PAYMENT_METHOD_LABELS[m]?.es ?? m}
              </Chip>
            ))}
          </div>
        </div>

        {/* Condominiums */}
        <div>
          <span className="text-sm text-default-500">
            {t('admin.company.myCompany.bankAccounts.columns.condominiums')}:
          </span>
          {formData.appliesToAllCondominiums ? (
            <Chip color="success" variant="flat" size="sm" className="ml-2">
              {t('admin.company.myCompany.bankAccounts.allCondominiumsBadge')}
            </Chip>
          ) : (
            <p className="text-sm font-medium">
              {formData.condominiumIds.length} condominium(s)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
