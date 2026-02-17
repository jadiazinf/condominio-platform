import type { Metadata } from 'next'

import { DashboardTheme } from '@/app/(dashboard)/components/DashboardTheme'
import { AcceptInvitationContent } from './components/AcceptInvitationContent'

export const metadata: Metadata = {
  title: 'Aceptar Invitación',
  description: 'Acepta tu invitación y completa tu registro en CondominioApp.',
  robots: {
    index: false,
    follow: false,
  },
}

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { token } = await searchParams

  return (
    <DashboardTheme>
      <div className="min-h-screen flex items-center justify-center p-8">
        <AcceptInvitationContent token={token} />
      </div>
    </DashboardTheme>
  )
}
