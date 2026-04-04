'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Info } from 'lucide-react'
import {
  useBillingConcepts,
  useActiveCurrencies,
  usePreviewBilling,
  useGenerateBilling,
  useAssemblyMinutes,
} from '@packages/http-client'
import type { IPreviewResult } from '@packages/http-client'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Stepper } from '@/ui/components/stepper'
import { Tooltip } from '@/ui/components/tooltip'
import type { ISelectItem } from '@/ui/components/select'
import type { IStepItem } from '@/ui/components/stepper'

import { PreviewModal } from './components/PreviewModal'
import { StepConfig } from './components/StepConfig'
import { StepConcepts } from './components/StepConcepts'
import { StepReview } from './components/StepReview'

// ─── Zod Schema ───

const conceptSchema = z.object({
  chargeTypeId: z.string().min(1, 'validation.required'),
  amount: z.string().min(1, 'validation.required').refine(v => Number(v) > 0, 'validation.positive'),
  description: z.string().optional(),
  documentUrl: z.string().optional(),
  documentFileName: z.string().optional(),
})

const generateReceiptSchema = z.object({
  // Step 1: Config
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  dueDay: z.number().int().min(1).max(28),
  distributionMethod: z.enum(['by_aliquot', 'equal_split', 'fixed_per_unit']),
  currencyId: z.string().uuid('validation.required'),
  assemblyMinuteId: z.string().optional(),
  // Step 2: Concepts
  concepts: z.array(conceptSchema)
    .min(1, 'validation.minOneConcept')
    .refine(
      (concepts) => {
        const ids = concepts.map(c => c.chargeTypeId).filter(Boolean)
        return new Set(ids).size === ids.length
      },
      { message: 'validation.duplicateConcepts' }
    ),
})

export type TGenerateReceiptForm = z.infer<typeof generateReceiptSchema>

// ─── Step keys ───

type TWizardStep = 'config' | 'concepts' | 'review'
const STEP_ORDER: TWizardStep[] = ['config', 'concepts', 'review']

const STEP_FIELDS: Record<TWizardStep, (keyof TGenerateReceiptForm)[]> = {
  config: ['periodYear', 'periodMonth', 'dueDay', 'distributionMethod', 'currencyId'],
  concepts: ['concepts'],
  review: [],
}

// ─── Component ───

interface GenerateReceiptsClientProps {
  condominiumId: string
  condominiumName: string
}

