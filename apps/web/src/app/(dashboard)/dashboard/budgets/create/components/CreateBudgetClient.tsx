'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useCreateBudget, useCurrencies, budgetKeys } from '@packages/http-client'
import { useQueryClient } from '@tanstack/react-query'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Textarea } from '@/ui/components/textarea'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  back: string
  form: {
    name: string
    namePlaceholder: string
    description: string
    type: string
    year: string
    month: string
    currency: string
    reserveFund: string
    notes: string
  }
  items: {
    title: string
    add: string
    description: string
    amount: string
    remove: string
  }
  submit: string
  success: string
  error: string
  types: Record<string, string>
  months: Record<string, string>
}

interface IItemRow {
  id: number
  description: string
  budgetedAmount: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreateBudgetClient({ translations: t }: { translations: ITranslations }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budgetType, setBudgetType] = useState('monthly')
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1)
  const [currencyId, setCurrencyId] = useState('')
  const [reserveFundPercentage, setReserveFundPercentage] = useState('0')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<IItemRow[]>([{ id: 1, description: '', budgetedAmount: '' }])
  const [errorMsg, setErrorMsg] = useState('')
  let nextId = items.length + 1

  const { data: currenciesData } = useCurrencies()
  const currencies = currenciesData?.data ?? []

  const { mutate: createBudget, isPending } = useCreateBudget({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
      router.push('/dashboard/budgets')
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || t.error)
    },
  })

  const typeItems: ISelectItem[] = [
    { key: 'monthly', label: t.types.monthly },
    { key: 'quarterly', label: t.types.quarterly },
    { key: 'annual', label: t.types.annual },
  ]

  const monthItems: ISelectItem[] = Array.from({ length: 12 }, (_, i) => ({
    key: String(i + 1),
    label: t.months[String(i + 1)] ?? String(i + 1),
  }))

  const currencyItems: ISelectItem[] = currencies.map(
    (c: { id: string; code: string; name: string }) => ({
      key: c.id,
      label: `${c.code} — ${c.name}`,
    })
  )

  const addItem = () => {
    setItems(prev => [...prev, { id: ++nextId, description: '', budgetedAmount: '' }])
  }

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateItem = (id: number, field: 'description' | 'budgetedAmount', value: string) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const handleSubmit = () => {
    setErrorMsg('')
    const validItems = items.filter(i => i.description && i.budgetedAmount)

    if (!name || !currencyId || validItems.length === 0) {
      setErrorMsg(t.error)

      return
    }

    createBudget({
      name,
      description: description || null,
      budgetType: budgetType as 'monthly' | 'quarterly' | 'annual',
      periodYear,
      periodMonth: budgetType === 'annual' ? null : periodMonth,
      currencyId,
      reserveFundPercentage: reserveFundPercentage || null,
      notes: notes || null,
      metadata: null,
      items: validItems.map(i => ({
        expenseCategoryId: null,
        description: i.description,
        budgetedAmount: i.budgetedAmount,
        notes: null,
      })),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          isIconOnly
          className="mt-1 shrink-0"
          variant="light"
          onPress={() => router.push('/dashboard/budgets')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <Typography className="break-words" variant="h2">
            {t.title}
          </Typography>
          <Typography className="mt-1" color="muted">
            {t.subtitle}
          </Typography>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label={t.form.name}
          placeholder={t.form.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          label={t.form.description}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <Select
          items={typeItems}
          label={t.form.type}
          selectedKeys={[budgetType]}
          onSelectionChange={(keys: any) => {
            const selected = Array.isArray(keys) ? keys[0] : keys

            if (selected) setBudgetType(String(selected))
          }}
        />
        <Input
          label={t.form.year}
          type="number"
          value={String(periodYear)}
          onChange={e => setPeriodYear(Number(e.target.value))}
        />
        {budgetType !== 'annual' && (
          <Select
            items={monthItems}
            label={t.form.month}
            selectedKeys={[String(periodMonth)]}
            onSelectionChange={(keys: any) => {
              const selected = Array.isArray(keys) ? keys[0] : keys

              if (selected) setPeriodMonth(Number(selected))
            }}
          />
        )}
        <Select
          items={currencyItems}
          label={t.form.currency}
          selectedKeys={currencyId ? [currencyId] : []}
          onSelectionChange={(keys: any) => {
            const selected = Array.isArray(keys) ? keys[0] : keys

            if (selected) setCurrencyId(String(selected))
          }}
        />
        <Input
          endContent={<span className="text-gray-400">%</span>}
          label={t.form.reserveFund}
          type="number"
          value={reserveFundPercentage}
          onChange={e => setReserveFundPercentage(e.target.value)}
        />
      </div>

      <Textarea
        label={t.form.notes}
        minRows={2}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      {/* Items */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Typography variant="subtitle1">{t.items.title}</Typography>
          <Button
            size="sm"
            startContent={<Plus className="h-4 w-4" />}
            variant="flat"
            onPress={addItem}
          >
            {t.items.add}
          </Button>
        </div>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label={t.items.description}
                  value={item.description}
                  onChange={e => updateItem(item.id, 'description', e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label={t.items.amount}
                  type="number"
                  value={item.budgetedAmount}
                  onChange={e => updateItem(item.id, 'budgetedAmount', e.target.value)}
                />
              </div>
              {items.length > 1 && (
                <Button
                  isIconOnly
                  color="danger"
                  size="sm"
                  variant="light"
                  onPress={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <Typography color="danger">{errorMsg}</Typography>
        </div>
      )}

      <Button
        className="w-full sm:w-auto"
        color="primary"
        isLoading={isPending}
        onPress={handleSubmit}
      >
        {t.submit}
      </Button>
    </div>
  )
}
