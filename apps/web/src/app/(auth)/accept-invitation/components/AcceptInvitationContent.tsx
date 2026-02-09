'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import {
  validateInvitationToken,
  type TValidateInvitationResult,
  HttpError,
} from '@packages/http-client'

import { InvalidTokenView } from './InvalidTokenView'
import { ExpiredTokenView } from './ExpiredTokenView'
import { AcceptInvitationForm } from './AcceptInvitationForm'
import { useTranslation } from '@/contexts'

interface AcceptInvitationContentProps {
  token?: string
}

type TViewState =
  | { type: 'loading' }
  | { type: 'no-token' }
  | { type: 'invalid' }
  | { type: 'expired'; data: TValidateInvitationResult }
  | { type: 'valid'; data: TValidateInvitationResult }
  | { type: 'error'; message: string }

export function AcceptInvitationContent({ token }: AcceptInvitationContentProps) {
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
        console.log('[AcceptInvitation] Validating token:', {
          tokenLength: token!.length,
          tokenPrefix: token!.substring(0, 12),
          fullToken: token,
        })

        const result = await validateInvitationToken(token!)

        console.log('[AcceptInvitation] Validation result:', {
          isValid: result.isValid,
          isExpired: result.isExpired,
          user: result.user,
          company: result.managementCompany,
        })

        if (!result.isValid) {
          if (result.isExpired) {
            setViewState({ type: 'expired', data: result })
          } else {
            // Invitation already used or cancelled
            setViewState({ type: 'invalid' })
          }
          return
        }

        setViewState({ type: 'valid', data: result })
      } catch (err) {
        console.error('[AcceptInvitation] Validation error:', {
          isHttpError: HttpError.isHttpError(err),
          status: HttpError.isHttpError(err) ? err.status : undefined,
          message: err instanceof Error ? err.message : String(err),
        })

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

  if (viewState.type === 'loading') {
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
        companyName={viewState.data.managementCompany.name}
        email={viewState.data.user.email}
      />
    )
  }

  // Valid token - show the form
  return (
    <AcceptInvitationForm
      token={token!}
      invitationData={viewState.data}
      onSuccess={() => router.push('/dashboard')}
    />
  )
}
