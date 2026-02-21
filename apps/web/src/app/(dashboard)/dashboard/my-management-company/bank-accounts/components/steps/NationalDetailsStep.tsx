'use client'

import { useMemo } from 'react'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { Checkbox } from '@/ui/components/checkbox'
import { PhoneInput } from '@/ui/components/phone-input'
import { useTranslation } from '@/contexts'
import { useBanks } from '@packages/http-client'
import { VE_ACCOUNT_TYPES, VE_IDENTITY_DOC_TYPES, NATIONAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@packages/domain'
import type { IWizardFormData } from '../CreateBankAccountWizard'

interface NationalDetailsStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  managementCompanyId: string
  showErrors: boolean
}

const V_PREFIX = 'admin.company.myCompany.bankAccounts.wizard.validation'

export function NationalDetailsStep({ formData, onUpdate, showErrors }: NationalDetailsStepProps) {
  const { t } = useTranslation()

  const isPagoMovilSelected = formData.acceptedPaymentMethods.includes('pago_movil')

  // Fetch Venezuelan banks
  const { data: banksData } = useBanks({
    country: 'VE',
    accountCategory: 'national',
  })

  const banks = banksData?.data ?? []

  const bankItems: IAutocompleteItem[] = useMemo(
    () => banks.map(bank => ({ key: bank.id, label: `${bank.name} (${bank.code})` })),
    [banks]
  )

  const accountTypeItems: ISelectItem[] = useMemo(
    () =>
      VE_ACCOUNT_TYPES.map(type => ({
        key: type,
        label: t(`admin.company.myCompany.bankAccounts.wizard.${type}`),
      })),
    [t]
  )

  const identityDocTypeItems: ISelectItem[] = useMemo(
    () => VE_IDENTITY_DOC_TYPES.map(type => ({ key: type, label: type })),
    []
  )

  const currencyItems: ISelectItem[] = useMemo(
    () => [
      { key: 'VES', label: t('admin.company.myCompany.bankAccounts.wizard.currencyVES') },
      { key: 'USD', label: t('admin.company.myCompany.bankAccounts.wizard.currencyUSD') },
    ],
    [t]
  )

  const handleBankChange = (key: React.Key | null) => {
    if (key) {
      const selectedBank = banks.find(b => b.id === String(key))
      if (selectedBank) {
        onUpdate({
          bankId: selectedBank.id,
          bankName: selectedBank.name,
          bankCode: selectedBank.code ?? undefined,
        })
      }
    }
  }

  const handlePaymentMethodToggle = (method: string, checked: boolean) => {
    const current = formData.acceptedPaymentMethods
    if (checked) {
      onUpdate({ acceptedPaymentMethods: [...current, method] })
    } else {
      onUpdate({ acceptedPaymentMethods: current.filter(m => m !== method) })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Autocomplete
        aria-label={t('admin.company.myCompany.bankAccounts.wizard.bank')}
        label={t('admin.company.myCompany.bankAccounts.wizard.bank')}
        items={bankItems}
        value={formData.bankId ?? null}
        onSelectionChange={handleBankChange}
        isRequired
        placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectBank')}
        isInvalid={showErrors && !formData.bankId}
        errorMessage={showErrors && !formData.bankId ? t(`${V_PREFIX}.bankRequired`) : undefined}
      />

      <div className="flex gap-3 items-start">
        <Input
          label={t('admin.company.myCompany.bankAccounts.wizard.bankCode')}
          aria-label={t('admin.company.myCompany.bankAccounts.wizard.bankCode')}
          value={formData.bankCode ?? ''}
          isReadOnly
          className="w-[100px] shrink-0"
          placeholder="0000"
        />
        <Input
          label={t('admin.company.myCompany.bankAccounts.wizard.accountNumber')}
          placeholder="0100011234567890"
          value={formData.accountNumber ?? ''}
          onValueChange={v => onUpdate({ accountNumber: v.replace(/\D/g, '') })}
          maxLength={16}
          inputMode="numeric"
          isRequired
          className="flex-1"
          isInvalid={
            (!!formData.accountNumber && formData.accountNumber.length > 0 && formData.accountNumber.length !== 16) ||
            (showErrors && !formData.accountNumber)
          }
          errorMessage={
            formData.accountNumber && formData.accountNumber.length > 0 && formData.accountNumber.length !== 16
              ? t(`${V_PREFIX}.accountNumberLength`, { remaining: 16 - formData.accountNumber.length })
              : showErrors && !formData.accountNumber
                ? t(`${V_PREFIX}.accountNumberRequired`)
                : undefined
          }
        />
      </div>

      <Select
        aria-label={t('admin.company.myCompany.bankAccounts.wizard.accountType')}
        label={t('admin.company.myCompany.bankAccounts.wizard.accountType')}
        items={accountTypeItems}
        value={formData.accountType ?? ''}
        onChange={v => onUpdate({ accountType: v ?? undefined })}
        placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectOption')}
        isRequired
        isInvalid={showErrors && !formData.accountType}
        errorMessage={showErrors && !formData.accountType ? t(`${V_PREFIX}.accountTypeRequired`) : undefined}
      />

      <Select
        aria-label={t('admin.company.myCompany.bankAccounts.wizard.currency')}
        label={t('admin.company.myCompany.bankAccounts.wizard.currency')}
        items={currencyItems}
        value={formData.currency}
        onChange={v => onUpdate({ currency: v ?? 'VES' })}
        placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectOption')}
        isRequired
      />

      <Input
        label={t('admin.company.myCompany.bankAccounts.wizard.accountHolderName')}
        value={formData.accountHolderName}
        onValueChange={v => onUpdate({ accountHolderName: v })}
        placeholder="Condominio Los Pinos C.A."
        isRequired
        isInvalid={showErrors && !formData.accountHolderName}
        errorMessage={showErrors && !formData.accountHolderName ? t(`${V_PREFIX}.accountHolderRequired`) : undefined}
      />

      <div className="flex gap-3 items-start">
        <Select
          aria-label={t('admin.company.myCompany.bankAccounts.wizard.identityDocType')}
          label={t('admin.company.myCompany.bankAccounts.wizard.identityDocType')}
          items={identityDocTypeItems}
          value={formData.identityDocType ?? ''}
          onChange={v => onUpdate({ identityDocType: v ?? undefined })}
          placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectOption')}
          isRequired
          className="w-[120px] shrink-0"
          isInvalid={showErrors && !formData.identityDocType}
          errorMessage={showErrors && !formData.identityDocType ? t(`${V_PREFIX}.identityDocTypeRequired`) : undefined}
        />
        <Input
          label={t('admin.company.myCompany.bankAccounts.wizard.identityDocNumber')}
          value={formData.identityDocNumber ?? ''}
          onValueChange={v => onUpdate({ identityDocNumber: v.replace(/\D/g, '') })}
          placeholder="12345678"
          inputMode="numeric"
          isRequired
          className="flex-1"
          isInvalid={showErrors && !formData.identityDocNumber}
          errorMessage={showErrors && !formData.identityDocNumber ? t(`${V_PREFIX}.identityDocRequired`) : undefined}
        />
      </div>

      <PhoneInput
        label={t('admin.company.myCompany.bankAccounts.wizard.phoneNumber')}
        countryCode={formData.phoneCountryCode ?? '+58'}
        phoneNumber={formData.phoneNumber ?? ''}
        onCountryCodeChange={code => onUpdate({ phoneCountryCode: code ?? '+58' })}
        onPhoneNumberChange={v => onUpdate({ phoneNumber: v })}
        isRequired={isPagoMovilSelected}
        phoneNumberError={
          showErrors && isPagoMovilSelected && !formData.phoneNumber
            ? t(`${V_PREFIX}.phoneRequiredForPagoMovil`)
            : undefined
        }
      />

      {/* Payment Methods */}
      <div>
        <label className="text-small text-foreground-500 flex items-center gap-1 mb-3">
          <span className="text-danger">*</span>
          {t('admin.company.myCompany.bankAccounts.wizard.paymentMethods')}
        </label>
        <div className="flex flex-col gap-3">
          {NATIONAL_PAYMENT_METHODS.map(method => (
            <Checkbox
              key={method}
              color="success"
              isSelected={formData.acceptedPaymentMethods.includes(method)}
              onValueChange={checked => handlePaymentMethodToggle(method, checked)}
            >
              {PAYMENT_METHOD_LABELS[method]?.es ?? method}
            </Checkbox>
          ))}
        </div>
        {showErrors && formData.acceptedPaymentMethods.length === 0 && (
          <p className="text-tiny text-danger mt-1" data-invalid="true">
            {t(`${V_PREFIX}.paymentMethodsRequired`)}
          </p>
        )}
      </div>
    </div>
  )
}
