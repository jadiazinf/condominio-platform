'use client'

import { useState } from 'react'
import { Building2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { acceptInvitation, type TValidateInvitationResult, HttpError } from '@packages/http-client'
import { useActiveSubscriptionTerms } from '@packages/http-client/hooks'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Divider } from '@/ui/components/divider'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { useTranslation, useAuth, useUser, getFirebaseErrorKey, getApiErrorKey } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Input, InputField } from '@/ui/components/input'
import { CheckboxField } from '@/ui/components/checkbox'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { Spinner } from '@/ui/components/spinner'
import { setUserCookie, setSessionCookie, setActiveRoleCookie } from '@/libs/cookies'
import { getErrorMessage } from '@/utils/formErrors'

interface AcceptInvitationRegisteredFormProps {
  token: string
  invitationData: TValidateInvitationResult
}

// Schema for authenticated users — only terms acceptance
const acceptTermsSchema = z.object({
  acceptTerms: z.boolean().refine(val => val === true, 'auth.errors.acceptTerms'),
})

// Schema for unauthenticated users — login + terms acceptance
const loginAndAcceptSchema = z.object({
  password: z.string().min(1, 'validation.models.auth.password.required'),
  acceptTerms: z.boolean().refine(val => val === true, 'auth.errors.acceptTerms'),
})

type TAcceptTermsSchema = z.infer<typeof acceptTermsSchema>
type TLoginAndAcceptSchema = z.infer<typeof loginAndAcceptSchema>

