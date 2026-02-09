'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Textarea } from '@/ui/components/textarea'
import { Spinner } from '@/ui/components/spinner'
import { useToast } from '@/ui/components/toast'
import { useReportPayment, useCurrencies } from '@packages/http-client'
import type { TPaymentCreate } from '@packages/domain'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IUnitOption {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumName: string
}

interface IReportPaymentClientProps {
  userId: string
  unitOptions: IUnitOption[]
}

type TPaymentMethodOption = 'transfer' | 'cash' | 'card' | 'mobile_payment' | 'other'

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ReportPaymentClient({ userId, unitOptions }: IReportPaymentClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()

  // Form state
  const [unitId, setUnitId] = useState<string>(unitOptions.length === 1 ? unitOptions[0].unitId : '')
  const [amount, setAmount] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<TPaymentMethodOption | ''>('')
  const [paymentDate, setPaymentDate] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch available currencies
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies()
  const currencies = currenciesData?.data ?? []

  // Mutation
  const reportPayment = useReportPayment({
    onSuccess: () => {
      toast.success(t('resident.reportPayment.success'))
      router.push('/dashboard/my-payments')
    },
    onError: () => {
      toast.error(t('resident.reportPayment.error'))
    },
  })

  // Memoized select items
  const unitSelectItems: ISelectItem[] = useMemo(
    () =>
      unitOptions.map((u) => ({
        key: u.unitId,
        label: `${u.unitNumber} - ${u.buildingName} (${u.condominiumName})`,
      })),
    [unitOptions]
  )

  const paymentMethodItems: ISelectItem[] = useMemo(
    () => [
      { key: 'transfer', label: t('resident.reportPayment.methods.transfer') },
      { key: 'cash', label: t('resident.reportPayment.methods.cash') },
      { key: 'card', label: t('resident.reportPayment.methods.card') },
      { key: 'mobile_payment', label: t('resident.reportPayment.methods.mobile_payment') },
      { key: 'other', label: t('resident.reportPayment.methods.other') },
    ],
    [t]
  )

  const currencySelectItems: ISelectItem[] = useMemo(
    () =>
      currencies
        .filter((c) => c.isActive)
        .map((c) => ({
          key: c.id,
          label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''}`,
        })),
    [currencies]
  )

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      unitId.trim() !== '' &&
      amount.trim() !== '' &&
      parseFloat(amount) > 0 &&
      currencyId.trim() !== '' &&
      paymentMethod !== '' &&
      paymentDate.trim() !== ''
    )
  }, [unitId, amount, currencyId, paymentMethod, paymentDate])

  // Submit handler
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!isFormValid) return

      const data: TPaymentCreate = {
        userId,
        unitId,
        amount,
        currencyId,
        paymentMethod: paymentMethod as TPaymentMethodOption,
        paymentDate,
        status: 'pending_verification',
        paymentNumber: null,
        paidAmount: null,
        paidCurrencyId: null,
        exchangeRate: null,
        paymentGatewayId: null,
        paymentDetails: null,
        receiptUrl: null,
        receiptNumber: receiptNumber.trim() || null,
        notes: notes.trim() || null,
        metadata: null,
        registeredBy: userId,
      }

      reportPayment.mutate(data)
    },
    [
      isFormValid,
      userId,
      unitId,
      amount,
      currencyId,
      paymentMethod,
      paymentDate,
      receiptNumber,
      notes,
      reportPayment,
    ]
  )

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Button
        as={Link}
        className="mb-4"
        href="/dashboard/my-payments"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        variant="light"
      >
        {t('resident.reportPayment.backToPayments')}
      </Button>

      <Card>
        <CardHeader className="px-6 pt-6">
          <Typography variant="h3">{t('resident.reportPayment.formTitle')}</Typography>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Unit select */}
            <Select
              isRequired
              items={unitSelectItems}
              label={t('resident.reportPayment.fields.unit')}
              placeholder={t('resident.reportPayment.fields.unitPlaceholder')}
              value={unitId}
              onChange={(key) => setUnitId(key ?? '')}
            />

            {/* Amount */}
            <Input
              isRequired
              label={t('resident.reportPayment.fields.amount')}
              placeholder="0.00"
              type="number"
              value={amount}
              onValueChange={setAmount}
              inputMode="decimal"
            />

            {/* Currency */}
            {currenciesLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <Typography color="muted" variant="body2">
                  {t('resident.reportPayment.fields.loadingCurrencies')}
                </Typography>
              </div>
            ) : (
              <Select
                isRequired
                items={currencySelectItems}
                label={t('resident.reportPayment.fields.currency')}
                placeholder={t('resident.reportPayment.fields.currencyPlaceholder')}
                value={currencyId}
                onChange={(key) => setCurrencyId(key ?? '')}
              />
            )}

            {/* Payment Method */}
            <Select
              isRequired
              items={paymentMethodItems}
              label={t('resident.reportPayment.fields.paymentMethod')}
              placeholder={t('resident.reportPayment.fields.paymentMethodPlaceholder')}
              value={paymentMethod}
              onChange={(key) => setPaymentMethod((key ?? '') as TPaymentMethodOption | '')}
            />

            {/* Payment Date */}
            <Input
              isRequired
              label={t('resident.reportPayment.fields.paymentDate')}
              type="date"
              value={paymentDate}
              onValueChange={setPaymentDate}
            />

            {/* Receipt Number (optional) */}
            <Input
              label={t('resident.reportPayment.fields.receiptNumber')}
              placeholder={t('resident.reportPayment.fields.receiptNumberPlaceholder')}
              value={receiptNumber}
              onValueChange={setReceiptNumber}
            />

            {/* Notes (optional) */}
            <Textarea
              label={t('resident.reportPayment.fields.notes')}
              placeholder={t('resident.reportPayment.fields.notesPlaceholder')}
              value={notes}
              onValueChange={setNotes}
              minRows={3}
              maxRows={6}
            />

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                as={Link}
                href="/dashboard/my-payments"
                variant="flat"
              >
                {t('common.cancel')}
              </Button>
              <Button
                color="primary"
                isDisabled={!isFormValid}
                isLoading={reportPayment.isPending}
                type="submit"
              >
                {t('resident.reportPayment.submit')}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
