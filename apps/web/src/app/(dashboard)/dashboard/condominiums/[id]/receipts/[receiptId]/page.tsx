import { redirect } from 'next/navigation'
import { BillingReceiptDetailClient } from './components/BillingReceiptDetailClient'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string; receiptId: string }>
}

export default async function BillingReceiptDetailPage({ params }: PageProps) {
  const [{ receiptId }, session] = await Promise.all([params, getFullSession()])

  if (!session.sessionToken) redirect('/auth')

  return <BillingReceiptDetailClient id={receiptId} />
}
