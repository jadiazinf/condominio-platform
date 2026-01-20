'use client'

import type { TUserCondominiumAccess } from '@packages/domain'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { CondominiumList } from './components/CondominiumList'
import { NoCondominiums } from './components/NoCondominiums'

import { useAuth, useUser, useCondominium, useTranslation } from '@/contexts'
import { setSelectedCondominiumCookie } from '@/libs/cookies'
import { Typography } from '@/ui/components/typography'

export default function SelectCondominiumPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user: firebaseUser, loading: authLoading } = useAuth()
  const { user } = useUser()
  const {
    condominiums,
    hasMultipleCondominiums,
    selectCondominium,
  } = useCondominium()
  const hasRedirected = useRef(false)

  // Redirect to loading if user is not authenticated or no user data
  useEffect(
    function () {
      if (hasRedirected.current || authLoading) return

      // If no Firebase user, redirect to signin
      if (!firebaseUser) {
        hasRedirected.current = true
        router.replace('/signin')

        return
      }

      // If no user data in context, redirect to loading to fetch it
      if (!user) {
        hasRedirected.current = true
        router.replace('/loading')

        return
      }
    },
    [firebaseUser, authLoading, user, router]
  )

  // If user has no condominiums or only one, redirect appropriately
  useEffect(
    function () {
      if (hasRedirected.current || authLoading || !user) return

      // If there are no condominiums, redirect to dashboard
      if (!condominiums || condominiums.length === 0) {
        hasRedirected.current = true
        router.replace('/dashboard')

        return
      }

      // If only one condominium, auto-select and redirect
      if (!hasMultipleCondominiums) {
        const singleCondominium = condominiums[0]

        selectCondominium(singleCondominium)
        setSelectedCondominiumCookie(singleCondominium)
        hasRedirected.current = true
        router.replace('/dashboard')
      }
    },
    [condominiums, hasMultipleCondominiums, selectCondominium, router, authLoading, user]
  )

  const handleSelectCondominium = (condominium: TUserCondominiumAccess) => {
    selectCondominium(condominium)
    setSelectedCondominiumCookie(condominium)
    router.replace('/dashboard')
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
          <CondominiumList
            condominiums={condominiums}
            onSelect={handleSelectCondominium}
          />
        )}
      </div>
    </div>
  )
}
