'use client'

import type { IWizardFormData } from '../CreateBankAccountWizard'

import { useMemo } from 'react'
import { useBanks, useActiveCurrencies } from '@packages/http-client'
import {
  VE_ACCOUNT_TYPES,
  VE_IDENTITY_DOC_TYPES,
  NATIONAL_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from '@packages/domain'

import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { Checkbox } from '@/ui/components/checkbox'
import { PhoneInput } from '@/ui/components/phone-input'
import { useTranslation } from '@/contexts'

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

  // Fetch currencies from API
  const { data: currenciesData } = useActiveCurrencies()
  const currencies = currenciesData?.data ?? []

  const currencyItems: ISelectItem[] = useMemo(
    () => currencies.map(c => ({ key: c.id, label: `${c.name} (${c.symbol})` })),
    [currencies]
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
        isRequired
        aria-label={t('admin.company.myCompany.bankAccounts.wizard.bank')}
        errorMessage={showErrors && !formData.bankId ? t(`${V_PREFIX}.bankRequired`) : undefined}
        isInvalid={showErrors && !formData.bankId}
        items={bankItems}
        label={t('admin.company.myCompany.bankAccounts.wizard.bank')}
        placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectBank')}
        value={formData.bankId ?? null}
        onSelectionChange={handleBankChange}
      />

      <div className="flex gap-3 items-start">
        <Input
          isReadOnly
          aria-label={t('admin.company.myCompany.bankAccounts.wizard.bankCode')}
          className="w-[100px] shrink-0"
          label={t('admin.company.myCompany.bankAccounts.wizard.bankCode')}
          placeholder="0000"
          value={formData.bankCode ?? ''}
        />
        <Input
          isRequired
          className="flex-1"
          errorMessage={
            formData.accountNumber &&
            formData.accountNumber.length > 0 &&
            formData.accountNumber.length !== 16
              ? t(`${V_PREFIX}.accountNumberLength`, {
                  remaining: 16 - formData.accountNumber.length,
                })
              : showErrors && !formData.accountNumber
                ? t(`${V_PREFIX}.accountNumberRequired`)
                : undefined
          }
          inputMode="numeric"
          isInvalid={
            (!!formData.accountNumber &&
              formData.accountNumber.length > 0 &&
              formData.accountNumber.length !== 16) ||
            (showErrors && !formData.accountNumber)
          }
          label={t('admin.company.myCompany.bankAccounts.wizard.accountNumber')}
          maxLength={16}
          placeholder="0100011234567890"
          value={formData.accountNumber ?? ''}
          onValueChange={v => onUpdate({ accountNumber: v.replace(/\D/g, '') })}
        />
      </div>

      <Select
        isRequired
        aria-label={t('admin.company.myCompany.bankAccounts.wizard.accountType')}
        errorMessage={
          showErrors && !formData.accountType ? t(`${V_PREFIX}.accountTypeRequired`) : undefined
        }
        isInvalid={showErrors && !formData.accountType}
        items={accountTypeItems}
        label={t('admin.company.myCompany.bankAccounts.wizard.accountType')}
        placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectOption')}
        value={formData.accountType ?? ''}
        onChange={v => onUpdate({ accountType: v ?? undefined })}
      />

      <Select
        isRequired
        aria-label={t('admin.company.myCompany.bankAccounts.wizard.currency')}
        errorMessage={
          showErrors && !formData.currencyId ? t(`${V_PREFIX}.currencyRequired`) : undefined
        }
        isInvalid={showErrors && !formData.currencyId}
        items={currencyItems}
        label={t('admin.company.myCompany.bankAccounts.wizard.currency')}
        placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectOption')}
        value={formData.currencyId ?? ''}
        onChange={v => {
          const selected = currencies.find(c => c.id === v)

          if (selected) {
            onUpdate({ currencyId: selected.id, currency: selected.code })
          }
        }}
      />

      <Input
        isRequired
        errorMessage={
          showErrors && !formData.accountHolderName
            ? t(`${V_PREFIX}.accountHolderRequired`)
            : undefined
        }
        isInvalid={showErrors && !formData.accountHolderName}
        label={t('admin.company.myCompany.bankAccounts.wizard.accountHolderName')}
        placeholder="Condominio Los Pinos C.A."
        value={formData.accountHolderName}
        onValueChange={v => onUpdate({ accountHolderName: v })}
      />

      <div className="flex gap-3 items-start">
        <Select
          isRequired
          aria-label={t('admin.company.myCompany.bankAccounts.wizard.identityDocType')}
          className="w-[120px] shrink-0"
          errorMessage={
            showErrors && !formData.identityDocType
              ? t(`${V_PREFIX}.identityDocTypeRequired`)
              : undefined
          }
          isInvalid={showErrors && !formData.identityDocType}
          items={identityDocTypeItems}
          label={t('admin.company.myCompany.bankAccounts.wizard.identityDocType')}
          placeholder={t('admin.company.myCompany.bankAccounts.wizard.selectOption')}
          value={formData.identityDocType ?? ''}
          onChange={v => onUpdate({ identityDocType: v ?? undefined })}
        />
        <Input
          isRequired
          className="flex-1"
          errorMessage={
            showErrors && !formData.identityDocNumber
              ? t(`${V_PREFIX}.identityDocRequired`)
              : undefined
          }
          inputMode="numeric"
          isInvalid={showErrors && !formData.identityDocNumber}
          label={t('admin.company.myCompany.bankAccounts.wizard.identityDocNumber')}
          placeholder="12345678"
          value={formData.identityDocNumber ?? ''}
          onValueChange={v => onUpdate({ identityDocNumber: v.replace(/\D/g, '') })}
        />
      </div>

      <PhoneInput
        countryCode={formData.phoneCountryCode ?? '+58'}
        isRequired={isPagoMovilSelected}
        label={t('admin.company.myCompany.bankAccounts.wizard.phoneNumber')}
        phoneNumber={formData.phoneNumber ?? ''}
        phoneNumberError={
          showErrors && isPagoMovilSelected && !formData.phoneNumber
            ? t(`${V_PREFIX}.phoneRequiredForPagoMovil`)
            : undefined
        }
        onCountryCodeChange={code => onUpdate({ phoneCountryCode: code ?? '+58' })}
        onPhoneNumberChange={v => onUpdate({ phoneNumber: v })}
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
