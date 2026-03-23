'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileSpreadsheet, CheckCircle2, AlertCircle, Eye, Users } from 'lucide-react'
import {
  useBulkGenerateReceipts,
  useCurrencies,
  useBudgets,
  receiptKeys,
} from '@packages/http-client'
import { useQueryClient } from '@tanstack/react-query'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  back: string
  form: {
    periodYear: string
    periodMonth: string
    currency: string
    budget: string
  }
  bulkGenerate: string
  success: string
  error: string
  result: {
    generated: string
    failed: string
    total: string
    errors: string
  }
  months: Record<string, string>
  preview?: {
    title: string
    subtitle: string
    unitCount: string
    confirm: string
    cancel: string
  }
}

interface IBulkResult {
  generated: number
  failed: number
  total: number
  errors: Array<{ unitId: string; unitNumber: string; error: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GenerateReceiptsClient({ translations: t }: { translations: ITranslations }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1)
  const [currencyId, setCurrencyId] = useState('')
  const [budgetId, setBudgetId] = useState('')
  const [result, setResult] = useState<IBulkResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const { data: currenciesData } = useCurrencies()
  const currencies = currenciesData?.data ?? []

  const { data: budgetsData } = useBudgets()
  const budgetsList = budgetsData?.data ?? []

  const { mutate: bulkGenerate, isPending } = useBulkGenerateReceipts({
    onSuccess: res => {
      const resultData = res?.data?.data

      if (resultData) {
        setResult(resultData)
        setShowPreview(false)
        queryClient.invalidateQueries({ queryKey: receiptKeys.all })
      }
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || t.error)
    },
  })

  const currencyItems: ISelectItem[] = currencies.map(
    (c: { id: string; code: string; name: string }) => ({
      key: c.id,
      label: `${c.code} — ${c.name}`,
    })
  )

  const monthItems: ISelectItem[] = Array.from({ length: 12 }, (_, i) => ({
    key: String(i + 1),
    label: t.months[String(i + 1)] ?? String(i + 1),
  }))

  const budgetItems: ISelectItem[] = [
    { key: '', label: '—' },
    ...budgetsList.map((b: { id: string; name: string }) => ({
      key: b.id,
      label: b.name,
    })),
  ]

  const handlePreview = () => {
    setErrorMsg('')
    setResult(null)
    if (!currencyId) {
      setErrorMsg(t.error)

      return
    }
    setShowPreview(true)
  }

  const handleConfirmGenerate = () => {
    bulkGenerate({
      periodYear,
      periodMonth,
      currencyId,
      budgetId: budgetId || null,
    })
  }

  const selectedMonthLabel = t.months[String(periodMonth)] ?? String(periodMonth)
  const selectedCurrency = currencies.find((c: any) => c.id === currencyId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="light" onPress={() => router.push('/dashboard/receipts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <Typography variant="h2">{t.title}</Typography>
          <Typography className="mt-1" color="muted">
            {t.subtitle}
          </Typography>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label={t.form.periodYear}
          type="number"
          value={String(periodYear)}
          onChange={e => setPeriodYear(Number(e.target.value))}
        />
        <Select
          items={monthItems}
          label={t.form.periodMonth}
          selectedKeys={[String(periodMonth)]}
          onSelectionChange={(keys: any) => {
            const selected = Array.isArray(keys) ? keys[0] : keys

            if (selected) setPeriodMonth(Number(selected))
          }}
        />
        <Select
          items={currencyItems}
          label={t.form.currency}
          selectedKeys={currencyId ? [currencyId] : []}
          onSelectionChange={(keys: any) => {
            const selected = Array.isArray(keys) ? keys[0] : keys

            if (selected) setCurrencyId(String(selected))
          }}
        />
        <Select
          items={budgetItems}
          label={t.form.budget}
          selectedKeys={budgetId ? [budgetId] : ['']}
          onSelectionChange={(keys: any) => {
            const selected = Array.isArray(keys) ? keys[0] : keys

            setBudgetId(selected ? String(selected) : '')
          }}
        />
      </div>

      {!showPreview && !result && (
        <Button color="primary" startContent={<Eye className="h-4 w-4" />} onPress={handlePreview}>
          {t.preview?.title ?? 'Vista Previa'}
        </Button>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <Typography color="danger">{errorMsg}</Typography>
        </div>
      )}

      {/* Preview Step */}
      {showPreview && (
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <Typography variant="subtitle1">
              {t.preview?.title ?? 'Vista Previa de Generación'}
            </Typography>
          </div>

          <Typography color="muted">
            {t.preview?.subtitle ?? 'Se generarán recibos para las siguientes unidades:'}
          </Typography>

          {/* Summary */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <Typography color="muted" variant="caption">
                {t.form.periodMonth}
              </Typography>
              <Typography variant="subtitle2">
                {selectedMonthLabel} {periodYear}
              </Typography>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <Typography color="muted" variant="caption">
                {t.form.currency}
              </Typography>
              <Typography variant="subtitle2">
                {selectedCurrency
                  ? `${(selectedCurrency as any).code} — ${(selectedCurrency as any).name}`
                  : '—'}
              </Typography>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              color="primary"
              isLoading={isPending}
              startContent={<FileSpreadsheet className="h-4 w-4" />}
              onPress={handleConfirmGenerate}
            >
              {t.preview?.confirm ?? t.bulkGenerate}
            </Button>
            <Button variant="flat" onPress={() => setShowPreview(false)}>
              {t.preview?.cancel ?? 'Cancelar'}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <Typography variant="subtitle2">{t.result.generated}</Typography>
              </div>
              <Typography className="mt-2" variant="h3">
                {result.generated}
              </Typography>
            </div>
            <div className="rounded-lg border bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <Typography variant="subtitle2">{t.result.failed}</Typography>
              </div>
              <Typography className="mt-2" variant="h3">
                {result.failed}
              </Typography>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4">
              <Typography variant="subtitle2">{t.result.total}</Typography>
              <Typography className="mt-2" variant="h3">
                {result.total}
              </Typography>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <Typography className="mb-2" variant="subtitle2">
                {t.result.errors}
              </Typography>
              <ul className="space-y-1 text-sm">
                {result.errors.map((err, idx) => (
                  <li key={idx} className="text-red-700">
                    {err.unitNumber}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
