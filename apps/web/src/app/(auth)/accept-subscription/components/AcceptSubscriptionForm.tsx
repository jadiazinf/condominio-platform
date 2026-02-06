'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardFooter } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Checkbox } from '@/ui/components/checkbox'
import { useToast } from '@/ui/components/toast'
import { useTranslation, useAuth } from '@/contexts'
import { getHttpClient, HttpError } from '@packages/http-client'

interface AcceptSubscriptionFormProps {
  token: string
  subscriptionId: string
  onSuccess: () => void
}

export function AcceptSubscriptionForm({ token, subscriptionId, onSuccess }: AcceptSubscriptionFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const [isAccepting, setIsAccepting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const handleAccept = async () => {
    if (!termsAccepted) {
      toast.error(t('subscription.accept.errors.mustAcceptTerms'))
      return
    }

    if (!user) {
      toast.error(t('subscription.accept.errors.mustBeLoggedIn'))
      return
    }

    setIsAccepting(true)

    try {
      const client = getHttpClient()
      await client.post(`/subscription-accept/${token}`, {
        userId: user.uid,
        email: user.email,
      })

      toast.success(t('subscription.accept.success'))
      onSuccess()
    } catch (err) {
      if (HttpError.isHttpError(err)) {
        toast.error(err.message || t('subscription.accept.errors.failed'))
      } else {
        toast.error(t('subscription.accept.errors.unknown'))
      }
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="flex flex-col items-center pb-0">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-center">
          {t('subscription.accept.title')}
        </h1>
      </CardHeader>
      <CardBody className="flex flex-col gap-6">
        <p className="text-default-500 text-center">
          {t('subscription.accept.description')}
        </p>

        {!user && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-warning-600 text-sm text-center">
              {t('subscription.accept.loginRequired')}
            </p>
          </div>
        )}

        {user && (
          <>
            <div className="bg-default-100 rounded-lg p-4">
              <p className="text-sm text-default-600">
                <strong>{t('subscription.accept.loggedInAs')}:</strong> {user.email}
              </p>
            </div>

            <Checkbox
              isSelected={termsAccepted}
              onValueChange={setTermsAccepted}
              className="text-sm"
            >
              {t('subscription.accept.termsCheckbox')}
            </Checkbox>
          </>
        )}
      </CardBody>
      <CardFooter className="flex justify-center gap-4">
        {user ? (
          <Button
            color="primary"
            size="lg"
            isLoading={isAccepting}
            isDisabled={!termsAccepted}
            onPress={handleAccept}
          >
            {t('subscription.accept.acceptButton')}
          </Button>
        ) : (
          <Button
            as="a"
            href={`/login?redirect=/accept-subscription?token=${token}`}
            color="primary"
            size="lg"
          >
            {t('subscription.accept.loginToAccept')}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
