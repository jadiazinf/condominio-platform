'use client'

import { Link } from '@/ui/components/link'
import { ArrowLeft } from 'lucide-react'

import { useTranslation } from '@/contexts'

export function BackToHomeButton() {
  const { t } = useTranslation()

  return (
    <Link
      className="flex items-center gap-2 text-default-600 hover:text-primary transition-colors"
      href="/"
    >
      <ArrowLeft size={18} />
      <span>{t('common.backToHome')}</span>
    </Link>
  )
}
