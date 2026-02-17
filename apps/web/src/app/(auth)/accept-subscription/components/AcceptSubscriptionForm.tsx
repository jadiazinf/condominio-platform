'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardFooter } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Checkbox } from '@/ui/components/checkbox'
import { Spinner } from '@/ui/components/spinner'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { useTranslation, useAuth } from '@/contexts'
import { useSessionStore } from '@/stores/session-store'
import { getHttpClient, HttpError, useActiveSubscriptionTerms } from '@packages/http-client'

interface AcceptSubscriptionFormProps {
  token: string
  subscriptionId: string
  onSuccess: () => void
}

export function AcceptSubscriptionForm({
  token,
  subscriptionId,
  onSuccess,
}: AcceptSubscriptionFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user: firebaseUser } = useAuth()
  const dbUser = useSessionStore(s => s.user)
  const [isAccepting, setIsAccepting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)

  const { data: termsData, isLoading: isLoadingTerms } = useActiveSubscriptionTerms()
  const terms = termsData?.data

  const handleAccept = async () => {
    if (!termsAccepted) {
      toast.error(t('subscription.accept.errors.mustAcceptTerms'))
      return
    }

    if (!firebaseUser) {
      toast.error(t('subscription.accept.errors.mustBeLoggedIn'))
      return
    }

    if (!dbUser) {
      toast.error(t('subscription.accept.errors.userNotFound'))
      return
    }

    setIsAccepting(true)

    try {
      const client = getHttpClient()
      await client.post(`/subscription-accept/${token}`, {
        userId: dbUser.id,
        email: firebaseUser.email,
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

  const redirectUrl = encodeURIComponent(`/accept-subscription?token=${token}`)

  return (
    <>
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
          <h1 className="text-xl font-semibold text-center">{t('subscription.accept.title')}</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <p className="text-default-500 text-center">{t('subscription.accept.description')}</p>

          {!firebaseUser && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-warning-600 text-sm text-center">
                {t('subscription.accept.loginRequired')}
              </p>
            </div>
          )}

          {firebaseUser && (
            <>
              <div className="bg-default-100 rounded-lg p-4">
                <p className="text-sm text-default-600">
                  <strong>{t('subscription.accept.loggedInAs')}:</strong> {firebaseUser.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  isSelected={termsAccepted}
                  onValueChange={setTermsAccepted}
                />
                <p className="text-sm text-default-600">
                  {t('subscription.accept.termsCheckbox')}
                  <Button
                    variant="text"
                    color="primary"
                    className="text-sm"
                    onPress={() => setIsTermsModalOpen(true)}
                  >
                    {t('subscription.accept.termsCheckboxLink')}
                  </Button>
                  {t('subscription.accept.termsCheckboxSuffix')}
                </p>
              </div>
            </>
          )}
        </CardBody>
        <CardFooter className="flex justify-center gap-4">
          {firebaseUser ? (
            <Button
              color="primary"
              size="lg"
              isLoading={isAccepting}
              isDisabled={!termsAccepted || !dbUser}
              onPress={handleAccept}
            >
              {t('subscription.accept.acceptButton')}
            </Button>
          ) : (
            <Button as="a" href={`/auth?redirect=${redirectUrl}`} color="primary" size="lg">
              {t('subscription.accept.loginToAccept')}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Terms & Conditions Modal */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>{t('subscription.accept.termsModalTitle')}</span>
            {terms && (
              <span className="text-xs font-normal text-default-400">
                {terms.title} &middot; v{terms.version}
              </span>
            )}
          </ModalHeader>
          <ModalBody className="pb-6">
            {isLoadingTerms ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : terms ? (
              <div className="text-sm text-default-600 whitespace-pre-wrap">{terms.content}</div>
            ) : (
              <p className="text-default-400 text-center py-8">
                {t('subscription.accept.errors.unknown')}
              </p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
