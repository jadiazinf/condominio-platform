'use client'

import { useFormContext } from 'react-hook-form'
import { Eye } from 'lucide-react'
import type { TGenerateReceiptForm } from '../GenerateReceiptsClient'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import type { ISelectItem } from '@/ui/components/select'

// ─── Props ───

interface IStepReviewProps {
  condominiumName: string
  distributionItems: ISelectItem[]
  currencyItems: ISelectItem[]
  assemblyMinuteItems: ISelectItem[]
  chargeTypeNames: Record<string, string>
  currencySymbol: string
  onPreview: () => void
  onGenerate: () => void
  onPrevious: () => void
  isPreviewing: boolean
  isGenerating: boolean
}

// ─── Component ───

export function StepReview({
  condominiumName,
  distributionItems,
  currencyItems,
  assemblyMinuteItems,
  chargeTypeNames,
  currencySymbol,
  onPreview,
  onGenerate,
  onPrevious,
  isPreviewing,
  isGenerating,
}: IStepReviewProps) {
  const { t } = useTranslation()
  const p = 'admin.receipts.generate'
  const { getValues, formState: { isValid } } = useFormContext<TGenerateReceiptForm>()

  const { periodYear, periodMonth, dueDay, distributionMethod, currencyId, assemblyMinuteId, concepts } = getValues()

  const distributionLabel = distributionItems.find((d) => d.key === distributionMethod)?.label ?? ''
  const currencyLabel = currencyItems.find((c) => c.key === currencyId)?.label ?? ''
  const assemblyMinuteLabel = assemblyMinuteId
    ? assemblyMinuteItems.find((a) => a.key === assemblyMinuteId)?.label ?? null
    : null

  const total = concepts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Period & Distribution summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Typography variant="h4">{t(`${p}.configTitle`)}</Typography>
          <div className="space-y-1">
            <SummaryRow label={t(`${p}.condominium`)} value={condominiumName} />
            <SummaryRow
              label={t(`${p}.period`)}
              value={`${t(`${p}.months.${periodMonth}`)} ${periodYear}`}
            />
            <SummaryRow label={t(`${p}.dueDay`)} value={String(dueDay)} />
          </div>
        </div>
        <div className="space-y-3">
          <Typography variant="h4">{t(`${p}.distributionMethod`)}</Typography>
          <div className="space-y-1">
            <SummaryRow label={t(`${p}.distributionMethod`)} value={distributionLabel} />
            <SummaryRow label={t(`${p}.currency`)} value={currencyLabel} />
            {assemblyMinuteLabel && (
              <SummaryRow label={t(`${p}.assemblyMinute`)} value={assemblyMinuteLabel} />
            )}
          </div>
        </div>
      </div>

      {/* Concepts summary */}
      <div className="space-y-3">
        <Typography variant="h4">{t(`${p}.conceptsTitle`)}</Typography>
        <div className="rounded-lg border border-default-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default-200 text-left">
                <th className="px-4 py-2 font-medium text-default-500">
                  {t(`${p}.concept`)}
                </th>
                <th className="px-4 py-2 font-medium text-default-500">
                  {t(`${p}.description`)}
                </th>
                <th className="px-4 py-2 text-right font-medium text-default-500">
                  {t(`${p}.amount`)}
                </th>
              </tr>
            </thead>
            <tbody>
              {concepts.map((c, index) => (
                <tr key={index} className="border-b border-default-100 last:border-0">
                  <td className="px-4 py-2">
                    {chargeTypeNames[c.chargeTypeId] || '-'}
                  </td>
                  <td className="px-4 py-2 text-default-500">{c.description || '-'}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {currencySymbol} {Number(c.amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-default-100">
                <td className="px-4 py-2 font-semibold" colSpan={2}>
                  {t(`${p}.total`)}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {currencySymbol} {total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="bordered" onPress={onPrevious}>
          {t(`${p}.previous`)}
        </Button>
        <Button
          variant="flat"
          color="primary"
          startContent={<Eye size={16} />}
          onPress={onPreview}
          isDisabled={!isValid}
          isLoading={isPreviewing}
        >
          {t(`${p}.preview`)}
        </Button>
        <Button
          color="primary"
          onPress={onGenerate}
          isDisabled={!isValid}
          isLoading={isGenerating}
        >
          {isGenerating ? t(`${p}.generating`) : t(`${p}.generate`)}
        </Button>
      </div>
    </div>
  )
}

// ─── Helpers ───

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-default-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