export function GenerateReceiptsClient({ condominiumId, condominiumName }: GenerateReceiptsClientProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const toast = useToast()
  const p = 'admin.receipts.generate'

  // ─── Form ───
  const form = useForm<TGenerateReceiptForm>({
    resolver: zodResolver(generateReceiptSchema),
    defaultValues: {
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
      dueDay: 15,
      distributionMethod: 'by_aliquot',
      currencyId: '',
      assemblyMinuteId: '',
      concepts: [{ chargeTypeId: '', amount: '', description: '' }],
    },
    mode: 'onTouched',
  })

  // ─── Concept Files (stored outside RHF — File objects can't go through Zod) ───
  const conceptFilesRef = useRef<Map<number, File>>(new Map())
  const setConceptFile = useCallback((index: number, file: File | null) => {
    if (file) {
      conceptFilesRef.current.set(index, file)
    } else {
      conceptFilesRef.current.delete(index)
    }
  }, [])

  // ─── Wizard State ───
  const [currentStep, setCurrentStep] = useState<TWizardStep>('config')
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<IPreviewResult | null>(null)

  // ─── Auto-select currency (prefer VES/Bolívar) ───
  const { data: currenciesData } = useActiveCurrencies()
  const currencies = currenciesData?.data ?? []

  const currencyId = form.watch('currencyId')

  useEffect(() => {
    if (currencies.length > 0 && !currencyId) {
      const ves = currencies.find((c: any) => c.code === 'VES' || c.code === 'VEF' || c.name?.toLowerCase().includes('bolívar'))
      form.setValue('currencyId', ves?.id ?? currencies[0].id, { shouldValidate: true })
    }
  }, [currencies, currencyId, form])

  // ─── Data hooks ───
  const { data: conceptsData } = useBillingConcepts(condominiumId, { enabled: !!condominiumId })
  const chargeTypes = conceptsData?.data ?? []

  const { data: assemblyMinutesData } = useAssemblyMinutes()
  const assemblyMinutes = assemblyMinutesData?.data ?? []

  // ─── Mutations ───
  const { mutate: previewBilling, isPending: isPreviewing } = usePreviewBilling({
    onSuccess: (res) => {
      if (res.data?.data) {
        setPreviewData(res.data.data)
        setShowPreview(true)
      }
    },
    onError: () => toast.error(t(`${p}.error`)),
  })

  const { mutate: generateBilling, isPending: isGenerating } = useGenerateBilling({
    onSuccess: (res) => {
      toast.success(t(`${p}.success`))
      const warnings = res.data?.data?.warnings
      if (warnings?.length) {
        warnings.forEach((w: string) => toast.show(w, { duration: 6000 }))
      }
      router.push(`/dashboard/condominiums/${condominiumId}/receipts`)
    },
    onError: () => toast.error(t(`${p}.error`)),
  })

  // ─── Stepper ───
  const steps: IStepItem<TWizardStep>[] = useMemo(
    () => [
      { key: 'config', title: t(`${p}.steps.config`) },
      { key: 'concepts', title: t(`${p}.steps.concepts`) },
      { key: 'review', title: t(`${p}.steps.review`) },
    ],
    [t, p]
  )

  const currentIndex = STEP_ORDER.indexOf(currentStep)

  // ─── Select items ───
  const currencyItems: ISelectItem[] = currencies
    .map((c: any) => ({ key: c.id, label: `${c.symbol} — ${c.name}` }))
    .sort((a: ISelectItem, b: ISelectItem) => a.label.localeCompare(b.label))
  const distributionItems: ISelectItem[] = [
    { key: 'by_aliquot', label: t(`${p}.distributionMethods.by_aliquot`) },
    { key: 'equal_split', label: t(`${p}.distributionMethods.equal_split`) },
    { key: 'fixed_per_unit', label: t(`${p}.distributionMethods.fixed_per_unit`) },
  ]
  const yearItems: ISelectItem[] = Array.from({ length: 3 }, (_, i) => {
    const y = new Date().getFullYear() - 1 + i
    return { key: String(y), label: String(y) }
  })
  const monthItems: ISelectItem[] = Array.from({ length: 12 }, (_, i) => ({
    key: String(i + 1),
    label: t(`${p}.months.${i + 1}`),
  }))
  const dueDayItems: ISelectItem[] = Array.from({ length: 28 }, (_, i) => ({
    key: String(i + 1),
    label: String(i + 1),
  }))
  const chargeTypeItems: ISelectItem[] = chargeTypes.map((ct: any) => ({ key: ct.id, label: ct.name }))
  const assemblyMinuteItems: ISelectItem[] = assemblyMinutes
    .filter((am: any) => am.status === 'approved')
    .map((am: any) => ({
      key: am.id,
      label: am.title,
    }))

  // ─── Derived ───
  const selectedCurrency = currencies.find((c: any) => c.id === currencyId)
  const currencySymbol = selectedCurrency?.symbol ?? '$'
  const chargeTypeNames: Record<string, string> = useMemo(
    () => chargeTypes.reduce((acc: Record<string, string>, ct: any) => { acc[ct.id] = ct.name; return acc }, {}),
    [chargeTypes]
  )

  // ─── Navigation ───
  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[currentStep])
    if (valid && currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1])
    }
  }

  const goPrevious = () => {
    if (currentIndex > 0) setCurrentStep(STEP_ORDER[currentIndex - 1])
  }

  // ─── Handlers ───
  const handlePreview = () => {
    const values = form.getValues()
    previewBilling({
      condominiumId,
      distributionMethod: values.distributionMethod,
      chargeAmounts: values.concepts.map((c) => ({ chargeTypeId: c.chargeTypeId, amount: c.amount })),
    })
  }

  const onSubmit = (data: TGenerateReceiptForm) => {
    const formData = new FormData()

    // Add JSON data (without file blobs)
    const payload = {
      condominiumId,
      periodYear: data.periodYear,
      periodMonth: data.periodMonth,
      dueDay: data.dueDay,
      distributionMethod: data.distributionMethod,
      currencyId: data.currencyId,
      assemblyMinuteId: data.assemblyMinuteId || undefined,
      chargeAmounts: data.concepts.map((c) => ({
        chargeTypeId: c.chargeTypeId,
        amount: c.amount,
        description: c.description || undefined,
      })),
    }
    formData.append('data', JSON.stringify(payload))

    // Add files from the ref map
    conceptFilesRef.current.forEach((file, index) => {
      formData.append(`file_${index}`, file)
    })

    generateBilling(formData)
  }

  // ─── Render step content ───
  const renderStep = () => {
    switch (currentStep) {
      case 'config':
        return (
          <StepConfig
            yearItems={yearItems}
            monthItems={monthItems}
            dueDayItems={dueDayItems}
            distributionItems={distributionItems}
            currencyItems={currencyItems}
            assemblyMinuteItems={assemblyMinuteItems}
          />
        )

      case 'concepts':
        return (
          <StepConcepts
            chargeTypeItems={chargeTypeItems}
            currencySymbol={currencySymbol}
            conceptFiles={conceptFilesRef.current}
            onConceptFileChange={setConceptFile}
          />
        )

      case 'review':
        return (
          <StepReview
            condominiumName={condominiumName}
            distributionItems={distributionItems}
            currencyItems={currencyItems}
            assemblyMinuteItems={assemblyMinuteItems}
            chargeTypeNames={chargeTypeNames}
            currencySymbol={currencySymbol}
            onPreview={handlePreview}
            isPreviewing={isPreviewing}
            onGenerate={form.handleSubmit(onSubmit)}
            onPrevious={goPrevious}
            isGenerating={isGenerating}
          />
        )
    }
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-0" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}>
        {/* Back button */}
        <Button
          className="mb-2"
          href={`/dashboard/condominiums/${condominiumId}/receipts`}
          startContent={<ArrowLeft size={16} />}
          variant="light"
        >
          {t(`${p}.back`)}
        </Button>

        {/* Title */}
        <div>
          <div className="flex items-center gap-2">
            <Typography variant="h2">{t(`${p}.title`)}</Typography>
            <Tooltip showArrow content={t(`${p}.titleTooltip`)} placement="right" classNames={{ content: 'max-w-xs' }}>
              <Info className="h-5 w-5 text-default-400 cursor-help" />
            </Tooltip>
          </div>
          <Typography className="mt-1" color="muted">{t(`${p}.subtitle`)}</Typography>
        </div>

        {/* Stepper */}
        <Stepper
          color="primary"
          currentStep={currentStep}
          steps={steps}
          onStepChange={(key) => {
            const targetIndex = STEP_ORDER.indexOf(key)
            if (targetIndex <= currentIndex) setCurrentStep(key)
          }}
        />

        {/* Step content */}
        {renderStep()}

        {/* Navigation (hidden on review step — it has its own buttons) */}
        {currentStep !== 'review' && (
          <div className="flex justify-end gap-3">
            {currentIndex > 0 && (
              <Button variant="bordered" onPress={goPrevious}>
                {t(`${p}.previous`)}
              </Button>
            )}
            {currentIndex < STEP_ORDER.length - 1 && (
              <Button color="primary" onPress={goNext}>
                {t(`${p}.next`)}
              </Button>
            )}
          </div>
        )}

        {/* Preview Modal */}
        {previewData && (
          <PreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            previewData={previewData}
            onConfirm={() => { setShowPreview(false); form.handleSubmit(onSubmit)() }}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </FormProvider>
  )
}
