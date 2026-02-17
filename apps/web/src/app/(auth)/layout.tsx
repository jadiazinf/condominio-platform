import { PageErrorBoundary } from '@/ui/components/error-boundary'

// Auth redirect for logged-in users is handled by middleware (line 123 in middleware.ts).
// Middleware correctly skips the redirect for session issue flows (notfound, expired, etc.)
// and strips the __session cookie from the request. Doing the redirect here in the layout
// caused infinite loops because cookies() reads the original request cookie (before
// middleware modifications), and the redirect response drops the Set-Cookie deletion header.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageErrorBoundary pageName="Authentication">
      {children}
    </PageErrorBoundary>
  )
}
