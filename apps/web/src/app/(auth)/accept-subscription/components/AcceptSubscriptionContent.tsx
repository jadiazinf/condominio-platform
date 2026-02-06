'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import { HttpError, getHttpClient } from '@packages/http-client'

import { InvalidTokenView } from './InvalidTokenView'
import { ExpiredTokenView } from './ExpiredTokenView'
import { AcceptSubscriptionForm } from './AcceptSubscriptionForm'
import { useTranslation } from '@/contexts'

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
  | { type: 'invalid' }
  | { type: 'expired' }
  | { type: 'valid'; data: TValidateSubscriptionResult }
  | { type: 'error'; message: string }

export function AcceptSubscriptionContent({ token }: AcceptSubscriptionContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [viewState, setViewState] = useState<TViewState>({ type: 'loading' })

  useEffect(() => {
    if (!token) {
      setViewState({ type: 'no-token' })
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

        // Check if expired
        if (new Date(response.data.expiresAt) < new Date()) {
          setViewState({ type: 'expired' })
          return
        }

        setViewState({ type: 'valid', data: response.data })
      } catch (err) {
        if (HttpError.isHttpError(err) && err.status === 404) {
          setViewState({ type: 'invalid' })
        } else if (HttpError.isHttpError(err) && err.status === 400) {
          // Check if it's an expiration error
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
  }, [token, t])

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

  if (viewState.type === 'invalid') {
    return <InvalidTokenView message={t('subscription.accept.errors.invalid')} />
  }

  if (viewState.type === 'error') {
    return <InvalidTokenView message={viewState.message} />
  }

  if (viewState.type === 'expired') {
    return <ExpiredTokenView />
  }

  // Valid token - show the form
  return (
    <AcceptSubscriptionForm
      token={token!}
      subscriptionId={viewState.data.subscriptionId}
      onSuccess={() => router.push('/dashboard')}
    />
  )
}
