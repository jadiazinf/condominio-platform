'use client'

import type { IWizardFormData } from '../CreateBankAccountWizard'

import { useState, useMemo, useCallback } from 'react'
import { useBanks, useActiveCurrencies } from '@packages/http-client'
import { CRYPTO_NETWORKS, CRYPTO_CURRENCIES } from '@packages/domain'

import { Input } from '@/ui/components/input'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { Select, type ISelectItem } from '@/ui/components/select'
import { PhoneInput } from '@/ui/components/phone-input'
import { Checkbox } from '@/ui/components/checkbox'
import { useTranslation } from '@/contexts'

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

export function InternationalDetailsStep({
  formData,
  onUpdate,
  showErrors,
}: InternationalDetailsStepProps) {
  const { t } = useTranslation()
  const methods = formData.acceptedPaymentMethods

  const [isCustomBank, setIsCustomBank] = useState(
    () => !formData.bankId && formData.bankName.length > 0
  )

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
            isRequired
            aria-label={t(`${W_PREFIX}.bank`)}
            errorMessage={
              showErrors && !formData.bankId ? t(`${V_PREFIX}.bankRequired`) : undefined
            }
            isInvalid={showErrors && !formData.bankId}
            items={bankItems}
            label={t(`${W_PREFIX}.bank`)}
            placeholder={t(`${W_PREFIX}.selectBank`)}
            value={formData.bankId ?? null}
            onSelectionChange={handleBankChange}
          />
          <button
            className="text-tiny text-default-500 hover:text-foreground cursor-pointer underline self-start -mt-3"
            type="button"
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
            isRequired
            errorMessage={
              showErrors && !formData.bankName ? t(`${V_PREFIX}.bankRequired`) : undefined
            }
            isInvalid={showErrors && !formData.bankName}
            label={t(`${W_PREFIX}.customBankName`)}
            placeholder="Facebank, Zinli..."
            value={formData.bankName}
            onValueChange={v => onUpdate({ bankName: v })}
          />
          <button
            className="text-tiny text-default-500 hover:text-foreground cursor-pointer underline self-start -mt-3"
            type="button"
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
        isRequired
        errorMessage={
          showErrors && !formData.accountHolderName
            ? t(`${V_PREFIX}.accountHolderRequired`)
            : undefined
        }
        isInvalid={showErrors && !formData.accountHolderName}
        label={t(`${W_PREFIX}.accountHolderName`)}
        placeholder="Condominio Los Pinos C.A."
        value={formData.accountHolderName}
        onValueChange={v => onUpdate({ accountHolderName: v })}
      />

      <Select
        isRequired
        aria-label={t(`${W_PREFIX}.currency`)}
        errorMessage={
          showErrors && !formData.currencyId ? t(`${V_PREFIX}.currencyRequired`) : undefined
        }
        isInvalid={showErrors && !formData.currencyId}
        items={currencyItems}
        label={t(`${W_PREFIX}.currency`)}
        placeholder={t(`${W_PREFIX}.selectOption`)}
        value={formData.currencyId ?? ''}
        onChange={v => {
          const selected = currencies.find(c => c.id === v)

          if (selected) {
            onUpdate({ currencyId: selected.id, currency: selected.code })
          }
        }}
      />

      {/* Account Number + Routing (shared by Wire & ACH) */}
      {hasAccountFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            isRequired
            errorMessage={
              showErrors && !formData.intlAccountNumber
                ? t(`${V_PREFIX}.intlAccountNumberRequired`)
                : undefined
            }
            isInvalid={showErrors && !formData.intlAccountNumber}
            label={t(`${W_PREFIX}.accountNumber`)}
            placeholder="123456789012"
            value={formData.intlAccountNumber ?? ''}
            onValueChange={v => onUpdate({ intlAccountNumber: v })}
          />
          <Input
            errorMessage={
              hasAch &&
              formData.routingNumber &&
              formData.routingNumber.length > 0 &&
              formData.routingNumber.length !== 9
                ? t(`${V_PREFIX}.routingNumberLength`, { count: formData.routingNumber.length })
                : showErrors && hasAch && !formData.routingNumber
                  ? t(`${V_PREFIX}.routingNumberRequired`)
                  : undefined
            }
            inputMode="numeric"
            isInvalid={
              (hasAch &&
                !!formData.routingNumber &&
                formData.routingNumber.length > 0 &&
                formData.routingNumber.length !== 9) ||
              (showErrors && hasAch && !formData.routingNumber)
            }
            isRequired={hasAch}
            label={t(`${W_PREFIX}.routingNumber`)}
            maxLength={9}
            placeholder="026009593"
            value={formData.routingNumber ?? ''}
            onValueChange={v => onUpdate({ routingNumber: v.replace(/\D/g, '') })}
          />
        </div>
      )}

      {/* Wire Transfer specific */}
      {hasWire && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              isRequired
              errorMessage={
                showErrors && !formData.swiftCode ? t(`${V_PREFIX}.swiftCodeRequired`) : undefined
              }
              isInvalid={showErrors && !formData.swiftCode}
              label={t(`${W_PREFIX}.swiftCode`)}
              maxLength={11}
              placeholder="BOFAUS3N"
              value={formData.swiftCode ?? ''}
              onValueChange={v => onUpdate({ swiftCode: v.toUpperCase() })}
            />
            <Input
              label={t(`${W_PREFIX}.iban`)}
              maxLength={34}
              placeholder="GB29NWBK60161331926819"
              value={formData.iban ?? ''}
              onValueChange={v => onUpdate({ iban: v.toUpperCase() })}
            />
          </div>
          <Input
            label={t(`${W_PREFIX}.bankAddress`)}
            placeholder="100 N Tryon St, Charlotte, NC"
            value={formData.bankAddress ?? ''}
            onValueChange={v => onUpdate({ bankAddress: v })}
          />
          <Input
            label={t(`${W_PREFIX}.beneficiaryAddress`)}
            placeholder="123 Main St, Miami, FL"
            value={formData.beneficiaryAddress ?? ''}
            onValueChange={v => onUpdate({ beneficiaryAddress: v })}
          />
        </>
      )}

      {/* Zelle specific */}
      {hasZelle && (
        <>
          <Input
            errorMessage={
              formData.zelleEmail && !isValidEmail(formData.zelleEmail)
                ? t(`${V_PREFIX}.emailInvalid`)
                : showErrors && !formData.zelleEmail && !formData.zellePhone
                  ? t(`${V_PREFIX}.zelleContactRequired`)
                  : undefined
            }
            isInvalid={
              (!!formData.zelleEmail && !isValidEmail(formData.zelleEmail)) ||
              (showErrors && !formData.zelleEmail && !formData.zellePhone)
            }
            isRequired={!formData.zellePhone}
            label={t(`${W_PREFIX}.zelleEmail`)}
            placeholder="admin@company.com"
            type="email"
            value={formData.zelleEmail ?? ''}
            onValueChange={v => onUpdate({ zelleEmail: v })}
          />
          <PhoneInput
            isCountryCodeReadOnly
            countryCode="+1"
            isRequired={!formData.zelleEmail}
            label={t(`${W_PREFIX}.zellePhone`)}
            phoneNumber={formData.zellePhone ?? ''}
            phoneNumberError={
              showErrors && !formData.zellePhone && !formData.zelleEmail
                ? t(`${V_PREFIX}.zelleContactRequired`)
                : undefined
            }
            onPhoneNumberChange={v => onUpdate({ zellePhone: v })}
          />
        </>
      )}

      {/* ACH specific */}
      {hasAch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            isRequired
            aria-label={t(`${W_PREFIX}.holderType`)}
            errorMessage={
              showErrors && !formData.accountHolderType
                ? t(`${V_PREFIX}.holderTypeRequired`)
                : undefined
            }
            isInvalid={showErrors && !formData.accountHolderType}
            items={holderTypeItems}
            label={t(`${W_PREFIX}.holderType`)}
            placeholder={t(`${W_PREFIX}.selectOption`)}
            value={formData.accountHolderType ?? ''}
            onChange={v => onUpdate({ accountHolderType: v ?? undefined })}
          />
          <Select
            isRequired
            aria-label={t(`${W_PREFIX}.accountType`)}
            errorMessage={
              showErrors && !formData.intlAccountType
                ? t(`${V_PREFIX}.accountTypeRequired`)
                : undefined
            }
            isInvalid={showErrors && !formData.intlAccountType}
            items={accountTypeItems}
            label={t(`${W_PREFIX}.accountType`)}
            placeholder={t(`${W_PREFIX}.selectOption`)}
            value={formData.intlAccountType ?? ''}
            onChange={v => onUpdate({ intlAccountType: v ?? undefined })}
          />
        </div>
      )}

      {/* PayPal specific */}
      {hasPaypal && (
        <Input
          isRequired
          errorMessage={
            formData.paypalEmail && !isValidEmail(formData.paypalEmail)
              ? t(`${V_PREFIX}.emailInvalid`)
              : showErrors && !formData.paypalEmail
                ? t(`${V_PREFIX}.paypalWiseEmailRequired`)
                : undefined
          }
          isInvalid={
            (!!formData.paypalEmail && !isValidEmail(formData.paypalEmail)) ||
            (showErrors && !formData.paypalEmail)
          }
          label={t(`${W_PREFIX}.paypalEmail`)}
          placeholder="admin@company.com"
          type="email"
          value={formData.paypalEmail ?? ''}
          onValueChange={v => onUpdate({ paypalEmail: v })}
        />
      )}

      {/* Wise specific */}
      {hasWise && (
        <Input
          isRequired
          errorMessage={
            formData.wiseEmail && !isValidEmail(formData.wiseEmail)
              ? t(`${V_PREFIX}.emailInvalid`)
              : showErrors && !formData.wiseEmail
                ? t(`${V_PREFIX}.paypalWiseEmailRequired`)
                : undefined
          }
          isInvalid={
            (!!formData.wiseEmail && !isValidEmail(formData.wiseEmail)) ||
            (showErrors && !formData.wiseEmail)
          }
          label={t(`${W_PREFIX}.wiseEmail`)}
          placeholder="admin@company.com"
          type="email"
          value={formData.wiseEmail ?? ''}
          onValueChange={v => onUpdate({ wiseEmail: v })}
        />
      )}

      {/* Crypto specific */}
      {hasCrypto && (
        <>
          <Input
            isRequired
            errorMessage={
              showErrors && !formData.walletAddress
                ? t(`${V_PREFIX}.walletAddressRequired`)
                : undefined
            }
            isInvalid={showErrors && !formData.walletAddress}
            label={t(`${W_PREFIX}.walletAddress`)}
            placeholder="TN3W4H..."
            value={formData.walletAddress ?? ''}
            onValueChange={v => onUpdate({ walletAddress: v })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              isRequired
              aria-label={t(`${W_PREFIX}.cryptoNetwork`)}
              errorMessage={
                showErrors && !formData.cryptoNetwork
                  ? t(`${V_PREFIX}.cryptoNetworkRequired`)
                  : undefined
              }
              isInvalid={showErrors && !formData.cryptoNetwork}
              items={cryptoNetworkItems}
              label={t(`${W_PREFIX}.cryptoNetwork`)}
              placeholder={t(`${W_PREFIX}.selectOption`)}
              value={formData.cryptoNetwork ?? ''}
              onChange={v => onUpdate({ cryptoNetwork: v ?? undefined })}
            />
            <Select
              isRequired
              aria-label={t(`${W_PREFIX}.cryptoCurrency`)}
              errorMessage={
                showErrors && !formData.cryptoCurrency
                  ? t(`${V_PREFIX}.cryptoCurrencyRequired`)
                  : undefined
              }
              isInvalid={showErrors && !formData.cryptoCurrency}
              items={cryptoCurrencyItems}
              label={t(`${W_PREFIX}.cryptoCurrency`)}
              placeholder={t(`${W_PREFIX}.selectOption`)}
              value={formData.cryptoCurrency ?? ''}
              onChange={v => onUpdate({ cryptoCurrency: v ?? undefined })}
            />
          </div>
        </>
      )}
    </div>
  )
}
