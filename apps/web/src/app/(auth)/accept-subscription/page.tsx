import type { Metadata } from 'next'

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
    <div className="min-h-screen flex items-center justify-center p-8">
      <AcceptSubscriptionContent token={token} />
    </div>
  )
}
