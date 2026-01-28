'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendPasswordResetEmail } from 'firebase/auth'
import { Card, CardBody } from '@/ui/components/card'

import { ForgotPasswordFormFields } from './ForgotPasswordFormFields'
import { ForgotPasswordHeader } from './ForgotPasswordHeader'

import { useTranslation, getFirebaseErrorKey } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { getFirebaseAuth } from '@/libs/firebase'

interface ForgotPasswordFormData {
  email: string
}

export function ForgotPasswordForm() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(data: ForgotPasswordFormData) {
    try {
      setIsSubmitting(true)
      const auth = getFirebaseAuth()

      await sendPasswordResetEmail(auth, data.email)

      setEmailSent(true)
      toast.success(t('auth.forgotPassword.success'))
    } catch (err) {
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBackToSignIn() {
    router.push('/signin')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardBody className="p-6">
          <ForgotPasswordHeader />
          <ForgotPasswordFormFields
            emailSent={emailSent}
            isLoading={isSubmitting}
            onBackToSignIn={handleBackToSignIn}
            onSubmit={handleSubmit}
          />
        </CardBody>
      </Card>
    </div>
  )
}
