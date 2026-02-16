'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuth } from 'firebase/auth'
import { motion } from 'framer-motion'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  signInSchema,
  signUpSchema,
  type TSignInSchema,
  type TSignUpSchema,
} from '@packages/domain'
import { registerWithGoogle, ApiErrorCodes, HttpError } from '@packages/http-client'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

import { useAuth, useTranslation, useUser, getFirebaseErrorKey } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { clearUserCookie, clearSessionCookie, setUserCookie } from '@/libs/cookies'
import { savePendingRegistration } from '@/libs/storage'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { LanguageSwitcher } from '@/ui/components/language-switcher'
import { InputField } from '@/ui/components/input'
import { CheckboxField } from '@/ui/components/checkbox'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { getErrorMessage } from '@/utils/formErrors'

type AuthMode = 'signin' | 'signup'

interface AuthPageContentProps {
  initialMode?: AuthMode
}

function getValidRedirectUrl(redirectParam: string | null): string {
  if (!redirectParam) return '/dashboard'
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) return '/dashboard'
  try {
    const url = new URL(redirectParam, 'http://localhost')
    if (url.pathname !== redirectParam.split('?')[0]) return '/dashboard'
  } catch {
    return '/dashboard'
  }
  return redirectParam
}

const EASE = [0.4, 0, 0.2, 1]

