'use client'

import type { TUserCondominiumAccess } from '@packages/domain'

import { useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { CondominiumList } from './components/CondominiumList'
import { NoCondominiums } from './components/NoCondominiums'

import { useAuth, useUser, useCondominium, useTranslation } from '@/contexts'
import { setSelectedCondominiumCookie } from '@/libs/cookies'
import { Typography } from '@/ui/components/typography'

/**
 * Validates that a redirect URL is safe (internal path only, no external URLs).
 * Returns the validated path or '/dashboard' as fallback.
 */
function getValidRedirectUrl(redirectParam: string | null): string {
  if (!redirectParam) return '/dashboard'

  // Must start with / (relative path) and not // (protocol-relative URL)
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) {
    return '/dashboard'
  }

  // Ensure it's a valid internal path
  try {
    const url = new URL(redirectParam, 'http://localhost')
    if (url.pathname !== redirectParam.split('?')[0]) {
      return '/dashboard'
    }
  } catch {
    return '/dashboard'
  }

  return redirectParam
}

export default function SelectCondominiumPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { user: firebaseUser, loading: authLoading } = useAuth()
  const { user } = useUser()
  const { condominiums, hasMultipleCondominiums, selectCondominium } = useCondominium()
  const hasRedirected = useRef(false)

  // Get the validated redirect URL from search params
  const redirectUrl = useMemo(
    () => getValidRedirectUrl(searchParams.get('redirect')),
    [searchParams]
  )

  // Redirect if user is not authenticated or no user data
  useEffect(
    function () {
      if (hasRedirected.current || authLoading) return

      // If no Firebase user, redirect to signin (preserving the redirect parameter)
      if (!firebaseUser) {
        hasRedirected.current = true
        const signinUrl = redirectUrl !== '/dashboard'
          ? `/signin?redirect=${encodeURIComponent(redirectUrl)}`
          : '/signin'
        router.replace(signinUrl)

        return
      }

      // If no user data in context, redirect to dashboard to fetch it
      // The dashboard layout will redirect back here if needed
      if (!user) {
        hasRedirected.current = true
        router.replace(redirectUrl)

        return
      }
    },
    [firebaseUser, authLoading, user, router, redirectUrl]
  )

  // If user has no condominiums or only one, redirect appropriately
  useEffect(
    function () {
      if (hasRedirected.current || authLoading || !user) return

      // If there are no condominiums, redirect to target page
      if (!condominiums || condominiums.length === 0) {
        hasRedirected.current = true
        router.replace(redirectUrl)

        return
      }

      // If only one condominium, auto-select and redirect to target page
      if (!hasMultipleCondominiums) {
        const singleCondominium = condominiums[0]

        selectCondominium(singleCondominium)
        setSelectedCondominiumCookie(singleCondominium)
        hasRedirected.current = true
        router.replace(redirectUrl)
      }
    },
    [condominiums, hasMultipleCondominiums, selectCondominium, router, authLoading, user, redirectUrl]
  )

  const handleSelectCondominium = (condominium: TUserCondominiumAccess) => {
    selectCondominium(condominium)
    setSelectedCondominiumCookie(condominium)
    router.replace(redirectUrl)
  }

  const handleContactSupport = () => {
    // TODO: Implement contact support functionality
    // Could open a modal, redirect to support page, or open email
    window.open('mailto:support@condominioapp.com', '_blank')
  }

  // Show nothing while checking auth state
  if (authLoading || !user || !condominiums || condominiums.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Typography color="default" variant="h1">
            {t('condominium.selection.title')}
          </Typography>
          <Typography className="max-w-2xl" color="muted" variant="body1">
            {t('condominium.selection.subtitle')}
          </Typography>
        </div>

        {/* Content */}
        {condominiums.length === 0 ? (
          <NoCondominiums onContactSupport={handleContactSupport} />
        ) : (
          <CondominiumList condominiums={condominiums} onSelect={handleSelectCondominium} />
        )}
      </div>
    </div>
  )
}
