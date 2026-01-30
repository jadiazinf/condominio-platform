'use client'

import { Typography } from '@/ui/components/typography'

interface ITicketCategorySectionProps {
  category: string | null
  categoryLabel: string
  translations: {
    category: string
  }
}

export function TicketCategorySection({
  category,
  categoryLabel,
  translations,
}: ITicketCategorySectionProps) {
  if (!category) return null

  return (
    <div>
      <Typography color="muted" variant="caption">
        {translations.category}
      </Typography>
      <div className="mt-1 flex items-center gap-2">
        <Typography variant="body2">{categoryLabel}</Typography>
      </div>
    </div>
  )
}
