'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth } from 'firebase/auth'
import { type TSignUpSchema } from '@packages/domain'
import { registerWithGoogle, ApiErrorCodes, HttpError } from '@packages/http-client'

import { SignUpFormFields } from './SignUpFormFields'
import { SignUpHeader } from './SignUpHeader'

import { useAuth, useTranslation, useUser, getFirebaseErrorKey } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { setUserCookie } from '@/libs/cookies'
import { savePendingRegistration } from '@/libs/storage'

export function SignUpForm() {
  const router = useRouter()
  const toast = useToast()
  const { t, locale } = useTranslation()
  const { signUpWithEmail, signInWithGoogle, loading } = useAuth()
  const { setUser } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: TSignUpSchema) {
    try {
      setIsSubmitting(true)
      await signUpWithEmail(data.email, data.password)

      // Save registration data for the loading page to complete the registration
      savePendingRegistration({
        firstName: data.firstName,
        lastName: data.lastName,
        preferredLanguage: locale,
        acceptTerms: data.acceptTerms,
      })

      router.push('/loading?register=true')
    } catch (err) {
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignUp() {
    try {
      setIsSubmitting(true)

      // Step 1: Authenticate with Firebase via Google
      await signInWithGoogle()

      // Step 2: Get the Firebase token
      const auth = getAuth()
      const user = auth.currentUser

      if (!user) {
        throw new Error(t('auth.signUp.googleError'))
      }

      const token = await user.getIdToken()

      // Step 3: Register the user in the database
      const registeredUser = await registerWithGoogle(token, {
        firstName: user.displayName?.split(' ')[0] ?? null,
        lastName: user.displayName?.split(' ').slice(1).join(' ') ?? null,
        preferredLanguage: 'es',
        acceptTerms: true,
      })

      // Step 4: Set user in context and cookie
      setUser(registeredUser)
      setUserCookie(registeredUser)

      toast.success(t('auth.signUp.googleSuccess'))
      router.push('/dashboard')
    } catch (err) {
      // Handle API error codes
      if (HttpError.isHttpError(err)) {
        if (err.code === ApiErrorCodes.CONFLICT) {
          // User already registered, redirect to loading to get the existing user
          toast.success(t('auth.signUp.alreadyRegistered'))
          router.push('/loading')

          return
        }

        // Show API error message (already translated from backend)
        toast.error(err.message)

        return
      }

      // Handle Firebase errors
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <SignUpHeader />
      <SignUpFormFields
        isLoading={loading || isSubmitting}
        onGoogleSignUp={handleGoogleSignUp}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
