import type { Metadata } from 'next'

import { DashboardTheme } from '@/app/(dashboard)/components/DashboardTheme'
import { AcceptSubscriptionContent } from './components/AcceptSubscriptionContent'

export const metadata: Metadata = {
  title: 'Aceptar Suscripción',
  description: 'Acepta los términos y condiciones para activar tu suscripción en CondominioApp.',
  robots: {
    index: false,
    follow: false,
  },
}

interface AcceptSubscriptionPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptSubscriptionPage({ searchParams }: AcceptSubscriptionPageProps) {
  const { token } = await searchParams

  return (
    <DashboardTheme>
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 overflow-hidden">
        <AcceptSubscriptionContent token={token} />
      </div>
    </DashboardTheme>
  )
}
