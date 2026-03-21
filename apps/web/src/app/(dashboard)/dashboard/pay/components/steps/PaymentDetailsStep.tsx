'use client'

import { useCallback } from 'react'
import { useBanks } from '@packages/http-client'

import type { IPaymentWizardState } from '../PaymentWizardClient'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { DatePicker } from '@/ui/components/date-picker'
import { Textarea } from '@/ui/components/textarea'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'

interface PaymentDetailsStepProps {
  state: IPaymentWizardState
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}

export function PaymentDetailsStep({ state, onUpdate }: PaymentDetailsStepProps) {
  const { t } = useTranslation()
  const p = 'resident.pay.details'

  const update = useCallback(
    (updates: Partial<IPaymentWizardState>) => onUpdate(updates),
    [onUpdate],
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
  const { data: banksData } = useBanks()
  const banks = banksData?.data ?? []

  const bankItems: ISelectItem[] = banks.map(b => ({
    key: b.bankCode,
    label: `${b.bankCode} - ${b.name}`,
  }))

  return (
    <div className="space-y-5">
      <Typography className="font-semibold" variant="h4">
        {t(`${p}.title`)}
      </Typography>

      {!state.c2pOtpRequested ? (
        <>
          {/* Phase 1: Debtor data */}
          <Input
            isRequired
            label={t(`${p}.phone`)}
            placeholder={t(`${p}.phonePlaceholder`)}
            type="tel"
            value={state.c2pPhone}
            onValueChange={v => onUpdate({ c2pPhone: v })}
          />

          <Select
            isRequired
            items={bankItems}
            label={t(`${p}.bank`)}
            placeholder={t(`${p}.bankPlaceholder`)}
            value={state.c2pBankCode}
            onChange={key => onUpdate({ c2pBankCode: key ?? '' })}
          />

          <Input
            isRequired
            label={t(`${p}.document`)}
            placeholder={t(`${p}.documentPlaceholder`)}
            value={state.c2pDocument}
            onValueChange={v => onUpdate({ c2pDocument: v })}
          />

          <Button
            color="primary"
            isDisabled={!state.c2pPhone || !state.c2pBankCode || !state.c2pDocument}
            onPress={() => {
              // In the real flow this would call the backend to send C2P and get a token
              // For now, simulate OTP request
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
                <span>{state.c2pPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">{t(`${p}.bank`)}</span>
                <span>{state.c2pBankCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">{t(`${p}.document`)}</span>
                <span>{state.c2pDocument}</span>
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
    <div className="space-y-5">
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

      <Input
        isRequired
        label={t(`${p}.holderId`)}
        maxLength={9}
        placeholder={t(`${p}.holderIdPlaceholder`)}
        value={state.vposHolderId}
        onValueChange={v => onUpdate({ vposHolderId: v.replace(/\D/g, '') })}
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

  const isTransferOrMobile = state.method === 'transfer' || state.method === 'mobile_payment'

  return (
    <div className="space-y-5">
      <Typography className="font-semibold" variant="h4">
        {t(`${p}.title`)}
      </Typography>

      {/* Bank account info card */}
      {state.selectedBankAccount && (
        <Card className="bg-default-50 dark:bg-default-100/50">
          <CardBody className="p-4">
            <Typography className="mb-2 text-sm font-medium text-default-500">
              {t(`${p}.bankInfoDesc`)}
            </Typography>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500">Banco</span>
                <span className="font-medium">{state.selectedBankAccount.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Cuenta</span>
                <span className="font-medium">{state.selectedBankAccount.displayName}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <DatePicker
        isRequired
        label={t(`${p}.paymentDate`)}
        value={state.manualPaymentDate}
        onChange={v => onUpdate({ manualPaymentDate: v })}
      />

      <Input
        isRequired={isTransferOrMobile}
        description={isTransferOrMobile ? t(`${p}.receiptRequired`) : undefined}
        label={t(`${p}.receiptNumber`)}
        placeholder={t(`${p}.receiptNumberPlaceholder`)}
        value={state.manualReceiptNumber}
        onValueChange={v => onUpdate({ manualReceiptNumber: v })}
      />

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
