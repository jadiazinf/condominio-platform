'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'

interface IEntityDetailLayoutProps {
  children: ReactNode
  header: ReactNode
  sidebar: ReactNode
  backUrl: string
  backLabel?: string
}

/**
 * Generic layout component for entity detail views (users, condominiums, companies, etc.)
 * Provides consistent structure with header, sidebar, and main content area
 */
export function EntityDetailLayout({
  children,
  header,
  sidebar,
  backUrl,
  backLabel,
}: IEntityDetailLayoutProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const defaultBackLabel = t('common.backToList')

  return (
    <div className="max-w-6xl mx-auto">
      <Button
        variant="light"
        startContent={<ArrowLeft size={16} />}
        className="mb-4"
        onPress={() => router.push(backUrl)}
      >
        {backLabel || defaultBackLabel}
      </Button>

      {header}

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        {sidebar}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
