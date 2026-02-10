import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PageErrorBoundary } from '@/ui/components/error-boundary'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const headersList = await headers()
  const sessionCookie = cookieStore.get('__session')
  const skipAuthRedirect = headersList.get('x-skip-auth-redirect') === 'true'

  // If user has a session, redirect to dashboard
  // Skip redirect when there's a session error (expired or temporary) to let client handle cleanup
  if (sessionCookie?.value && !skipAuthRedirect) {
    redirect('/dashboard')
  }

  return (
    <PageErrorBoundary pageName="Authentication">
      {children}
    </PageErrorBoundary>
  )
}
