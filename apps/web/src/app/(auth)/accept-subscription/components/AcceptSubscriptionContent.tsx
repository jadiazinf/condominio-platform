'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { HttpError, getHttpClient } from '@packages/http-client'

import { InvalidTokenView } from './InvalidTokenView'
import { ExpiredTokenView } from './ExpiredTokenView'
import { AcceptSubscriptionForm } from './AcceptSubscriptionForm'
import { useTranslation, useAuth } from '@/contexts'

interface AcceptSubscriptionContentProps {
  token?: string
}

interface TValidateSubscriptionResult {
  subscriptionId: string
  status: string
  expiresAt: string
}

type TViewState =
  | { type: 'loading' }
  | { type: 'no-token' }
  | { type: 'not-authenticated' }
  | { type: 'unauthorized' }
  | { type: 'invalid' }
  | { type: 'expired' }
  | { type: 'valid'; data: TValidateSubscriptionResult }
  | { type: 'error'; message: string }

export function AcceptSubscriptionContent({ token }: AcceptSubscriptionContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { user: firebaseUser, loading: authLoading } = useAuth()
  const [viewState, setViewState] = useState<TViewState>({ type: 'loading' })

  const redirectUrl = token ? encodeURIComponent(`/accept-subscription?token=${token}`) : ''

  useEffect(() => {
    if (!token) {
      setViewState({ type: 'no-token' })
      return
    }

    // Wait for auth to resolve
    if (authLoading) return

    if (!firebaseUser) {
      setViewState({ type: 'not-authenticated' })
      return
    }

    async function validateToken() {
      try {
        const client = getHttpClient()
        const apiResponse = await client.get<{ success: boolean; data: TValidateSubscriptionResult; error?: string }>(
          `/subscription-accept/validate/${token}`
        )

        const response = apiResponse.data

        if (!response.success) {
          if (response.error?.includes('expired')) {
            setViewState({ type: 'expired' })
          } else {
            setViewState({ type: 'invalid' })
          }
          return
        }

        if (response.data.status !== 'pending') {
          setViewState({ type: 'invalid' })
          return
        }

        if (new Date(response.data.expiresAt) < new Date()) {
          setViewState({ type: 'expired' })
          return
        }

        setViewState({ type: 'valid', data: response.data })
      } catch (err) {
        if (HttpError.isHttpError(err) && err.status === 401) {
          setViewState({ type: 'not-authenticated' })
        } else if (HttpError.isHttpError(err) && err.status === 403) {
          setViewState({ type: 'unauthorized' })
        } else if (HttpError.isHttpError(err) && err.status === 404) {
          setViewState({ type: 'invalid' })
        } else if (HttpError.isHttpError(err) && err.status === 400) {
          const errorMessage = err.message || ''
          if (errorMessage.includes('expired')) {
            setViewState({ type: 'expired' })
          } else {
            setViewState({ type: 'invalid' })
          }
        } else {
          setViewState({
            type: 'error',
            message: err instanceof Error ? err.message : t('subscription.accept.errors.unknown'),
          })
        }
      }
    }

    validateToken()
  }, [token, t, firebaseUser, authLoading])

  if (viewState.type === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" />
          <p className="mt-4 text-default-500">{t('subscription.accept.validating')}</p>
        </CardBody>
      </Card>
    )
  }

  if (viewState.type === 'no-token') {
    return <InvalidTokenView message={t('subscription.accept.errors.noToken')} />
  }

  if (viewState.type === 'not-authenticated') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pb-0">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.374-9.373a9 9 0 11-12.728 0" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-center">{t('subscription.accept.title')}</h1>
        </CardHeader>
        <CardBody className="flex flex-col items-center text-center gap-6">
          <p className="text-default-500">{t('subscription.accept.loginRequired')}</p>
          <Button as={Link} href={`/auth?redirect=${redirectUrl}`} color="primary" size="lg">
            {t('subscription.accept.loginToAccept')}
          </Button>
        </CardBody>
      </Card>
    )
  }

  if (viewState.type === 'unauthorized') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pb-0">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-center">{t('subscription.accept.unauthorizedTitle')}</h1>
        </CardHeader>
        <CardBody className="flex flex-col items-center text-center gap-6">
          <p className="text-default-500">{t('subscription.accept.unauthorizedDescription')}</p>
          <Button as={Link} href="/" variant="bordered">
            {t('common.goHome')}
          </Button>
        </CardBody>
      </Card>
    )
  }

  if (viewState.type === 'invalid') {
    return <InvalidTokenView message={t('subscription.accept.errors.invalid')} />
  }

  if (viewState.type === 'error') {
    return <InvalidTokenView message={viewState.message} />
  }

  if (viewState.type === 'expired') {
    return <ExpiredTokenView />
  }

  return (
    <AcceptSubscriptionForm
      token={token!}
      subscriptionId={viewState.data.subscriptionId}
      onSuccess={() => router.push('/dashboard')}
    />
  )
}
