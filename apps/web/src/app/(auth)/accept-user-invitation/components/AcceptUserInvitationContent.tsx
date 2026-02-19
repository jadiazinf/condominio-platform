'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth } from 'firebase/auth'
import { Card, CardBody } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import {
  validateUserInvitationToken,
  acceptUserInvitation,
  type TValidateUserInvitationResult,
  HttpError,
} from '@packages/http-client'

import { InvalidTokenView } from '../../accept-invitation/components/InvalidTokenView'
import { ExpiredTokenView } from '../../accept-invitation/components/ExpiredTokenView'
import { AcceptUserInvitationForm } from './AcceptUserInvitationForm'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { setSessionCookie, setUserCookie, setActiveRoleCookie } from '@/libs/cookies'
import { useUser } from '@/contexts'

interface AcceptUserInvitationContentProps {
  token?: string
}

type TViewState =
  | { type: 'loading' }
  | { type: 'no-token' }
  | { type: 'invalid' }
  | { type: 'expired'; data: TValidateUserInvitationResult }
  | { type: 'valid-new-user'; data: TValidateUserInvitationResult }
  | { type: 'valid-registered-accepting' }
  | { type: 'valid-registered-redirect' }
  | { type: 'error'; message: string }

export function AcceptUserInvitationContent({ token }: AcceptUserInvitationContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const { user: firebaseUser, loading: authLoading } = useAuth()
  const { setUser } = useUser()
  const [viewState, setViewState] = useState<TViewState>({ type: 'loading' })
  const hasAccepted = useRef(false)

  // Phase 1: Validate the token
  useEffect(() => {
    if (!token) {
      setViewState({ type: 'no-token' })
      return
    }

    async function validateToken() {
      try {
        const result = await validateUserInvitationToken(token!)

        if (!result.isValid) {
          if (result.isExpired) {
            setViewState({ type: 'expired', data: result })
          } else {
            setViewState({ type: 'invalid' })
          }
          return
        }

        if (result.user.isActive) {
          // User is already registered — needs login flow
          setViewState({ type: 'valid-registered-redirect', data: result } as TViewState)
        } else {
          // New user — show password creation form
          setViewState({ type: 'valid-new-user', data: result })
        }
      } catch (err) {
        if (HttpError.isHttpError(err) && err.status === 404) {
          setViewState({ type: 'invalid' })
        } else {
          setViewState({
            type: 'error',
            message: err instanceof Error ? err.message : t('auth.acceptInvitation.errors.unknown'),
          })
        }
      }
    }

    validateToken()
  }, [token, t])

  // Phase 2: For registered users, auto-accept if authenticated
  useEffect(() => {
    if (viewState.type !== 'valid-registered-redirect' || authLoading || hasAccepted.current) {
      return
    }

    if (!firebaseUser) {
      // Not authenticated — redirect to login with return URL
      const returnUrl = encodeURIComponent(`/accept-user-invitation?token=${token}`)
      router.replace(`/auth?redirect=${returnUrl}`)
      return
    }

    // Authenticated — auto-accept the invitation
    hasAccepted.current = true
    setViewState({ type: 'valid-registered-accepting' })

    async function autoAccept() {
      try {
        const firebaseToken = await firebaseUser!.getIdToken()
        const result = await acceptUserInvitation(token!, firebaseToken)

        setUser(result.user as any)
        setUserCookie(result.user as any)
        await setSessionCookie(firebaseUser!)
        setActiveRoleCookie('condominium')

        toast.success(t('auth.acceptInvitation.success'))
        window.location.href = '/dashboard'
      } catch (err) {
        if (HttpError.isHttpError(err)) {
          toast.error(err.message)
        } else {
          toast.error(t('auth.acceptInvitation.errors.unknown'))
        }
        setViewState({
          type: 'error',
          message: err instanceof Error ? err.message : t('auth.acceptInvitation.errors.unknown'),
        })
      }
    }

    autoAccept()
  }, [viewState.type, authLoading, firebaseUser, token, router, toast, t, setUser])

  if (viewState.type === 'loading' || viewState.type === 'valid-registered-accepting') {
    return (
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" />
          <p className="mt-4 text-default-500">
            {viewState.type === 'valid-registered-accepting'
              ? t('auth.acceptInvitation.accepting')
              : t('auth.acceptInvitation.validating')}
          </p>
        </CardBody>
      </Card>
    )
  }

  if (viewState.type === 'valid-registered-redirect') {
    // Will redirect in the effect above
    return (
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" />
          <p className="mt-4 text-default-500">{t('auth.acceptInvitation.validating')}</p>
        </CardBody>
      </Card>
    )
  }

  if (viewState.type === 'no-token') {
    return <InvalidTokenView message={t('auth.acceptInvitation.errors.noToken')} />
  }

  if (viewState.type === 'invalid') {
    return <InvalidTokenView message={t('auth.acceptInvitation.errors.invalid')} />
  }

  if (viewState.type === 'error') {
    return <InvalidTokenView message={viewState.message} />
  }

  if (viewState.type === 'expired') {
    return (
      <ExpiredTokenView
        companyName={viewState.data.condominium?.name ?? ''}
        email={viewState.data.user.email}
      />
    )
  }

  // Valid token, new user - show the password form
  return (
    <AcceptUserInvitationForm
      token={token!}
      invitationData={viewState.data}
      onSuccess={() => {
        window.location.href = '/dashboard'
      }}
    />
  )
}
