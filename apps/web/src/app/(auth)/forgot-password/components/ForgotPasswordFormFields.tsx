'use client'

import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'
import { InputField } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'

// TODO: Move to @packages/domain
const forgotPasswordSchema = z.object({
  email: z.string().email('validation.email.invalid'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormFieldsProps {
  onSubmit: (data: ForgotPasswordFormData) => void
  onBackToSignIn: () => void
  isLoading?: boolean
  emailSent?: boolean
}

export function ForgotPasswordFormFields({
  onSubmit,
  onBackToSignIn,
  isLoading,
  emailSent,
}: ForgotPasswordFormFieldsProps) {
  const { t } = useTranslation()

  const methods = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  // Translate error messages from i18n keys
  const translateError = (message: string | undefined): string | undefined => {
    return message ? t(message) : undefined
  }

  if (emailSent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-4 py-8">
          <div className="rounded-full bg-success/10 p-3">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          <div className="space-y-2">
            <Typography className="text-success" variant="h3">
              {t('auth.forgotPassword.success')}
            </Typography>
            <Typography className="text-muted" variant="body1">
              {t('auth.forgotPassword.successMessage')}
            </Typography>
          </div>
        </div>

        <Button
          fullWidth
          className="w-full font-semibold"
          size="lg"
          startContent={<ArrowLeft className="w-5 h-5" />}
          variant="bordered"
          onPress={onBackToSignIn}
        >
          {t('auth.forgotPassword.backToSignIn')}
        </Button>
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      {/* Form */}
      <form className="space-y-6" onSubmit={methods.handleSubmit(onSubmit)}>
        <div>
          <Typography className="mb-2" variant="body2">
            {t('auth.forgotPassword.email')}
          </Typography>
          <InputField
            name="email"
            type="email"
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            size="lg"
            startContent={<Mail className="w-5 h-5 text-default-400" />}
            isRequired
            translateError={translateError}
          />
        </div>

        <Button
          fullWidth
          className="w-full font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
          color="primary"
          isDisabled={isLoading}
          isLoading={isLoading}
          size="lg"
          type="submit"
        >
          {t('auth.forgotPassword.submit')}
        </Button>
      </form>

      {/* Back to Sign In */}
      <div className="mt-6">
        <Button
          fullWidth
          className="w-full font-semibold"
          size="lg"
          startContent={<ArrowLeft className="w-5 h-5" />}
          variant="light"
          onPress={onBackToSignIn}
        >
          {t('auth.forgotPassword.backToSignIn')}
        </Button>
      </div>
    </FormProvider>
  )
}