export function AcceptInvitationRegisteredForm({
  token,
  invitationData,
}: AcceptInvitationRegisteredFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user: firebaseUser } = useAuth()
  const { setUser } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)

  const { data: termsData, isLoading: isLoadingTerms } = useActiveSubscriptionTerms()
  const terms = termsData?.data

  const { user, managementCompany } = invitationData
  const isAuthenticated = !!firebaseUser

  // Use different schemas depending on auth state
  const authenticatedMethods = useForm<TAcceptTermsSchema>({
    resolver: zodResolver(acceptTermsSchema),
    defaultValues: { acceptTerms: false },
  })

  const unauthenticatedMethods = useForm<TLoginAndAcceptSchema>({
    resolver: zodResolver(loginAndAcceptSchema),
    defaultValues: { password: '', acceptTerms: false },
  })

  const methods = isAuthenticated ? authenticatedMethods : unauthenticatedMethods

  function translateError(message: string | undefined): string | undefined {
    if (!message) return undefined

    return t(message)
  }

  async function acceptAndRedirect(fbUser: import('firebase/auth').User) {
    const result = await acceptInvitation(token, {
      firebaseUid: fbUser.uid,
    })

    setUser(result.user)
    setUserCookie(result.user)
    await setSessionCookie(fbUser)
    setActiveRoleCookie('management_company')

    toast.success(t('auth.acceptInvitation.success'))
    window.location.href = '/dashboard'
  }

  // Handler for authenticated users
  async function onSubmitAuthenticated() {
    try {
      setIsSubmitting(true)
      await acceptAndRedirect(firebaseUser!)
    } catch (err) {
      if (HttpError.isHttpError(err)) {
        toast.error(t(getApiErrorKey(err)))
      } else {
        toast.error(t('auth.acceptInvitation.errors.unknown'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for unauthenticated users — sign in + accept
  async function onSubmitLogin(data: TLoginAndAcceptSchema) {
    try {
      setIsSubmitting(true)

      // Step 1: Sign in with Firebase
      const auth = getAuth()
      let fbUser

      try {
        const credential = await signInWithEmailAndPassword(auth, user.email, data.password)

        fbUser = credential.user
      } catch (firebaseErr) {
        const errorKey = getFirebaseErrorKey(firebaseErr)

        toast.error(t(errorKey))

        return
      }

      // Step 2: Accept invitation + set cookies
      await acceptAndRedirect(fbUser)
    } catch (err) {
      if (HttpError.isHttpError(err)) {
        toast.error(t(getApiErrorKey(err)))
      } else {
        toast.error(t('auth.acceptInvitation.errors.unknown'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center">
            {t('auth.acceptInvitation.registeredTitle')}
          </h1>
          <p className="text-default-500 text-center text-sm">
            {t('auth.acceptInvitation.subtitle', { companyName: managementCompany.name })}
          </p>
        </CardHeader>

        <Divider />

        <CardBody className="px-8 py-6">
          {/* User Info (Read-only) */}
          <div className="space-y-4 mb-6">
            <div>
              <Typography className="mb-2 text-default-500" variant="body2">
                {t('auth.acceptInvitation.yourEmail')}
              </Typography>
              <Input
                isDisabled
                size="lg"
                startContent={<Mail className="w-5 h-5 text-default-400" />}
                value={user.email}
              />
            </div>

            {(user.firstName || user.lastName) && (
              <div className="grid grid-cols-2 gap-4">
                {user.firstName && (
                  <div>
                    <Typography className="mb-2 text-default-500" variant="body2">
                      {t('auth.signUp.firstName')}
                    </Typography>
                    <Input
                      isReadOnly
                      size="lg"
                      startContent={<User className="w-5 h-5 text-default-400" />}
                      value={user.firstName}
                    />
                  </div>
                )}
                {user.lastName && (
                  <div>
                    <Typography className="mb-2 text-default-500" variant="body2">
                      {t('auth.signUp.lastName')}
                    </Typography>
                    <Input
                      isReadOnly
                      size="lg"
                      startContent={<User className="w-5 h-5 text-default-400" />}
                      value={user.lastName}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Divider className="my-6" />

          {isAuthenticated ? (
            /* Authenticated — just terms + confirm button */
            <FormProvider {...authenticatedMethods}>
              <form
                className="space-y-4"
                onSubmit={authenticatedMethods.handleSubmit(onSubmitAuthenticated)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <CheckboxField name="acceptTerms" />
                    <Typography variant="body2">
                      {t('auth.signUp.acceptTerms')}{' '}
                      <span
                        className="text-sm text-primary cursor-pointer hover:underline"
                        role="button"
                        onClick={() => setIsTermsModalOpen(true)}
                      >
                        {t('auth.signUp.termsAndConditions')}
                      </span>{' '}
                      {t('auth.signUp.and')}{' '}
                      <span
                        className="text-sm text-primary cursor-pointer hover:underline"
                        role="button"
                        onClick={() => setIsPrivacyModalOpen(true)}
                      >
                        {t('auth.signUp.privacyPolicy')}
                      </span>
                    </Typography>
                  </div>
                  {getErrorMessage(authenticatedMethods.formState.errors, 'acceptTerms') && (
                    <Typography className="mt-1 text-danger text-xs" variant="body2">
                      {translateError(
                        getErrorMessage(authenticatedMethods.formState.errors, 'acceptTerms')
                      )}
                    </Typography>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    fullWidth
                    className="w-full font-semibold"
                    color="primary"
                    isDisabled={isSubmitting}
                    isLoading={isSubmitting}
                    size="lg"
                    type="submit"
                  >
                    {t('auth.acceptInvitation.registeredSubmit')}
                  </Button>
                </div>
              </form>
            </FormProvider>
          ) : (
            /* Not authenticated — password field + terms + sign in & accept button */
            <FormProvider {...unauthenticatedMethods}>
              <form
                className="space-y-4"
                onSubmit={unauthenticatedMethods.handleSubmit(onSubmitLogin)}
              >
                <Typography className="text-default-500" variant="body2">
                  {t('auth.acceptInvitation.loginToAccept')}
                </Typography>

                <div>
                  <Typography className="mb-2" variant="body2">
                    {t('auth.signIn.password')}
                  </Typography>
                  <InputField
                    isRequired
                    endContent={
                      <button
                        className="focus:outline-none"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-default-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-default-400" />
                        )}
                      </button>
                    }
                    name="password"
                    placeholder={t('auth.signIn.passwordPlaceholder')}
                    size="lg"
                    startContent={<Lock className="w-5 h-5 text-default-400" />}
                    translateError={translateError}
                    type={showPassword ? 'text' : 'password'}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <CheckboxField name="acceptTerms" />
                    <Typography variant="body2">
                      {t('auth.signUp.acceptTerms')}{' '}
                      <span
                        className="text-sm text-primary cursor-pointer hover:underline"
                        role="button"
                        onClick={() => setIsTermsModalOpen(true)}
                      >
                        {t('auth.signUp.termsAndConditions')}
                      </span>{' '}
                      {t('auth.signUp.and')}{' '}
                      <span
                        className="text-sm text-primary cursor-pointer hover:underline"
                        role="button"
                        onClick={() => setIsPrivacyModalOpen(true)}
                      >
                        {t('auth.signUp.privacyPolicy')}
                      </span>
                    </Typography>
                  </div>
                  {getErrorMessage(unauthenticatedMethods.formState.errors, 'acceptTerms') && (
                    <Typography className="mt-1 text-danger text-xs" variant="body2">
                      {translateError(
                        getErrorMessage(unauthenticatedMethods.formState.errors, 'acceptTerms')
                      )}
                    </Typography>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    fullWidth
                    className="w-full font-semibold"
                    color="primary"
                    isDisabled={isSubmitting}
                    isLoading={isSubmitting}
                    size="lg"
                    type="submit"
                  >
                    {t('auth.acceptInvitation.loginAndAccept')}
                  </Button>
                </div>
              </form>
            </FormProvider>
          )}
        </CardBody>
      </Card>

      {/* Terms & Conditions Modal */}
      <Modal
        isOpen={isTermsModalOpen}
        scrollBehavior="inside"
        size="3xl"
        onClose={() => setIsTermsModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>{t('auth.signUp.termsAndConditions')}</span>
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
              <p className="text-default-400 text-center py-8">{t('common.noDataAvailable')}</p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={isPrivacyModalOpen}
        scrollBehavior="inside"
        size="3xl"
        onClose={() => setIsPrivacyModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>{t('auth.signUp.privacyPolicy')}</ModalHeader>
          <ModalBody className="pb-6">
            {isLoadingTerms ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : terms ? (
              <div className="text-sm text-default-600 whitespace-pre-wrap">{terms.content}</div>
            ) : (
              <p className="text-default-400 text-center py-8">{t('common.noDataAvailable')}</p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
