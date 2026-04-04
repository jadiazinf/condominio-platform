'use client'

import type { TConceptsTranslations } from './types'

import { FileText } from 'lucide-react'

import { Typography } from '@/ui/components/typography'

interface ReserveFundConceptsSectionProps {
  condominiumId: string
  managementCompanyId: string
  translations: TConceptsTranslations
}

/**
 * Reserve Fund Concepts Section
 *
 * TODO: Re-implement after billing restructure (Fase 4.7).
 * The old TPaymentConcept/useMyCompanyPaymentConceptsPaginated system was removed.
 * This section should be re-built using the new billing charge types system.
 */
export function ReserveFundConceptsSection({
  translations: t,
}: ReserveFundConceptsSectionProps) {
  return (
    <div className="space-y-4">
      <Typography variant="h4">{t.title}</Typography>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
        <FileText className="mb-4 text-default-300" size={40} />
        <Typography color="muted" variant="body1">
          {t.empty}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t.emptyDescription}
        </Typography>
      </div>
    </div>
  )
}
