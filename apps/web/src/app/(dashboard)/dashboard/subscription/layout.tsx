import { redirect } from 'next/navigation'

import { SubscriptionSidebar } from './components/SubscriptionSidebar'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface LayoutProps {
  children: React.ReactNode
}

export default async function SubscriptionLayout({ children }: LayoutProps) {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (session.activeRole !== 'management_company') {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Typography className="text-2xl sm:text-3xl" variant="h2">
          {t('admin.subscription.title')}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('admin.subscription.subtitle')}
        </Typography>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <SubscriptionSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
