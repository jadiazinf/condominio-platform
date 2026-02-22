'use client'

import { useState, useMemo, useCallback } from 'react'
import { Input } from '@/ui/components/input'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { Select, type ISelectItem } from '@/ui/components/select'
import { PhoneInput } from '@/ui/components/phone-input'
import { Checkbox } from '@/ui/components/checkbox'
import { useTranslation } from '@/contexts'
import { useBanks, useActiveCurrencies } from '@packages/http-client'
import {
  CRYPTO_NETWORKS,
  CRYPTO_CURRENCIES,
} from '@packages/domain'
import type { IWizardFormData } from '../CreateBankAccountWizard'

interface InternationalDetailsStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  showErrors: boolean
}

const W_PREFIX = 'admin.company.myCompany.bankAccounts.wizard'
const V_PREFIX = `${W_PREFIX}.validation`

const INTL_METHODS = [
  { key: 'wire_transfer', translationKey: 'wireTransfer' },
  { key: 'zelle', translationKey: 'zelle' },
  { key: 'ach', translationKey: 'ach' },
  { key: 'paypal', translationKey: 'paypal' },
  { key: 'wise', translationKey: 'wise' },
  { key: 'crypto', translationKey: 'crypto' },
] as const

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export function InternationalDetailsStep({ formData, onUpdate, showErrors }: InternationalDetailsStepProps) {
  const { t } = useTranslation()
  const methods = formData.acceptedPaymentMethods

  const [isCustomBank, setIsCustomBank] = useState(() => !formData.bankId && formData.bankName.length > 0)

  const { data: banksData } = useBanks({ accountCategory: 'international' })
  const banks = banksData?.data ?? []

  const bankItems: IAutocompleteItem[] = useMemo(
    () => banks.map(bank => ({ key: bank.id, label: bank.name })),
    [banks]
  )

  const selectedBank = useMemo(
    () => (formData.bankId ? banks.find(b => b.id === formData.bankId) : null),
    [banks, formData.bankId]
  )

  const availableMethods = useMemo(() => {
    if (isCustomBank || !selectedBank?.supportedPaymentMethods) return INTL_METHODS
    const supported = selectedBank.supportedPaymentMethods
    return INTL_METHODS.filter(m => supported.includes(m.key))
  }, [isCustomBank, selectedBank])

  const handleBankChange = useCallback(
    (key: React.Key | null) => {
      if (key) {
        const bank = banks.find(b => b.id === String(key))
        if (bank) {
          const supported = bank.supportedPaymentMethods
          const cleanedMethods = supported
            ? formData.acceptedPaymentMethods.filter(m => (supported as string[]).includes(m))
            : formData.acceptedPaymentMethods
          onUpdate({ bankId: bank.id, bankName: bank.name, acceptedPaymentMethods: cleanedMethods })
        }
      }
    },
    [banks, formData.acceptedPaymentMethods, onUpdate]
  )

  const hasWire = methods.includes('wire_transfer')
  const hasZelle = methods.includes('zelle')
  const hasAch = methods.includes('ach')
  const hasPaypal = methods.includes('paypal')
  const hasWise = methods.includes('wise')
  const hasCrypto = methods.includes('crypto')
  const hasAccountFields = hasWire || hasAch

  const handleMethodToggle = useCallback(
    (method: string, checked: boolean) => {
      const current = formData.acceptedPaymentMethods
      if (checked) {
        onUpdate({ acceptedPaymentMethods: [...current, method] })
      } else {
        onUpdate({ acceptedPaymentMethods: current.filter(m => m !== method) })
      }
    },
    [formData.acceptedPaymentMethods, onUpdate]
  )

  // Fetch currencies from API
  const { data: currenciesData } = useActiveCurrencies()
  const currencies = currenciesData?.data ?? []

  const currencyItems: ISelectItem[] = useMemo(
    () => currencies.map(c => ({ key: c.id, label: `${c.name} (${c.symbol})` })),
    [currencies]
  )

  const cryptoNetworkItems: ISelectItem[] = useMemo(
    () => CRYPTO_NETWORKS.map(n => ({ key: n, label: n })),
    []
  )

  const cryptoCurrencyItems: ISelectItem[] = useMemo(
    () => CRYPTO_CURRENCIES.map(c => ({ key: c, label: c })),
    []
  )

  const accountTypeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'checking', label: t(`${W_PREFIX}.checking`) },
      { key: 'savings', label: t(`${W_PREFIX}.savings`) },
    ],
    [t]
  )

  const holderTypeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'individual', label: t(`${W_PREFIX}.individual`) },
      { key: 'company', label: t(`${W_PREFIX}.company`) },
    ],
    [t]
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Bank Selection */}
      {!isCustomBank ? (
        <>
          <Autocomplete
            aria-label={t(`${W_PREFIX}.bank`)}
            label={t(`${W_PREFIX}.bank`)}
            items={bankItems}
            value={formData.bankId ?? null}
            onSelectionChange={handleBankChange}
            isRequired
            placeholder={t(`${W_PREFIX}.selectBank`)}
            isInvalid={showErrors && !formData.bankId}
            errorMessage={showErrors && !formData.bankId ? t(`${V_PREFIX}.bankRequired`) : undefined}
          />
          <button
            type="button"
            className="text-tiny text-default-500 hover:text-foreground cursor-pointer underline self-start -mt-3"
            onClick={() => {
              setIsCustomBank(true)
              onUpdate({ bankId: undefined, bankName: '', acceptedPaymentMethods: [] })
            }}
          >
            {t(`${W_PREFIX}.bankNotInList`)}
          </button>
        </>
      ) : (
        <>
          <Input
            label={t(`${W_PREFIX}.customBankName`)}
            value={formData.bankName}
            onValueChange={v => onUpdate({ bankName: v })}
            isRequired
            isInvalid={showErrors && !formData.bankName}
            errorMessage={showErrors && !formData.bankName ? t(`${V_PREFIX}.bankRequired`) : undefined}
            placeholder="Facebank, Zinli..."
          />
          <button
            type="button"
            className="text-tiny text-default-500 hover:text-foreground cursor-pointer underline self-start -mt-3"
            onClick={() => {
              setIsCustomBank(false)
              onUpdate({ bankId: undefined, bankName: '', acceptedPaymentMethods: [] })
            }}
          >
            {t(`${W_PREFIX}.selectFromList`)}
          </button>
        </>
      )}

      {/* Payment Methods Checkboxes */}
      <div>
        <label className="text-small text-foreground-500 flex items-center gap-1 mb-3">
          <span className="text-danger">*</span>
          {t(`${W_PREFIX}.paymentMethods`)}
        </label>
        <div className="flex flex-wrap gap-3">
          {availableMethods.map(m => (
            <Checkbox
              key={m.key}
              color="success"
              isSelected={methods.includes(m.key)}
              onValueChange={checked => handleMethodToggle(m.key, checked)}
            >
              {t(`${W_PREFIX}.${m.translationKey}`)}
            </Checkbox>
          ))}
        </div>
        {showErrors && methods.length === 0 && (
          <p className="text-tiny text-danger mt-1" data-invalid="true">
            {t(`${V_PREFIX}.paymentMethodsRequired`)}
          </p>
        )}
      </div>

      <Input
        label={t(`${W_PREFIX}.accountHolderName`)}
        value={formData.accountHolderName}
        onValueChange={v => onUpdate({ accountHolderName: v })}
        placeholder="Condominio Los Pinos C.A."
        isRequired
        isInvalid={showErrors && !formData.accountHolderName}
        errorMessage={showErrors && !formData.accountHolderName ? t(`${V_PREFIX}.accountHolderRequired`) : undefined}
      />

      <Select
        aria-label={t(`${W_PREFIX}.currency`)}
        label={t(`${W_PREFIX}.currency`)}
        items={currencyItems}
        value={formData.currencyId ?? ''}
        onChange={v => {
          const selected = currencies.find(c => c.id === v)
          if (selected) {
            onUpdate({ currencyId: selected.id, currency: selected.code })
          }
        }}
        placeholder={t(`${W_PREFIX}.selectOption`)}
        isRequired
        isInvalid={showErrors && !formData.currencyId}
        errorMessage={showErrors && !formData.currencyId ? t(`${V_PREFIX}.currencyRequired`) : undefined}
      />

      {/* Account Number + Routing (shared by Wire & ACH) */}
      {hasAccountFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label={t(`${W_PREFIX}.accountNumber`)}
            value={formData.intlAccountNumber ?? ''}
            onValueChange={v => onUpdate({ intlAccountNumber: v })}
            isRequired
            placeholder="123456789012"
            isInvalid={showErrors && !formData.intlAccountNumber}
            errorMessage={showErrors && !formData.intlAccountNumber ? t(`${V_PREFIX}.intlAccountNumberRequired`) : undefined}
          />
          <Input
            label={t(`${W_PREFIX}.routingNumber`)}
            placeholder="026009593"
            value={formData.routingNumber ?? ''}
            onValueChange={v => onUpdate({ routingNumber: v.replace(/\D/g, '') })}
            maxLength={9}
            inputMode="numeric"
            isRequired={hasAch}
            isInvalid={
              (hasAch && !!formData.routingNumber && formData.routingNumber.length > 0 && formData.routingNumber.length !== 9) ||
              (showErrors && hasAch && !formData.routingNumber)
            }
            errorMessage={
              hasAch && formData.routingNumber && formData.routingNumber.length > 0 && formData.routingNumber.length !== 9
                ? t(`${V_PREFIX}.routingNumberLength`, { count: formData.routingNumber.length })
                : showErrors && hasAch && !formData.routingNumber
                  ? t(`${V_PREFIX}.routingNumberRequired`)
                  : undefined
            }
          />
        </div>
      )}

      {/* Wire Transfer specific */}
      {hasWire && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label={t(`${W_PREFIX}.swiftCode`)}
              value={formData.swiftCode ?? ''}
              onValueChange={v => onUpdate({ swiftCode: v.toUpperCase() })}
              placeholder="BOFAUS3N"
              maxLength={11}
              isRequired
              isInvalid={showErrors && !formData.swiftCode}
              errorMessage={showErrors && !formData.swiftCode ? t(`${V_PREFIX}.swiftCodeRequired`) : undefined}
            />
            <Input
              label={t(`${W_PREFIX}.iban`)}
              value={formData.iban ?? ''}
              onValueChange={v => onUpdate({ iban: v.toUpperCase() })}
              placeholder="GB29NWBK60161331926819"
              maxLength={34}
            />
          </div>
          <Input
            label={t(`${W_PREFIX}.bankAddress`)}
            value={formData.bankAddress ?? ''}
            onValueChange={v => onUpdate({ bankAddress: v })}
            placeholder="100 N Tryon St, Charlotte, NC"
          />
          <Input
            label={t(`${W_PREFIX}.beneficiaryAddress`)}
            value={formData.beneficiaryAddress ?? ''}
            onValueChange={v => onUpdate({ beneficiaryAddress: v })}
            placeholder="123 Main St, Miami, FL"
          />
        </>
      )}

      {/* Zelle specific */}
      {hasZelle && (
        <>
          <Input
            label={t(`${W_PREFIX}.zelleEmail`)}
            value={formData.zelleEmail ?? ''}
            onValueChange={v => onUpdate({ zelleEmail: v })}
            placeholder="admin@company.com"
            type="email"
            isRequired={!formData.zellePhone}
            isInvalid={
              (!!formData.zelleEmail && !isValidEmail(formData.zelleEmail)) ||
              (showErrors && !formData.zelleEmail && !formData.zellePhone)
            }
            errorMessage={
              formData.zelleEmail && !isValidEmail(formData.zelleEmail)
                ? t(`${V_PREFIX}.emailInvalid`)
                : showErrors && !formData.zelleEmail && !formData.zellePhone
                  ? t(`${V_PREFIX}.zelleContactRequired`)
                  : undefined
            }
          />
          <PhoneInput
            label={t(`${W_PREFIX}.zellePhone`)}
            countryCode="+1"
            phoneNumber={formData.zellePhone ?? ''}
            onPhoneNumberChange={v => onUpdate({ zellePhone: v })}
            isRequired={!formData.zelleEmail}
            isCountryCodeReadOnly
            phoneNumberError={
              showErrors && !formData.zellePhone && !formData.zelleEmail
                ? t(`${V_PREFIX}.zelleContactRequired`)
                : undefined
            }
          />
        </>
      )}

      {/* ACH specific */}
      {hasAch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            aria-label={t(`${W_PREFIX}.holderType`)}
            label={t(`${W_PREFIX}.holderType`)}
            items={holderTypeItems}
            value={formData.accountHolderType ?? ''}
            onChange={v => onUpdate({ accountHolderType: v ?? undefined })}
            placeholder={t(`${W_PREFIX}.selectOption`)}
            isRequired
            isInvalid={showErrors && !formData.accountHolderType}
            errorMessage={showErrors && !formData.accountHolderType ? t(`${V_PREFIX}.holderTypeRequired`) : undefined}
          />
          <Select
            aria-label={t(`${W_PREFIX}.accountType`)}
            label={t(`${W_PREFIX}.accountType`)}
            items={accountTypeItems}
            value={formData.intlAccountType ?? ''}
            onChange={v => onUpdate({ intlAccountType: v ?? undefined })}
            placeholder={t(`${W_PREFIX}.selectOption`)}
            isRequired
            isInvalid={showErrors && !formData.intlAccountType}
            errorMessage={showErrors && !formData.intlAccountType ? t(`${V_PREFIX}.accountTypeRequired`) : undefined}
          />
        </div>
      )}

      {/* PayPal specific */}
      {hasPaypal && (
        <Input
          label={t(`${W_PREFIX}.paypalEmail`)}
          value={formData.paypalEmail ?? ''}
          onValueChange={v => onUpdate({ paypalEmail: v })}
          type="email"
          placeholder="admin@company.com"
          isRequired
          isInvalid={
            (!!formData.paypalEmail && !isValidEmail(formData.paypalEmail)) ||
            (showErrors && !formData.paypalEmail)
          }
          errorMessage={
            formData.paypalEmail && !isValidEmail(formData.paypalEmail)
              ? t(`${V_PREFIX}.emailInvalid`)
              : showErrors && !formData.paypalEmail
                ? t(`${V_PREFIX}.paypalWiseEmailRequired`)
                : undefined
          }
        />
      )}

      {/* Wise specific */}
      {hasWise && (
        <Input
          label={t(`${W_PREFIX}.wiseEmail`)}
          value={formData.wiseEmail ?? ''}
          onValueChange={v => onUpdate({ wiseEmail: v })}
          type="email"
          placeholder="admin@company.com"
          isRequired
          isInvalid={
            (!!formData.wiseEmail && !isValidEmail(formData.wiseEmail)) ||
            (showErrors && !formData.wiseEmail)
          }
          errorMessage={
            formData.wiseEmail && !isValidEmail(formData.wiseEmail)
              ? t(`${V_PREFIX}.emailInvalid`)
              : showErrors && !formData.wiseEmail
                ? t(`${V_PREFIX}.paypalWiseEmailRequired`)
                : undefined
          }
        />
      )}

      {/* Crypto specific */}
      {hasCrypto && (
        <>
          <Input
            label={t(`${W_PREFIX}.walletAddress`)}
            value={formData.walletAddress ?? ''}
            onValueChange={v => onUpdate({ walletAddress: v })}
            isRequired
            placeholder="TN3W4H..."
            isInvalid={showErrors && !formData.walletAddress}
            errorMessage={showErrors && !formData.walletAddress ? t(`${V_PREFIX}.walletAddressRequired`) : undefined}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              aria-label={t(`${W_PREFIX}.cryptoNetwork`)}
              label={t(`${W_PREFIX}.cryptoNetwork`)}
              items={cryptoNetworkItems}
              value={formData.cryptoNetwork ?? ''}
              onChange={v => onUpdate({ cryptoNetwork: v ?? undefined })}
              placeholder={t(`${W_PREFIX}.selectOption`)}
              isRequired
              isInvalid={showErrors && !formData.cryptoNetwork}
              errorMessage={showErrors && !formData.cryptoNetwork ? t(`${V_PREFIX}.cryptoNetworkRequired`) : undefined}
            />
            <Select
              aria-label={t(`${W_PREFIX}.cryptoCurrency`)}
              label={t(`${W_PREFIX}.cryptoCurrency`)}
              items={cryptoCurrencyItems}
              value={formData.cryptoCurrency ?? ''}
              onChange={v => onUpdate({ cryptoCurrency: v ?? undefined })}
              placeholder={t(`${W_PREFIX}.selectOption`)}
              isRequired
              isInvalid={showErrors && !formData.cryptoCurrency}
              errorMessage={showErrors && !formData.cryptoCurrency ? t(`${V_PREFIX}.cryptoCurrencyRequired`) : undefined}
            />
          </div>
        </>
      )}
    </div>
  )
}
