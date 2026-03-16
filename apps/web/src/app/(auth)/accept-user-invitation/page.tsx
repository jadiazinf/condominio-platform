import type { Metadata } from 'next'

import { AcceptUserInvitationContent } from './components/AcceptUserInvitationContent'

import { DashboardTheme } from '@/app/(dashboard)/components/DashboardTheme'

export const metadata: Metadata = {
  title: 'Aceptar Invitación',
  description: 'Acepta tu invitación para unirte al condominio en CondominioApp.',
  robots: {
    index: false,
    follow: false,
  },
}

interface AcceptUserInvitationPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptUserInvitationPage({
  searchParams,
}: AcceptUserInvitationPageProps) {
  const { token } = await searchParams

  return (
    <DashboardTheme>
      <div className="min-h-screen flex items-center justify-center p-8">
        <AcceptUserInvitationContent token={token} />
      </div>
    </DashboardTheme>
  )
}
