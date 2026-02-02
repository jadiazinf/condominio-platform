'use client'

import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema, type TSignUpSchema } from '@packages/domain'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'
import { InputField } from '@/ui/components/input'
import { CheckboxField } from '@/ui/components/checkbox'
import { Link } from '@/ui/components/link'
import { Typography } from '@/ui/components/typography'
import { getErrorMessage } from '@/utils/formErrors'

interface SignUpFormFieldsProps {
  onSubmit: (data: TSignUpSchema) => void
  onGoogleSignUp: () => void
  isLoading?: boolean
}

export function SignUpFormFields({ onSubmit, onGoogleSignUp, isLoading }: SignUpFormFieldsProps) {
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

  // Translate error messages from i18n keys
  const translateError = (message: string | undefined): string | undefined => {
    return message ? t(message) : undefined
  }

  return (
    <FormProvider {...methods}>
      {/* Form */}
      <form className="space-y-4" onSubmit={methods.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Typography className="mb-2" variant="body2">
              {t('auth.signUp.firstName')}
            </Typography>
            <InputField
              name="firstName"
              placeholder={t('auth.signUp.firstNamePlaceholder')}
              size="lg"
              startContent={<User className="w-5 h-5 text-default-400" />}
              isRequired
              translateError={translateError}
            />
          </div>

          <div>
            <Typography className="mb-2" variant="body2">
              {t('auth.signUp.lastName')}
            </Typography>
            <InputField
              name="lastName"
              placeholder={t('auth.signUp.lastNamePlaceholder')}
              size="lg"
              startContent={<User className="w-5 h-5 text-default-400" />}
              isRequired
              translateError={translateError}
            />
          </div>
        </div>

        <div>
          <Typography className="mb-2" variant="body2">
            {t('auth.signUp.email')}
          </Typography>
          <InputField
            name="email"
            type="email"
            placeholder={t('auth.signUp.emailPlaceholder')}
            size="lg"
            startContent={<Mail className="w-5 h-5 text-default-400" />}
            isRequired
            translateError={translateError}
          />
        </div>

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
          <CheckboxField name="acceptTerms">
            <Typography variant="body2">
              {t('auth.signUp.acceptTerms')}{' '}
              <Link className="text-sm" href="/terms">
                {t('auth.signUp.termsAndConditions')}
              </Link>{' '}
              {t('auth.signUp.and')}{' '}
              <Link className="text-sm" href="/privacy">
                {t('auth.signUp.privacyPolicy')}
              </Link>
            </Typography>
          </CheckboxField>
          {getErrorMessage(methods.formState.errors, 'acceptTerms') && (
            <Typography className="mt-1 text-danger text-xs" variant="body2">
              {translateError(getErrorMessage(methods.formState.errors, 'acceptTerms'))}
            </Typography>
          )}
        </div>

        <div className="pt-4">
          <Button
            fullWidth
            className="w-full font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
            color="primary"
            isDisabled={isLoading}
            isLoading={isLoading}
            size="lg"
            type="submit"
          >
            {t('auth.signUp.submit')}
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-divider" />
        <Typography color="muted" variant="body2">
          {t('auth.signUp.orContinueWith')}
        </Typography>
        <div className="flex-1 h-px bg-divider" />
      </div>

      {/* Social Sign Up */}
      <div className="space-y-3">
        <Button
          fullWidth
          className="w-full font-semibold"
          isDisabled={isLoading}
          size="lg"
          startContent={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          }
          variant="bordered"
          onPress={onGoogleSignUp}
        >
          {t('auth.signUp.continueWithGoogle')}
        </Button>
      </div>
    </FormProvider>
  )
}
