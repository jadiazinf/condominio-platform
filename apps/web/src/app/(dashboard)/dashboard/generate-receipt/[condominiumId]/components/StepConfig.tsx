'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { Info } from 'lucide-react'
import type { TGenerateReceiptForm } from '../GenerateReceiptsClient'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Tooltip } from '@/ui/components/tooltip'
import { Select, type ISelectItem } from '@/ui/components/select'

// ─── Props ───

interface IStepConfigProps {
  yearItems: ISelectItem[]
  monthItems: ISelectItem[]
  dueDayItems: ISelectItem[]
  distributionItems: ISelectItem[]
  currencyItems: ISelectItem[]
  assemblyMinuteItems: ISelectItem[]
}

// ─── Component ───

export function StepConfig({
  yearItems,
  monthItems,
  dueDayItems,
  distributionItems,
  currencyItems,
  assemblyMinuteItems,
}: IStepConfigProps) {
  const { t } = useTranslation()
  const p = 'admin.receipts.generate'
  const { control, formState: { errors } } = useFormContext<TGenerateReceiptForm>()

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Typography variant="h4">{t(`${p}.configTitle`)}</Typography>
        <Tooltip showArrow content={t(`${p}.configTooltip`)} placement="right" classNames={{ content: 'max-w-xs text-sm' }}>
          <Info className="h-4 w-4 text-default-400 cursor-help" />
        </Tooltip>
      </div>

      {/* Period: Year, Month, Due Day */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Controller
          name="periodYear"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              items={yearItems}
              label={t(`${p}.periodYear`)}
              selectedKeys={[String(field.value)]}
              onChange={(key) => key && field.onChange(Number(key))}
              isInvalid={!!errors.periodYear}
              errorMessage={errors.periodYear?.message ? t(errors.periodYear.message) : undefined}
            />
          )}
        />
        <Controller
          name="periodMonth"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              items={monthItems}
              label={t(`${p}.periodMonth`)}
              selectedKeys={[String(field.value)]}
              onChange={(key) => key && field.onChange(Number(key))}
              isInvalid={!!errors.periodMonth}
              errorMessage={errors.periodMonth?.message ? t(errors.periodMonth.message) : undefined}
            />
          )}
        />
        <Controller
          name="dueDay"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              items={dueDayItems}
              label={t(`${p}.dueDay`)}
              selectedKeys={[String(field.value)]}
              onChange={(key) => key && field.onChange(Number(key))}
              isInvalid={!!errors.dueDay}
              errorMessage={errors.dueDay?.message ? t(errors.dueDay.message) : undefined}
            />
          )}
        />
      </div>

      {/* Distribution + Currency */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Controller
          name="distributionMethod"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              items={distributionItems}
              label={t(`${p}.distributionMethod`)}
              tooltip={t(`${p}.distributionMethodTooltip`)}
              selectedKeys={[field.value]}
              onChange={(key) => key && field.onChange(key)}
              isInvalid={!!errors.distributionMethod}
              errorMessage={errors.distributionMethod?.message ? t(errors.distributionMethod.message) : undefined}
            />
          )}
        />
        <Controller
          name="currencyId"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              items={currencyItems}
              label={t(`${p}.currency`)}
              selectedKeys={field.value ? [field.value] : []}
              onChange={(key) => key && field.onChange(key)}
              isInvalid={!!errors.currencyId}
              errorMessage={errors.currencyId?.message ? t(errors.currencyId.message) : undefined}
            />
          )}
        />
      </div>

      {/* Assembly minute (optional) */}
      <Controller
        name="assemblyMinuteId"
        control={control}
        render={({ field }) => (
          <Select
            items={assemblyMinuteItems}
            label={t(`${p}.assemblyMinute`)}
            tooltip={t(`${p}.assemblyMinuteTooltip`)}
            placeholder={t(`${p}.noAssemblyMinute`)}
            selectedKeys={field.value ? [field.value] : []}
            onChange={(key) => field.onChange(key ?? '')}
          />
        )}
      />
    </Card>
  )
}
