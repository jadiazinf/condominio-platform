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
    <>
      {/* Background that covers full viewport */}
      <div className="fixed inset-0 z-0">
        {/* Mobile: Primary background for registration section */}
        <div className="absolute inset-0 bg-primary dark:bg-primary/30 lg:hidden">
          {/* Decorative blobs for mobile */}
          <div className="absolute inset-0 opacity-10 dark:opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>
        </div>

        {/* Desktop: Base background + Diagonal overlay */}
        <div className="hidden lg:block">
          <div className="absolute inset-0 bg-background" />
          <div
            className="absolute inset-0 bg-primary dark:bg-primary/30"
            style={{ clipPath: 'polygon(60% 0, 100% 0, 100% 100%, 45% 100%)' }}
          >
            {/* Decorative blobs */}
            <div className="absolute inset-0 opacity-10 dark:opacity-5">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <PageErrorBoundary pageName="Authentication">{children}</PageErrorBoundary>
      </div>
    </>
  )
}
