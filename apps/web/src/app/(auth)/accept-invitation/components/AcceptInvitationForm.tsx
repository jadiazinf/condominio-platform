'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Eye, EyeOff, Lock, Building2, Mail, User } from 'lucide-react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { acceptInvitation, type TValidateInvitationResult, HttpError } from '@packages/http-client'
import { useActiveSubscriptionTerms } from '@packages/http-client/hooks'

import { useTranslation, useUser, getFirebaseErrorKey } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { InputField } from '@/ui/components/input'
import { CheckboxField } from '@/ui/components/checkbox'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { Spinner } from '@/ui/components/spinner'
import { setUserCookie, setSessionCookie, setActiveRoleCookie } from '@/libs/cookies'
import { getErrorMessage } from '@/utils/formErrors'

interface AcceptInvitationFormProps {
  token: string
  invitationData: TValidateInvitationResult
  onSuccess: () => void
}

// Schema for the accept invitation form
const acceptInvitationFormSchema = z
  .object({
    password: z
      .string()
      .min(8, 'auth.errors.passwordMinLength')
      .regex(/[A-Z]/, 'auth.errors.passwordUppercase')
      .regex(/[a-z]/, 'auth.errors.passwordLowercase')
      .regex(/[0-9]/, 'auth.errors.passwordNumber'),
    confirmPassword: z.string().min(1, 'auth.errors.confirmPasswordRequired'),
    acceptTerms: z.boolean().refine(val => val === true, 'auth.errors.acceptTerms'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'auth.errors.passwordsDoNotMatch',
    path: ['confirmPassword'],
  })

type TAcceptInvitationFormSchema = z.infer<typeof acceptInvitationFormSchema>

export function AcceptInvitationForm({ token, invitationData }: AcceptInvitationFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { setUser } = useUser()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)

  const { data: termsData, isLoading: isLoadingTerms } = useActiveSubscriptionTerms()
  const terms = termsData?.data

  const { user, managementCompany } = invitationData

  const methods = useForm<TAcceptInvitationFormSchema>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  function translateError(message: string | undefined): string | undefined {
    if (!message) return undefined
    return t(message)
  }

  async function onSubmit(data: TAcceptInvitationFormSchema) {
    try {
      setIsSubmitting(true)

      // Step 1: Create or sign into Firebase account
      const auth = getAuth()
      let firebaseUser

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, data.password)
        firebaseUser = userCredential.user
      } catch (firebaseErr) {
        // If email already has a Firebase account, sign in with the provided password
        if ((firebaseErr as any).code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, user.email, data.password)
          firebaseUser = userCredential.user
        } else {
          throw firebaseErr
        }
      }

      // Step 2: Accept the invitation with the Firebase UID
      const result = await acceptInvitation(token, {
        firebaseUid: firebaseUser.uid,
      })

      // Step 3: Set session cookie and user cookie
      const idToken = await firebaseUser.getIdToken()
      await setSessionCookie(firebaseUser)
      setUser(result.user)
      setUserCookie(result.user)

      toast.success(t('auth.acceptInvitation.success'))

      // Step 4: Set active role to management_company and redirect
      setActiveRoleCookie('management_company')
      window.location.href = '/dashboard'
    } catch (err) {
      // Check if it's an HTTP error from the API
      if (HttpError.isHttpError(err)) {
        toast.error(err.message)
        return
      }

      // Check if it's a Firebase error
      const errorKey = getFirebaseErrorKey(err)
      toast.error(t(errorKey))
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
        <h1 className="text-2xl font-bold text-center">{t('auth.acceptInvitation.title')}</h1>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Typography className="mb-2 text-default-500" variant="body2">
                {t('auth.signUp.firstName')}
              </Typography>
              <Input
                isReadOnly
                size="lg"
                startContent={<User className="w-5 h-5 text-default-400" />}
                value={user.firstName ?? ''}
              />
            </div>
            <div>
              <Typography className="mb-2 text-default-500" variant="body2">
                {t('auth.signUp.lastName')}
              </Typography>
              <Input
                isReadOnly
                size="lg"
                startContent={<User className="w-5 h-5 text-default-400" />}
                value={user.lastName ?? ''}
              />
            </div>
          </div>
        </div>

        <Divider className="my-6" />

        {/* Password Form */}
        <FormProvider {...methods}>
          <form className="space-y-4" onSubmit={methods.handleSubmit(onSubmit)}>
            <Typography className="text-default-500" variant="body2">
              {t('auth.acceptInvitation.setPassword')}
            </Typography>

          <div>
            <Typography className="mb-2" variant="body2">
              {t('auth.signUp.password')}
            </Typography>
            <InputField
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.signUp.passwordPlaceholder')}
              size="lg"
              startContent={<Lock className="w-5 h-5 text-default-400" />}
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
              isRequired
              translateError={translateError}
            />
          </div>

          <div>
            <Typography className="mb-2" variant="body2">
              {t('auth.signUp.confirmPassword')}
            </Typography>
            <InputField
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
              size="lg"
              startContent={<Lock className="w-5 h-5 text-default-400" />}
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-default-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-default-400" />
                  )}
                </button>
              }
              isRequired
              translateError={translateError}
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
            {getErrorMessage(methods.formState.errors, 'acceptTerms') && (
              <Typography className="mt-1 text-danger text-xs" variant="body2">
                {translateError(getErrorMessage(methods.formState.errors, 'acceptTerms'))}
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
              {t('auth.acceptInvitation.submit')}
            </Button>
          </div>
          </form>
        </FormProvider>
      </CardBody>
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
            <p className="text-default-400 text-center py-8">
              {t('common.noDataAvailable')}
            </p>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>

    {/* Privacy Policy Modal */}
    <Modal
      isOpen={isPrivacyModalOpen}
      onClose={() => setIsPrivacyModalOpen(false)}
      size="3xl"
      scrollBehavior="inside"
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
            <p className="text-default-400 text-center py-8">
              {t('common.noDataAvailable')}
            </p>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
    </>
  )
}
