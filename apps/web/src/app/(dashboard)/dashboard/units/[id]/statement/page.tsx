import { redirect } from 'next/navigation'
import { UnitStatementClient } from './components/UnitStatementClient'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UnitStatementPage({ params }: PageProps) {
  const [{ id: unitId }, session] = await Promise.all([params, getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  return <UnitStatementClient unitId={unitId} />
}
