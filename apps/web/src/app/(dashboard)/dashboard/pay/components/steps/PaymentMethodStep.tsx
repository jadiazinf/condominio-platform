'use client'

import type { IPaymentWizardState, TPayMethod } from '../PaymentWizardClient'

import { useMemo, useCallback, useState } from 'react'
import { useGatewayHealth, type IPayableBankAccount } from '@packages/http-client'
import {
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  CircleDot,
  Wifi,
  WifiOff,
  Loader2,
  Eye,
} from 'lucide-react'

import { BankAccountDetailModal } from '../BankAccountDetailModal'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Divider } from '@/ui/components/divider'

interface PaymentMethodStepProps {
  state: IPaymentWizardState
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}

const BNC_BANK_CODE = '0191'

const METHOD_ICONS: Record<TPayMethod, typeof CreditCard> = {
  c2p: Smartphone,
  vpos: CreditCard,
  transfer: Building2,
  mobile_payment: Smartphone,
  cash: Banknote,
  other: CircleDot,
}

export function PaymentMethodStep({ state, onUpdate }: PaymentMethodStepProps) {
  const { t } = useTranslation()
  const p = 'resident.pay.method'

  // Bank detail modal
  const [detailBank, setDetailBank] = useState<IPayableBankAccount | null>(null)

  // Bank accounts from validation result
  const bankAccounts: IPayableBankAccount[] = state.validationResult?.commonBankAccounts ?? []

  // BNC health check (only when a BNC account is selected)
  const selectedBank = bankAccounts.find(ba => ba.id === state.bankAccountId)
  const isBnc = selectedBank?.isBnc ?? false
  const { data: healthData, isLoading: healthLoading } = useGatewayHealth('bnc', isBnc)
  const bncAvailable = (healthData as { data?: { available?: boolean } })?.data?.available ?? false

  // Available methods depend on selected bank's acceptedPaymentMethods
  const availableMethods: TPayMethod[] = useMemo(() => {
    if (!selectedBank) return []

    const accepted = new Set(selectedBank.acceptedPaymentMethods)
    const methods: TPayMethod[] = []

    // BNC direct methods (only if available and bank is BNC)
    if (selectedBank.isBnc && bncAvailable) {
      if (accepted.has('pago_movil')) methods.push('c2p')
      methods.push('vpos')
    }

    // Manual methods filtered by what the bank accepts
    if (accepted.has('transfer')) methods.push('transfer')
    if (accepted.has('pago_movil')) methods.push('mobile_payment')

    // Cash and other are always available (independent of bank)
    methods.push('cash', 'other')

    return methods
  }, [selectedBank, bncAvailable])

  // Handle bank account selection
  const handleSelectBank = useCallback(
    (bank: IPayableBankAccount) => {
      onUpdate({
        bankAccountId: bank.id,
        selectedBankAccount: bank,
        isBncAccount: bank.isBnc,
        method: '', // Reset method when bank changes
      })
    },
    [onUpdate]
  )

  // Handle method selection
  const handleSelectMethod = useCallback(
    (method: TPayMethod) => {
      onUpdate({ method })
    },
    [onUpdate]
  )

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg bg-default-50 p-4 dark:bg-default-100/50">
        <Typography className="font-medium" variant="body2">
          {t(`${p}.summary`)}
        </Typography>
        <div className="mt-2 flex items-center justify-between">
          <Typography className="text-sm text-default-500">
            {state.selectedQuotaIds.length} {t(`${p}.quotas`)}
          </Typography>
          <div className="text-right">
            <Typography className="text-sm text-default-500">{t(`${p}.totalAmount`)}</Typography>
            <Typography className="text-lg font-bold">
              {state.validationResult?.total
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
        </div>
      </div>

      {/* Bank account selection */}
      <div>
        <Typography className="mb-3 font-medium" variant="body1">
          {t(`${p}.selectBankAccount`)}
        </Typography>
        <div className="grid gap-3 sm:grid-cols-2">
          {bankAccounts.map(bank => (
            <Card
              key={bank.id}
              isPressable
              className={`cursor-pointer transition-all ${
                state.bankAccountId === bank.id
                  ? 'border-2 border-primary ring-1 ring-primary/20'
                  : 'border-2 border-transparent hover:border-default-300'
              }`}
              onPress={() => handleSelectBank(bank)}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Typography className="font-medium" variant="body2">
                      {bank.bankName}
                    </Typography>
                    <Typography className="text-sm text-default-500">{bank.displayName}</Typography>
                  </div>
                  {bank.isBnc ? (
                    <Chip color="success" size="sm" variant="flat">
                      {t(`${p}.bncDirect`)}
                    </Chip>
                  ) : (
                    <Chip color="default" size="sm" variant="flat">
                      {t(`${p}.manualOnly`)}
                    </Chip>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setDetailBank(bank)
                    }}
                  >
                    <Eye size={14} />
                    {t(`${p}.viewDetails`)}
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* BNC availability indicator */}
      {state.bankAccountId && isBnc && (
        <div className="flex items-center gap-2 rounded-lg bg-default-50 px-4 py-3 dark:bg-default-100/50">
          {healthLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-default-400" />
              <Typography className="text-sm text-default-500">{t(`${p}.bncChecking`)}</Typography>
            </>
          ) : bncAvailable ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <Typography className="text-sm text-success">{t(`${p}.bncAvailable`)}</Typography>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-danger" />
              <Typography className="text-sm text-danger">{t(`${p}.bncUnavailable`)}</Typography>
            </>
          )}
        </div>
      )}

      {/* Payment method selection */}
      {state.bankAccountId && (
        <>
          <Divider />
          <div>
            <Typography className="mb-3 font-medium" variant="body1">
              {t(`${p}.selectMethod`)}
            </Typography>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableMethods.map(method => {
                const Icon = METHOD_ICONS[method]
                const isBncMethod = method === 'c2p' || method === 'vpos'

                return (
                  <Card
                    key={method}
                    isPressable
                    className={`cursor-pointer transition-all ${
                      state.method === method
                        ? 'border-2 border-primary ring-1 ring-primary/20'
                        : 'border-2 border-transparent hover:border-default-300'
                    }`}
                    onPress={() => handleSelectMethod(method)}
                  >
                    <CardBody className="flex flex-row items-start gap-3 p-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          isBncMethod
                            ? 'bg-success-100 text-success dark:bg-success-900/30'
                            : 'bg-default-100 text-default-600 dark:bg-default-200/20'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <Typography className="font-medium" variant="body2">
                          {t(`${p}.methods.${method}`)}
                        </Typography>
                        <Typography className="text-sm text-default-500">
                          {t(`${p}.methods.${method}Desc`)}
                        </Typography>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Bank account detail modal */}
      <BankAccountDetailModal
        bankAccount={detailBank}
        isOpen={!!detailBank}
        onClose={() => setDetailBank(null)}
      />
    </div>
  )
}
