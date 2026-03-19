'use client'

import { useState, useEffect } from 'react'
import {
  validateInvitationToken,
  type TValidateInvitationResult,
  HttpError,
} from '@packages/http-client'

import { InvalidTokenView } from './InvalidTokenView'
import { ExpiredTokenView } from './ExpiredTokenView'
import { AcceptInvitationForm } from './AcceptInvitationForm'
import { AcceptInvitationRegisteredForm } from './AcceptInvitationRegisteredForm'

import { Spinner } from '@/ui/components/spinner'
import { Card, CardBody } from '@/ui/components/card'
import { useTranslation } from '@/contexts'

interface AcceptInvitationContentProps {
  token?: string
}

type TViewState =
  | { type: 'loading' }
  | { type: 'no-token' }
  | { type: 'invalid' }
  | { type: 'expired'; data: TValidateInvitationResult }
  | { type: 'valid-new-user'; data: TValidateInvitationResult }
  | { type: 'valid-registered'; data: TValidateInvitationResult }
  | { type: 'error'; message: string }

export function AcceptInvitationContent({ token }: AcceptInvitationContentProps) {
  const { t } = useTranslation()
  const [viewState, setViewState] = useState<TViewState>({ type: 'loading' })

  // Validate the token
  useEffect(() => {
    if (!token) {
      setViewState({ type: 'no-token' })

      return
    }

    async function validateToken() {
      try {
        const result = await validateInvitationToken(token!)

        if (!result.isValid) {
          if (result.isExpired) {
            setViewState({ type: 'expired', data: result })
          } else {
            setViewState({ type: 'invalid' })
          }

          return
        }

        if (result.user.isActive) {
          // User already has an account — show confirmation form
          setViewState({ type: 'valid-registered', data: result })
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

  // Valid token, registered user — show confirmation form with terms
  if (viewState.type === 'valid-registered') {
    return <AcceptInvitationRegisteredForm invitationData={viewState.data} token={token!} />
  }

  // Valid token, new user — show password creation form
  return <AcceptInvitationForm invitationData={viewState.data} token={token!} />
}
