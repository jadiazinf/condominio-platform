'use client'

import type { IPaymentWizardState } from '../PaymentWizardClient'

import { useCallback, useMemo, useState } from 'react'
import { useBanks } from '@packages/http-client'
import { Eye } from 'lucide-react'

import { BankAccountDetailModal } from '../BankAccountDetailModal'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { DatePicker } from '@/ui/components/date-picker'
import { Textarea } from '@/ui/components/textarea'
import { Button } from '@/ui/components/button'
import { PhoneInput } from '@/ui/components/phone-input'
import { DocumentInput } from '@/ui/components/document-input'

interface PaymentDetailsStepProps {
  state: IPaymentWizardState
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}

export function PaymentDetailsStep({ state, onUpdate }: PaymentDetailsStepProps) {
  const update = useCallback(
    (updates: Partial<IPaymentWizardState>) => onUpdate(updates),
    [onUpdate]
  )

  switch (state.method) {
    case 'c2p':
      return <C2PDetails state={state} onUpdate={update} />
    case 'vpos':
      return <VPOSDetails state={state} onUpdate={update} />
    default:
      return <ManualDetails state={state} onUpdate={update} />
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C2P Details (Pago Móvil)
// ─────────────────────────────────────────────────────────────────────────────

function C2PDetails({
  state,
  onUpdate,
}: {
  state: IPaymentWizardState
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}) {
  const { t } = useTranslation()
  const p = 'resident.pay.details.c2p'

  // Fetch Venezuelan banks for selector
  const { data: banksData } = useBanks({ country: 'VE', accountCategory: 'national' })
  const bankItems: IAutocompleteItem[] = useMemo(() => {
    const banks = banksData?.data ?? []

    return banks
      .filter(b => b.code)
      .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''))
      .map(b => ({
        key: b.code ?? b.id,
        label: `${b.name} (${b.code})`,
      }))
  }, [banksData])

  return (
    <div className="flex flex-col gap-6">
      <Typography className="font-semibold" variant="h4">
        {t(`${p}.title`)}
      </Typography>

      {!state.c2pOtpRequested ? (
        <>
          {/* Phase 1: Debtor data */}
          <PhoneInput
            isRequired
            countryCode={state.c2pPhoneCountryCode}
            label={t(`${p}.phone`)}
            phoneNumber={state.c2pPhoneNumber}
            onCountryCodeChange={code => onUpdate({ c2pPhoneCountryCode: code ?? '+58' })}
            onPhoneNumberChange={v => onUpdate({ c2pPhoneNumber: v })}
          />

          <Autocomplete
            isRequired
            items={bankItems}
            label={t(`${p}.bank`)}
            placeholder={t(`${p}.bankPlaceholder`)}
            value={state.c2pBankCode}
            onSelectionChange={key => onUpdate({ c2pBankCode: key?.toString() ?? '' })}
          />

          <DocumentInput
            isRequired
            documentNumber={state.c2pDocumentNumber}
            documentType={state.c2pDocumentType as 'V' | 'E' | 'J' | 'G' | 'P' | null}
            label={t(`${p}.document`)}
            onDocumentNumberChange={v => onUpdate({ c2pDocumentNumber: v })}
            onDocumentTypeChange={type => onUpdate({ c2pDocumentType: type ?? 'V' })}
          />

          <Button
            color="primary"
            isDisabled={!state.c2pPhoneNumber || !state.c2pBankCode || !state.c2pDocumentNumber}
            onPress={() => {
              // In the real flow this would call the backend to send C2P and get a token
              onUpdate({ c2pOtpRequested: true })
            }}
          >
            {t(`${p}.requestOtp`)}
          </Button>
        </>
      ) : (
        <>
          {/* Phase 2: OTP input */}
          <div className="rounded-lg bg-success-50 p-4 dark:bg-success-900/20">
            <Typography className="text-sm text-success-700 dark:text-success-300">
              {t(`${p}.otpSent`)}
            </Typography>
          </div>

          {/* Read-only summary of phase 1 data */}
          <div className="rounded-lg bg-default-50 p-4 dark:bg-default-100/50">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500">{t(`${p}.phone`)}</span>
                <span>
                  {state.c2pPhoneCountryCode} {state.c2pPhoneNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">{t(`${p}.bank`)}</span>
                <span>{state.c2pBankCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">{t(`${p}.document`)}</span>
                <span>
                  {state.c2pDocumentType}-{state.c2pDocumentNumber}
                </span>
              </div>
            </div>
          </div>

          <Input
            isRequired
            label={t(`${p}.enterOtp`)}
            maxLength={8}
            placeholder={t(`${p}.otpPlaceholder`)}
            value={state.c2pToken}
            onValueChange={v => onUpdate({ c2pToken: v })}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => onUpdate({ c2pOtpRequested: false, c2pToken: '' })}
            >
              {t(`${p}.resendOtp`)}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VPOS Details (Card)
// ─────────────────────────────────────────────────────────────────────────────

function VPOSDetails({
  state,
  onUpdate,
}: {
  state: IPaymentWizardState
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}) {
  const { t } = useTranslation()
  const p = 'resident.pay.details.vpos'

  const cardTypeItems: ISelectItem[] = [
    { key: '2', label: t(`${p}.cardTypes.visa`) },
    { key: '1', label: t(`${p}.cardTypes.mastercard`) },
    { key: '3', label: t(`${p}.cardTypes.maestro`) },
  ]

  const accountTypeItems: ISelectItem[] = [
    { key: '1', label: t(`${p}.accountTypes.main`) },
    { key: '2', label: t(`${p}.accountTypes.savings`) },
    { key: '3', label: t(`${p}.accountTypes.checking`) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Typography className="font-semibold" variant="h4">
        {t(`${p}.title`)}
      </Typography>

      <Input
        isRequired
        label={t(`${p}.cardNumber`)}
        maxLength={19}
        placeholder={t(`${p}.cardNumberPlaceholder`)}
        value={state.vposCardNumber}
        onValueChange={v => {
          // Format with spaces every 4 digits
          const raw = v.replace(/\s/g, '').replace(/\D/g, '')
          const formatted = raw.replace(/(.{4})/g, '$1 ').trim()

          onUpdate({ vposCardNumber: formatted })
        }}
      />

      <Select
        isRequired
        items={cardTypeItems}
        label={t(`${p}.cardType`)}
        value={String(state.vposCardType)}
        onChange={key => onUpdate({ vposCardType: parseInt(key ?? '2', 10) })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          isRequired
          label={t(`${p}.expiry`)}
          maxLength={7}
          placeholder={t(`${p}.expiryPlaceholder`)}
          value={state.vposExpiry}
          onValueChange={v => {
            const raw = v.replace(/\D/g, '')

            if (raw.length <= 2) {
              onUpdate({ vposExpiry: raw })
            } else {
              onUpdate({ vposExpiry: `${raw.slice(0, 2)}/${raw.slice(2, 6)}` })
            }
          }}
        />

        <Input
          isRequired
          label={t(`${p}.cvv`)}
          maxLength={4}
          placeholder={t(`${p}.cvvPlaceholder`)}
          type="password"
          value={state.vposCvv}
          onValueChange={v => onUpdate({ vposCvv: v.replace(/\D/g, '') })}
        />
      </div>

      <Input
        isRequired
        label={t(`${p}.holderName`)}
        placeholder={t(`${p}.holderNamePlaceholder`)}
        value={state.vposHolderName}
        onValueChange={v => onUpdate({ vposHolderName: v })}
      />

      <DocumentInput
        isRequired
        documentNumber={state.vposHolderIdNumber}
        documentType={state.vposHolderIdType as 'V' | 'E' | 'J' | 'G' | 'P' | null}
        label={t(`${p}.holderId`)}
        onDocumentNumberChange={v => onUpdate({ vposHolderIdNumber: v })}
        onDocumentTypeChange={type => onUpdate({ vposHolderIdType: type ?? 'V' })}
      />

      <Select
        isRequired
        items={accountTypeItems}
        label={t(`${p}.accountType`)}
        value={String(state.vposAccountType)}
        onChange={key => onUpdate({ vposAccountType: parseInt(key ?? '1', 10) })}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Details (Transfer, Mobile Payment, Cash, Other)
// ─────────────────────────────────────────────────────────────────────────────

function ManualDetails({
  state,
  onUpdate,
}: {
  state: IPaymentWizardState
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}) {
  const { t } = useTranslation()
  const p = 'resident.pay.details.manual'

  const [showBankModal, setShowBankModal] = useState(false)

  const isMobilePayment = state.method === 'mobile_payment'
  const isTransfer = state.method === 'transfer'
  const showReceipt = state.method !== 'cash'

  // Fetch national Venezuelan banks for sender bank selector
  const { data: banksData } = useBanks({ country: 'VE', accountCategory: 'national' })
  const bankItems: IAutocompleteItem[] = useMemo(() => {
    const banks = banksData?.data ?? []

    return banks
      .filter(b => b.code)
      .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''))
      .map(b => ({
        key: b.code ?? b.id,
        label: `${b.name} (${b.code})`,
      }))
  }, [banksData])

  // Method-specific title
  const titleKey = `${p}.titles.${state.method}`
  const title = t(titleKey) !== titleKey ? t(titleKey) : t(`${p}.title`)

  return (
    <div className="flex flex-col gap-6">
      <Typography className="font-semibold" variant="h4">
        {title}
      </Typography>

      {/* Amount summary */}
      {state.validationResult && (
        <div className="rounded-lg bg-default-50 p-4 dark:bg-default-100/50">
          <div className="flex items-center justify-between">
            <Typography className="text-sm text-default-500">{t(`${p}.totalAmount`)}</Typography>
            <Typography className="text-lg font-bold">
              {state.quotaGroups[0]?.concept.currencySymbol ?? ''}{' '}
              {new Intl.NumberFormat('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(parseFloat(state.validationResult.total))}
            </Typography>
          </div>
        </div>
      )}

      {/* Bank account detail button — for transfer/mobile_payment */}
      {(isTransfer || isMobilePayment) && state.selectedBankAccount && (
        <>
          <div className="flex justify-end">
            <button
              className="inline-flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-sm text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20"
              type="button"
              onClick={() => setShowBankModal(true)}
            >
              <Eye size={16} />
              {t(`${p}.viewBankDetails`)} — {state.selectedBankAccount.bankName}
            </button>
          </div>

          <BankAccountDetailModal
            bankAccount={state.selectedBankAccount}
            isOpen={showBankModal}
            onClose={() => setShowBankModal(false)}
          />
        </>
      )}

      <DatePicker
        isRequired
        label={t(`${p}.paymentDate`)}
        value={state.manualPaymentDate}
        onChange={v => onUpdate({ manualPaymentDate: v })}
      />

      {/* Sender bank — for transfer and mobile_payment */}
      {(isTransfer || isMobilePayment) && (
        <Autocomplete
          isRequired
          items={bankItems}
          label={t(`${p}.senderBank`)}
          placeholder={t(`${p}.senderBankPlaceholder`)}
          value={state.manualSenderBankCode}
          onSelectionChange={key => onUpdate({ manualSenderBankCode: key?.toString() ?? '' })}
        />
      )}

      {/* Sender document — for transfer and mobile_payment */}
      {(isTransfer || isMobilePayment) && (
        <DocumentInput
          isRequired
          documentNumber={state.manualSenderDocumentNumber}
          documentType={state.manualSenderDocumentType as 'V' | 'E' | 'J' | 'G' | 'P' | null}
          label={t(`${p}.senderDocument`)}
          onDocumentNumberChange={v => onUpdate({ manualSenderDocumentNumber: v })}
          onDocumentTypeChange={type => onUpdate({ manualSenderDocumentType: type ?? 'V' })}
        />
      )}

      {/* Additional sender info — only for mobile_payment */}
      {isMobilePayment && (
        <PhoneInput
          isRequired
          countryCode={state.manualSenderPhoneCountryCode}
          label={t(`${p}.senderPhone`)}
          phoneNumber={state.manualSenderPhoneNumber}
          onCountryCodeChange={code => onUpdate({ manualSenderPhoneCountryCode: code ?? '+58' })}
          onPhoneNumberChange={v => onUpdate({ manualSenderPhoneNumber: v })}
        />
      )}

      {showReceipt && (
        <Input
          description={isTransfer || isMobilePayment ? t(`${p}.receiptRequired`) : undefined}
          inputMode="numeric"
          isRequired={isTransfer || isMobilePayment}
          label={t(`${p}.receiptNumber`)}
          placeholder={t(`${p}.receiptNumberPlaceholder`)}
          value={state.manualReceiptNumber}
          onValueChange={v => onUpdate({ manualReceiptNumber: v.replace(/\D/g, '') })}
        />
      )}

      <Textarea
        label={t(`${p}.notes`)}
        maxRows={4}
        minRows={2}
        placeholder={t(`${p}.notesPlaceholder`)}
        value={state.manualNotes}
        onValueChange={v => onUpdate({ manualNotes: v })}
      />
    </div>
  )
}
