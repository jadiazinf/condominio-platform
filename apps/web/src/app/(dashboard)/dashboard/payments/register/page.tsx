'use client'

import type { TPaymentCreate } from '@packages/domain'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Search, Check } from 'lucide-react'
import {
  useCompanyCondominiumsPaginated,
  useCondominiumUnits,
  useActiveCurrencies,
  useBanks,
  useMyCompanyBankAccountsPaginated,
  useQuotasPendingByUnit,
  useCreatePayment,
  verifyPaymentReference,
} from '@packages/http-client'

import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Input, CurrencyInput } from '@/ui/components/input'
import { DatePicker } from '@/ui/components/date-picker'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Textarea } from '@/ui/components/textarea'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { useUser, useSessionStore } from '@/stores'

type TPaymentMethodOption = 'transfer' | 'cash' | 'card' | 'mobile_payment' | 'other'

const TOTAL_STEPS = 3

export default function RegisterPaymentPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const { user } = useUser()
  const managementCompanies = useSessionStore(s => s.managementCompanies)

  const managementCompanyId = managementCompanies?.[0]?.managementCompanyId ?? ''

  // Step state
  const [currentStep, setCurrentStep] = useState(0)

  // Form state
  const [condominiumId, setCondominiumId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [userId, setUserId] = useState('')
  const [quotaId, setQuotaId] = useState('')
  const [senderBankId, setSenderBankId] = useState('')
  const [destinationBankAccountId, setDestinationBankAccountId] = useState('')
  const [externalReference, setExternalReference] = useState('')
  const [amount, setAmount] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<TPaymentMethodOption | ''>('')
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')

  // Verification state
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    found: boolean
    verifiedAmount: string | null
  } | null>(null)

  // Data fetching
  const { data: condominiumsData, isLoading: condosLoading } = useCompanyCondominiumsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100 },
    enabled: !!managementCompanyId,
  })
  const condominiums = condominiumsData?.data ?? []

  const { data: unitsData, isLoading: unitsLoading } = useCondominiumUnits({
    condominiumId,
    managementCompanyId,
    enabled: !!condominiumId,
  })
  const units = unitsData?.data ?? []

  const { data: currenciesData } = useActiveCurrencies()
  const currencies = currenciesData?.data ?? []

  const { data: banksData } = useBanks({ country: 'VE' })
  const banks = banksData?.data ?? []

  const { data: bankAccountsData } = useMyCompanyBankAccountsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100, isActive: true },
    enabled: !!managementCompanyId,
  })
  const bankAccounts = bankAccountsData?.data ?? []

  const { data: quotasData, isLoading: quotasLoading } = useQuotasPendingByUnit(unitId, {
    enabled: !!unitId,
  })
  const pendingQuotas = quotasData?.data ?? []

  // Mutation
  const createPayment = useCreatePayment({
    onSuccess: () => {
      toast.success(t('admin.payments.register.success'))
      router.push('/dashboard/payments')
    },
    onError: () => {
      toast.error(t('admin.payments.register.error'))
    },
  })

  // Select items
  const condominiumSelectItems: ISelectItem[] = useMemo(
    () => condominiums.map((c: any) => ({ key: c.id, label: c.name })),
    [condominiums]
  )

  const unitSelectItems: ISelectItem[] = useMemo(
    () =>
      units.map((u: any) => ({
        key: u.id,
        label: `${u.unitNumber}${u.building ? ` - ${u.building.name}` : ''}`,
      })),
    [units]
  )

  const paymentMethodItems: ISelectItem[] = useMemo(
    () => [
      { key: 'transfer', label: t('admin.payments.register.methods.transfer') },
      { key: 'cash', label: t('admin.payments.register.methods.cash') },
      { key: 'card', label: t('admin.payments.register.methods.card') },
      { key: 'mobile_payment', label: t('admin.payments.register.methods.mobile_payment') },
      { key: 'other', label: t('admin.payments.register.methods.other') },
    ],
    [t]
  )

  const selectedCurrency = useMemo(
    () => currencies.find((c: any) => c.id === currencyId),
    [currencies, currencyId]
  )

  const bankSelectItems: ISelectItem[] = useMemo(
    () => banks.map((b: any) => ({ key: b.id, label: b.name })),
    [banks]
  )

  const bankAccountSelectItems: ISelectItem[] = useMemo(
    () =>
      bankAccounts.map((ba: any) => {
        const accNum = ba.accountDetails?.accountNumber ?? ba.accountNumber
        const lastFour = accNum ? `****${accNum.slice(-4)}` : ''

        return {
          key: ba.id,
          label: `${ba.bankName}${lastFour ? ` - ${lastFour}` : ''}`,
        }
      }),
    [bankAccounts]
  )

  const quotaSelectItems: ISelectItem[] = useMemo(
    () =>
      pendingQuotas.map((q: any) => {
        const conceptName = q.paymentConcept?.name ?? ''
        const period = q.periodMonth ? `${q.periodMonth}/${q.periodYear}` : `${q.periodYear}`

        return {
          key: q.id,
          label: `${conceptName} - ${period} (${q.balance})`,
        }
      }),
    [pendingQuotas]
  )

  // Step validation
  const isStep1Valid = useMemo(
    () => condominiumId.trim() !== '' && unitId.trim() !== '' && quotaId.trim() !== '',
    [condominiumId, unitId, quotaId]
  )

  const isStep2Valid = useMemo(
    () =>
      senderBankId.trim() !== '' &&
      destinationBankAccountId.trim() !== '' &&
      externalReference.trim() !== '',
    [senderBankId, destinationBankAccountId, externalReference]
  )

  const isStep3Valid = useMemo(
    () =>
      amount.trim() !== '' &&
      parseFloat(amount) > 0 &&
      currencyId.trim() !== '' &&
      paymentMethod !== '' &&
      paymentDate.trim() !== '',
    [amount, currencyId, paymentMethod, paymentDate]
  )

  const canVerify = useMemo(
    () => externalReference.trim() !== '' && destinationBankAccountId.trim() !== '',
    [externalReference, destinationBankAccountId]
  )

  const isCurrentStepValid = [isStep1Valid, isStep2Valid, isStep3Valid][currentStep]

  // Handlers
  const handleCondominiumChange = useCallback((key: string | null) => {
    setCondominiumId(key ?? '')
    setUnitId('')
    setUserId('')
    setQuotaId('')
  }, [])

  const handleUnitChange = useCallback(
    (key: string | null) => {
      setUnitId(key ?? '')
      setQuotaId('')
      const unit = units.find((u: any) => u.id === key)

      if (unit && (unit as any).ownerships?.length > 0) {
        setUserId((unit as any).ownerships[0].userId)
      } else {
        setUserId('')
      }
    },
    [units]
  )

  const handleDestinationBankChange = useCallback(
    (key: string | null) => {
      setDestinationBankAccountId(key ?? '')
      const ba = bankAccounts.find((b: any) => b.id === key)

      if (ba?.currencyId) {
        setCurrencyId(ba.currencyId)
      } else {
        setCurrencyId('')
      }
    },
    [bankAccounts]
  )

  const handleVerifyReference = useCallback(async () => {
    if (!canVerify) return

    setVerifying(true)
    setVerificationResult(null)

    try {
      const selectedBank = banks.find((b: any) => b.id === senderBankId)
      const result = await verifyPaymentReference({
        externalReference: externalReference.trim(),
        bankAccountId: destinationBankAccountId,
        senderBankCode: selectedBank?.code ?? undefined,
        transactionDate: paymentDate || undefined,
      })

      setVerificationResult({ found: result.found, verifiedAmount: result.verifiedAmount })

      if (result.found) {
        if (result.verifiedAmount && !amount) {
          setAmount(result.verifiedAmount)
        }
        toast.success(t('admin.payments.register.verification.found'))
      } else {
        toast.error(t('admin.payments.register.verification.notFound'))
      }
    } catch {
      toast.error(t('admin.payments.register.verification.error'))
    } finally {
      setVerifying(false)
    }
  }, [
    canVerify,
    externalReference,
    destinationBankAccountId,
    senderBankId,
    paymentDate,
    banks,
    t,
    toast,
  ])

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) setCurrentStep(s => s + 1)
  }, [currentStep])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }, [currentStep])

  // Submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!isStep1Valid || !isStep2Valid || !isStep3Valid || !user) return

      const resolvedUserId = userId || user.id

      const data: TPaymentCreate & { externalReference?: string; condominiumId?: string } = {
        userId: resolvedUserId,
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
        receiptNumber: externalReference.trim() || null,
        notes: notes.trim() || null,
        metadata: null,
        registeredBy: user.id,
      }

      if (externalReference.trim()) {
        data.externalReference = externalReference.trim()
        data.condominiumId = condominiumId
      }

      createPayment.mutate(data)
    },
    [
      isStep1Valid,
      isStep2Valid,
      isStep3Valid,
      user,
      userId,
      unitId,
      amount,
      currencyId,
      paymentMethod,
      paymentDate,
      externalReference,
      condominiumId,
      notes,
      createPayment,
    ]
  )

  // Step definitions
  const steps = [
    {
      title: t('admin.payments.register.steps.unit'),
      description: t('admin.payments.register.steps.unitDescription'),
    },
    {
      title: t('admin.payments.register.steps.bank'),
      description: t('admin.payments.register.steps.bankDescription'),
    },
    {
      title: t('admin.payments.register.steps.payment'),
      description: t('admin.payments.register.steps.paymentDescription'),
    },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        as={Link}
        className="mb-4"
        href="/dashboard/payments"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        variant="light"
      >
        {t('admin.payments.register.back')}
      </Button>

      <Card>
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <CreditCard className="text-primary" size={24} />
            <div>
              <Typography variant="h3">{t('admin.payments.register.title')}</Typography>
              <Typography color="muted" variant="body2">
                {t('admin.payments.register.subtitle')}
              </Typography>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <button
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      index < currentStep
                        ? 'cursor-pointer bg-success text-success-foreground'
                        : index === currentStep
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-default-200 text-default-500'
                    }`}
                    type="button"
                    onClick={() => {
                      // Only allow going to completed steps or current
                      if (index < currentStep) setCurrentStep(index)
                    }}
                  >
                    {index < currentStep ? <Check size={14} /> : index + 1}
                  </button>
                  <span
                    className={`text-center text-xs ${
                      index === currentStep ? 'font-medium text-foreground' : 'text-default-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mb-5 h-px flex-1 ${
                      index < currentStep ? 'bg-success' : 'bg-default-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step description */}
          <Typography className="mb-5" color="muted" variant="body2">
            {steps[currentStep].description}
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Unit & Quota */}
            {currentStep === 0 && (
              <div className="space-y-5">
                {/* Condominium + Unit */}
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    {condosLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Spinner size="sm" />
                        <Typography color="muted" variant="body2">
                          {t('admin.payments.register.loadingCondominiums')}
                        </Typography>
                      </div>
                    ) : (
                      <Select
                        isRequired
                        items={condominiumSelectItems}
                        label={t('admin.payments.register.fields.condominium')}
                        placeholder={t('admin.payments.register.fields.condominiumPlaceholder')}
                        value={condominiumId}
                        onChange={handleCondominiumChange}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    {condominiumId ? (
                      unitsLoading ? (
                        <div className="flex items-center gap-2 py-2">
                          <Spinner size="sm" />
                          <Typography color="muted" variant="body2">
                            {t('admin.payments.register.loadingUnits')}
                          </Typography>
                        </div>
                      ) : (
                        <Select
                          isRequired
                          items={unitSelectItems}
                          label={t('admin.payments.register.fields.unit')}
                          placeholder={t('admin.payments.register.fields.unitPlaceholder')}
                          value={unitId}
                          onChange={handleUnitChange}
                        />
                      )
                    ) : (
                      <Select
                        isDisabled
                        items={[]}
                        label={t('admin.payments.register.fields.unit')}
                        placeholder={t('admin.payments.register.fields.condominiumPlaceholder')}
                        value=""
                        onChange={() => {}}
                      />
                    )}
                  </div>
                </div>

                {/* Quota */}
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    {unitId ? (
                      quotasLoading ? (
                        <div className="flex items-center gap-2 py-2">
                          <Spinner size="sm" />
                          <Typography color="muted" variant="body2">
                            {t('admin.payments.register.fields.loadingQuotas')}
                          </Typography>
                        </div>
                      ) : pendingQuotas.length > 0 ? (
                        <Select
                          isRequired
                          items={quotaSelectItems}
                          label={t('admin.payments.register.fields.quota')}
                          placeholder={t('admin.payments.register.fields.quotaPlaceholder')}
                          value={quotaId}
                          onChange={key => setQuotaId(key ?? '')}
                        />
                      ) : (
                        <Select
                          isDisabled
                          items={[]}
                          label={t('admin.payments.register.fields.quota')}
                          placeholder={t('admin.payments.register.fields.noQuotas')}
                          value=""
                          onChange={() => {}}
                        />
                      )
                    ) : (
                      <Select
                        isDisabled
                        items={[]}
                        label={t('admin.payments.register.fields.quota')}
                        placeholder={t('admin.payments.register.fields.unitPlaceholder')}
                        value=""
                        onChange={() => {}}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Bank Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                {/* Sender Bank */}
                <Select
                  isRequired
                  items={bankSelectItems}
                  label={t('admin.payments.register.fields.senderBank')}
                  placeholder={t('admin.payments.register.fields.senderBankPlaceholder')}
                  value={senderBankId}
                  onChange={key => setSenderBankId(key ?? '')}
                />

                {/* Destination Bank */}
                {bankAccounts.length > 0 ? (
                  <Select
                    isRequired
                    items={bankAccountSelectItems}
                    label={t('admin.payments.register.fields.destinationBank')}
                    placeholder={t('admin.payments.register.fields.destinationBankPlaceholder')}
                    value={destinationBankAccountId}
                    onChange={handleDestinationBankChange}
                  />
                ) : (
                  <Select
                    isDisabled
                    items={[]}
                    label={t('admin.payments.register.fields.destinationBank')}
                    placeholder={t('admin.payments.register.fields.noDestinationBanks')}
                    value=""
                    onChange={() => {}}
                  />
                )}

                {/* Reference */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      isRequired
                      label={t('admin.payments.register.fields.externalReference')}
                      placeholder={t('admin.payments.register.fields.externalReferencePlaceholder')}
                      tooltip={t('admin.payments.register.verification.tooltip')}
                      value={externalReference}
                      onValueChange={v => {
                        setExternalReference(v)
                        setVerificationResult(null)
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      isIconOnly
                      color={verificationResult?.found ? 'success' : 'primary'}
                      isDisabled={!canVerify}
                      isLoading={verifying}
                      title={t('admin.payments.register.verification.button')}
                      variant="flat"
                      onPress={handleVerifyReference}
                    >
                      <Search size={16} />
                    </Button>
                  </div>
                </div>

                {/* Verification result */}
                {verificationResult && (
                  <div
                    className={`flex items-center gap-2 rounded-md p-2 ${
                      verificationResult.found ? 'bg-success-50' : 'bg-warning-50'
                    }`}
                  >
                    <Chip
                      color={verificationResult.found ? 'success' : 'warning'}
                      size="sm"
                      variant="flat"
                    >
                      {verificationResult.found
                        ? t('admin.payments.register.verification.found')
                        : t('admin.payments.register.verification.notFound')}
                    </Chip>
                    {verificationResult.found && verificationResult.verifiedAmount && (
                      <Typography className="text-success-700 text-xs" variant="body2">
                        {t('admin.payments.register.verification.amount')}:{' '}
                        {verificationResult.verifiedAmount}
                      </Typography>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Payment Details */}
            {currentStep === 2 && (
              <div className="space-y-5">
                {/* Amount */}
                <CurrencyInput
                  isRequired
                  currencySymbol={
                    selectedCurrency?.symbol ? (
                      <span className="text-default-400 text-sm">{selectedCurrency.symbol}</span>
                    ) : undefined
                  }
                  label={t('admin.payments.register.fields.amount')}
                  value={amount}
                  onValueChange={setAmount}
                />

                {/* Payment Method + Payment Date */}
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <Select
                      isRequired
                      items={paymentMethodItems}
                      label={t('admin.payments.register.fields.paymentMethod')}
                      placeholder={t('admin.payments.register.fields.paymentMethodPlaceholder')}
                      value={paymentMethod}
                      onChange={key => setPaymentMethod((key ?? '') as TPaymentMethodOption | '')}
                    />
                  </div>
                  <div className="flex-1">
                    <DatePicker
                      isRequired
                      label={t('admin.payments.register.fields.paymentDate')}
                      value={paymentDate}
                      onChange={setPaymentDate}
                    />
                  </div>
                </div>

                {/* Notes */}
                <Textarea
                  label={t('admin.payments.register.fields.notes')}
                  maxRows={6}
                  minRows={3}
                  placeholder={t('admin.payments.register.fields.notesPlaceholder')}
                  value={notes}
                  onValueChange={setNotes}
                />
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex justify-between">
              <div>
                {currentStep > 0 && (
                  <Button variant="flat" onPress={handlePrevious}>
                    {t('admin.payments.register.previous')}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button as={Link} href="/dashboard/payments" variant="flat">
                  {t('common.cancel')}
                </Button>
                {currentStep < TOTAL_STEPS - 1 ? (
                  <Button color="primary" isDisabled={!isCurrentStepValid} onPress={handleNext}>
                    {t('admin.payments.register.next')}
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    isDisabled={!isStep3Valid}
                    isLoading={createPayment.isPending}
                    type="submit"
                  >
                    {t('admin.payments.register.submit')}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