export function AuthPageContent({ initialMode = 'signin' }: AuthPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { t, locale } = useTranslation()
  const { signInWithEmail, signInWithGoogle, signUpWithEmail, loading, signOut } = useAuth()
  const { setUser } = useUser()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasCleanedExpiredSession = useRef(false)
  const hasHandledTemporaryError = useRef(false)
  const hasHandledUserNotFound = useRef(false)
  const hasHandledInactivity = useRef(false)

  const redirectUrl = useMemo(
    () => getValidRedirectUrl(searchParams.get('redirect')),
    [searchParams]
  )

  // Error handling effects
  useEffect(() => {
    const expired = searchParams.get('expired')
    if (expired === 'true' && !hasCleanedExpiredSession.current) {
      hasCleanedExpiredSession.current = true
      clearSessionCookie()
      clearUserCookie()
      signOut().catch(() => {})
      router.replace('/auth')
    }
  }, [searchParams, router, signOut])

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'temporary' && !hasHandledTemporaryError.current) {
      hasHandledTemporaryError.current = true
      clearSessionCookie()
      clearUserCookie()
      signOut().catch(() => {})
      toast.error(t('auth.errors.temporaryError'))
      router.replace('/auth')
    }
  }, [searchParams, router, signOut, toast, t])

  useEffect(() => {
    const notfound = searchParams.get('notfound')
    if (notfound === 'true' && !hasHandledUserNotFound.current) {
      hasHandledUserNotFound.current = true
      clearSessionCookie()
      clearUserCookie()
      signOut().catch(() => {})
      toast.error(t('auth.errors.userNotFound'))
      router.replace('/auth')
    }
  }, [searchParams, router, signOut, toast, t])

  useEffect(() => {
    const inactivity = searchParams.get('inactivity')
    if (inactivity === 'true' && !hasHandledInactivity.current) {
      hasHandledInactivity.current = true
      clearSessionCookie()
      clearUserCookie()
      signOut().catch(() => {})
      toast.show(t('auth.errors.sessionExpiredInactivity'))
      router.replace('/auth')
    }
  }, [searchParams, router, signOut, toast, t])

  // Handlers
  const handleSignIn = useCallback(async (data: TSignInSchema) => {
    try {
      setIsSubmitting(true)
      await signInWithEmail(data.email, data.password)
      window.location.href = redirectUrl
    } catch (err) {
      toast.error(t(getFirebaseErrorKey(err)))
      setIsSubmitting(false)
    }
  }, [signInWithEmail, redirectUrl, toast, t])

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      window.location.href = redirectUrl
    } catch (err) {
      toast.error(t(getFirebaseErrorKey(err)))
      setIsSubmitting(false)
    }
  }, [signInWithGoogle, redirectUrl, toast, t])

  const handleSignUp = useCallback(async (data: TSignUpSchema) => {
    try {
      setIsSubmitting(true)
      await signUpWithEmail(data.email, data.password)
      savePendingRegistration({
        firstName: data.firstName,
        lastName: data.lastName,
        preferredLanguage: locale,
        acceptTerms: data.acceptTerms,
      })
      router.push('/loading?register=true')
    } catch (err) {
      toast.error(t(getFirebaseErrorKey(err)))
    } finally {
      setIsSubmitting(false)
    }
  }, [signUpWithEmail, locale, router, toast, t])

  const handleGoogleSignUp = useCallback(async () => {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) throw new Error(t('auth.signUp.googleError'))
      const token = await user.getIdToken()
      const registeredUser = await registerWithGoogle(token, {
        firstName: user.displayName?.split(' ')[0] ?? null,
        lastName: user.displayName?.split(' ').slice(1).join(' ') ?? null,
        preferredLanguage: 'es',
        acceptTerms: true,
      })
      setUser(registeredUser)
      setUserCookie(registeredUser)
      toast.success(t('auth.signUp.googleSuccess'))
      router.push('/dashboard')
    } catch (err) {
      if (HttpError.isHttpError(err)) {
        if (err.code === ApiErrorCodes.CONFLICT) {
          toast.success(t('auth.signUp.alreadyRegistered'))
          router.push('/dashboard')
          return
        }
        toast.error(err.message)
        return
      }
      toast.error(t(getFirebaseErrorKey(err)))
    } finally {
      setIsSubmitting(false)
    }
  }, [signInWithGoogle, setUser, router, toast, t])

  const isLoading = loading || isSubmitting
  const isSignIn = mode === 'signin'

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Floating controls */}
      <div className="fixed top-6 left-8 z-50">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <Typography as="span" variant="overline" weight="light" className="hidden md:inline text-foreground/50">
            {t('common.back')}
          </Typography>
        </Link>
      </div>

      <div className="fixed top-6 right-8 z-50 flex items-center gap-3">
        <LanguageSwitcher variant="icon" size="sm" />
        <ThemeSwitch />
      </div>

      {/* === DESKTOP LAYOUT === */}
      <div className="hidden lg:flex w-full h-full relative">
        {/* Forms layer (behind the overlay) */}
        <div className="absolute inset-0 flex">
          {/* Sign In form - left half */}
          <div className="w-1/2 flex items-center justify-center px-16">
            <motion.div
              className="w-full max-w-sm"
              initial={false}
              animate={{ opacity: isSignIn ? 1 : 0, x: isSignIn ? 0 : -30 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="h-[2px] w-10 bg-brick mb-8" />
              <Typography variant="h3" weight="bold" className="leading-tight mb-1">
                {t('auth.signIn.title')}
              </Typography>
              <Typography variant="body2" weight="light" className="text-foreground/40 mb-8">
                {t('auth.signIn.subtitle')}
              </Typography>
              <SignInFields
                isLoading={isLoading}
                onGoogleSignIn={handleGoogleSignIn}
                onSubmit={handleSignIn}
              />
            </motion.div>
          </div>

          {/* Sign Up form - right half */}
          <div className="w-1/2 flex items-center justify-center px-16">
            <motion.div
              className="w-full max-w-sm"
              initial={false}
              animate={{ opacity: !isSignIn ? 1 : 0, x: !isSignIn ? 0 : 30 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="h-[2px] w-10 bg-brick mb-8" />
              <Typography variant="h3" weight="bold" className="leading-tight mb-1">
                {t('auth.signUp.title')}
              </Typography>
              <Typography variant="body2" weight="light" className="text-foreground/40 mb-8">
                {t('auth.signUp.subtitle')}
              </Typography>
              <SignUpFields
                isLoading={isLoading}
                onGoogleSignUp={handleGoogleSignUp}
                onSubmit={handleSignUp}
              />
            </motion.div>
          </div>
        </div>

        {/* Sliding overlay panel */}
        <motion.div
          className="absolute top-0 bottom-0 w-1/2 bg-content2 dark:bg-[#1a1b1e] z-10 flex items-center justify-center"
          initial={false}
          animate={{ x: isSignIn ? '100%' : '0%' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-brick" />
          <div className="absolute bottom-16 left-12 w-px h-24 bg-brick/20" />
          <div className="absolute top-16 right-12 w-px h-24 bg-brick/20" />

          {/* Overlay content */}
          <motion.div
            className="text-center max-w-xs px-8"
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            key={mode}
          >
            <Typography variant="h4" weight="bold" className="leading-tight mb-4">
              {isSignIn ? t('auth.unified.noAccount') : t('auth.unified.alreadyHaveAccount')}
            </Typography>
            <Typography variant="body2" weight="light" className="text-foreground/40 leading-relaxed mb-10">
              {isSignIn ? t('auth.unified.signUpSubtitle') : t('auth.unified.signInSubtitle')}
            </Typography>
            <Button
              variant="bordered"
              color="default"
              radius="none"
              disableRipple
              className="text-[11px] font-medium tracking-[0.2em] uppercase px-10 py-3.5 border-foreground/20 text-foreground/80 hover:border-brick hover:text-brick"
              onPress={() => setMode(isSignIn ? 'signup' : 'signin')}
            >
              {isSignIn ? t('auth.unified.goToSignUp') : t('auth.unified.goToSignIn')}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* === MOBILE LAYOUT === */}
      <div className="lg:hidden w-full h-full overflow-y-auto flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          className="w-full max-w-sm"
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <div className="h-[2px] w-10 bg-brick mb-8" />
          <Typography variant="h4" weight="bold" className="leading-tight mb-1">
            {isSignIn ? t('auth.signIn.title') : t('auth.signUp.title')}
          </Typography>
          <Typography variant="body2" weight="light" className="text-foreground/40 mb-8">
            {isSignIn ? t('auth.signIn.subtitle') : t('auth.signUp.subtitle')}
          </Typography>

          {isSignIn ? (
            <SignInFields
              isLoading={isLoading}
              onGoogleSignIn={handleGoogleSignIn}
              onSubmit={handleSignIn}
            />
          ) : (
            <SignUpFields
              isLoading={isLoading}
              onGoogleSignUp={handleGoogleSignUp}
              onSubmit={handleSignUp}
            />
          )}

          <div className="mt-8 text-center">
            <Button
              variant="light"
              color="default"
              radius="none"
              disableRipple
              className="text-sm text-foreground/40 hover:text-brick font-light"
              onPress={() => setMode(isSignIn ? 'signup' : 'signin')}
            >
              {isSignIn ? t('auth.unified.noAccountMobile') : t('auth.unified.alreadyHaveAccountMobile')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ──────────── Sign In Form Fields ──────────── */

function SignInFields({
  onSubmit,
  onGoogleSignIn,
  isLoading,
}: {
  onSubmit: (data: TSignInSchema) => void
  onGoogleSignIn: () => void
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)

  const methods = useForm<TSignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const translateError = (msg: string | undefined) => (msg ? t(msg) : undefined)

  return (
    <FormProvider {...methods}>
      <form className="space-y-5" onSubmit={methods.handleSubmit(onSubmit)}>
        <div>
          <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
            {t('auth.signIn.email')}
          </Typography>
          <InputField
            name="email"
            type="email"
            placeholder={t('auth.signIn.emailPlaceholder')}
            size="lg"
            variant="bordered"
            radius="none"
            startContent={<Mail className="w-4 h-4 text-foreground/30" />}
            isRequired
            translateError={translateError}
          />
        </div>

        <div>
          <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
            {t('auth.signIn.password')}
          </Typography>
          <InputField
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('auth.signIn.passwordPlaceholder')}
            size="lg"
            variant="bordered"
            radius="none"
            startContent={<Lock className="w-4 h-4 text-foreground/30" />}
            endContent={
              <button
                className="focus:outline-none text-foreground/30 hover:text-foreground/60 transition-colors"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            isRequired
            translateError={translateError}
          />
        </div>

        <div className="flex items-center justify-between">
          <CheckboxField name="rememberMe">
            <Typography as="span" variant="caption" weight="light" className="text-foreground/50">
              {t('auth.signIn.rememberMe')}
            </Typography>
          </CheckboxField>
          <Link className="text-xs text-foreground/40 hover:text-brick transition-colors font-light" href="/forgot-password">
            {t('auth.signIn.forgotPassword')}
          </Link>
        </div>

        <Button
          color="primary"
          variant="solid"
          radius="none"
          fullWidth
          isLoading={isLoading}
          type="submit"
          className="text-[11px] font-medium tracking-[0.2em] uppercase py-3.5"
        >
          {t('auth.signIn.submit')}
        </Button>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-foreground/10" />
        <Typography as="span" variant="overline" className="text-[10px] text-foreground/30">
          {t('auth.signIn.orContinueWith')}
        </Typography>
        <div className="flex-1 h-px bg-foreground/10" />
      </div>

      <Button
        variant="bordered"
        color="default"
        radius="none"
        fullWidth
        isDisabled={isLoading}
        disableRipple
        startContent={<GoogleIcon />}
        onPress={onGoogleSignIn}
        className="text-xs font-light tracking-wider border-foreground/10 text-foreground/60 hover:border-foreground/30"
      >
        {t('auth.signIn.continueWithGoogle')}
      </Button>
    </FormProvider>
  )
}

/* ──────────── Sign Up Form Fields ──────────── */

function SignUpFields({
  onSubmit,
  onGoogleSignUp,
  isLoading,
}: {
  onSubmit: (data: TSignUpSchema) => void
  onGoogleSignUp: () => void
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const methods = useForm<TSignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  const translateError = (msg: string | undefined) => (msg ? t(msg) : undefined)

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={methods.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
              {t('auth.signUp.firstName')}
            </Typography>
            <InputField
              name="firstName"
              placeholder={t('auth.signUp.firstNamePlaceholder')}
              size="md"
              variant="bordered"
              radius="none"
              startContent={<User className="w-4 h-4 text-foreground/30" />}
              isRequired
              translateError={translateError}
            />
          </div>
          <div>
            <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
              {t('auth.signUp.lastName')}
            </Typography>
            <InputField
              name="lastName"
              placeholder={t('auth.signUp.lastNamePlaceholder')}
              size="md"
              variant="bordered"
              radius="none"
              startContent={<User className="w-4 h-4 text-foreground/30" />}
              isRequired
              translateError={translateError}
            />
          </div>
        </div>

        <div>
          <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
            {t('auth.signUp.email')}
          </Typography>
          <InputField
            name="email"
            type="email"
            placeholder={t('auth.signUp.emailPlaceholder')}
            size="md"
            variant="bordered"
            radius="none"
            startContent={<Mail className="w-4 h-4 text-foreground/30" />}
            isRequired
            translateError={translateError}
          />
        </div>

        <div>
          <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
            {t('auth.signUp.password')}
          </Typography>
          <InputField
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('auth.signUp.passwordPlaceholder')}
            size="md"
            variant="bordered"
            radius="none"
            startContent={<Lock className="w-4 h-4 text-foreground/30" />}
            endContent={
              <button
                className="focus:outline-none text-foreground/30 hover:text-foreground/60 transition-colors"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            isRequired
            translateError={translateError}
          />
        </div>

        <div>
          <Typography as="label" variant="overline" className="text-[11px] tracking-widest text-foreground/40 mb-2 block">
            {t('auth.signUp.confirmPassword')}
          </Typography>
          <InputField
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
            size="md"
            variant="bordered"
            radius="none"
            startContent={<Lock className="w-4 h-4 text-foreground/30" />}
            endContent={
              <button
                className="focus:outline-none text-foreground/30 hover:text-foreground/60 transition-colors"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            isRequired
            translateError={translateError}
          />
        </div>

        <div>
          <CheckboxField name="acceptTerms">
            <Typography as="span" variant="caption" weight="light" className="text-foreground/50">
              {t('auth.signUp.acceptTerms')}{' '}
              <Link className="text-xs text-foreground/60 hover:text-brick transition-colors" href="/terms">
                {t('auth.signUp.termsAndConditions')}
              </Link>{' '}
              {t('auth.signUp.and')}{' '}
              <Link className="text-xs text-foreground/60 hover:text-brick transition-colors" href="/privacy">
                {t('auth.signUp.privacyPolicy')}
              </Link>
            </Typography>
          </CheckboxField>
          {getErrorMessage(methods.formState.errors, 'acceptTerms') && (
            <Typography variant="caption" color="danger" className="mt-1">
              {translateError(getErrorMessage(methods.formState.errors, 'acceptTerms'))}
            </Typography>
          )}
        </div>

        <Button
          color="primary"
          variant="solid"
          radius="none"
          fullWidth
          isLoading={isLoading}
          type="submit"
          className="text-[11px] font-medium tracking-[0.2em] uppercase py-3.5"
        >
          {t('auth.signUp.submit')}
        </Button>
      </form>

      <div className="flex items-center gap-4 my-5">
        <div className="flex-1 h-px bg-foreground/10" />
        <Typography as="span" variant="overline" className="text-[10px] text-foreground/30">
          {t('auth.signUp.orContinueWith')}
        </Typography>
        <div className="flex-1 h-px bg-foreground/10" />
      </div>

      <Button
        variant="bordered"
        color="default"
        radius="none"
        fullWidth
        isDisabled={isLoading}
        disableRipple
        startContent={<GoogleIcon />}
        onPress={onGoogleSignUp}
        className="text-xs font-light tracking-wider border-foreground/10 text-foreground/60 hover:border-foreground/30"
      >
        {t('auth.signUp.continueWithGoogle')}
      </Button>
    </FormProvider>
  )
}

/* ──────────── Google Icon ──────────── */

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
