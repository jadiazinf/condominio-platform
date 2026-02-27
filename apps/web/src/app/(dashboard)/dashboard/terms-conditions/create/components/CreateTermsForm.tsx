'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useCreateSubscriptionTerms } from '@packages/http-client'

const createTermsSchema = z.object({
  version: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  summary: z.string().optional(),
  effectiveFrom: z.string().min(1),
  effectiveUntil: z.string().optional(),
  isActive: z.boolean(),
})

type TCreateTermsForm = z.infer<typeof createTermsSchema>

export function CreateTermsForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TCreateTermsForm>({
    resolver: zodResolver(createTermsSchema),
    defaultValues: {
      version: '',
      title: '',
      content: '',
      summary: '',
      effectiveFrom: '',
      effectiveUntil: '',
      isActive: true,
    },
  })

  const createMutation = useCreateSubscriptionTerms({
    onSuccess: () => {
      toast.success(t('superadmin.terms.create.success'))
      router.push('/dashboard/terms-conditions')
    },
    onError: (error: Error) => {
      toast.error(error.message || t('superadmin.terms.create.error'))
    },
  })

  const onSubmit = (data: TCreateTermsForm) => {
    createMutation.mutate({
      version: data.version,
      title: data.title,
      content: data.content,
      summary: data.summary || null,
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
      isActive: data.isActive,
    })
  }

  const isPending = isSubmitting || createMutation.isPending

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography variant="h4" className="text-default-700">
              {t('superadmin.terms.form.basicInfo')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="version"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.terms.form.version')}
                    placeholder={t('superadmin.terms.form.versionPlaceholder')}
                    errorMessage={errors.version?.message}
                    isInvalid={!!errors.version}
                    isRequired
                  />
                )}
              />

              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.terms.form.titleLabel')}
                    placeholder={t('superadmin.terms.form.titlePlaceholder')}
                    errorMessage={errors.title?.message}
                    isInvalid={!!errors.title}
                    isRequired
                  />
                )}
              />
            </div>

            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  label={t('superadmin.terms.form.content')}
                  placeholder={t('superadmin.terms.form.contentPlaceholder')}
                  errorMessage={errors.content?.message}
                  isInvalid={!!errors.content}
                  minRows={10}
                  isRequired
                />
              )}
            />

            <Controller
              name="summary"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  value={field.value || ''}
                  label={t('superadmin.terms.form.summary')}
                  placeholder={t('superadmin.terms.form.summaryPlaceholder')}
                  minRows={3}
                />
              )}
            />
          </div>

          {/* Dates */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography variant="h4" className="text-default-700">
              {t('superadmin.terms.form.dates')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="effectiveFrom"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    label={t('superadmin.terms.form.effectiveFrom')}
                    errorMessage={errors.effectiveFrom?.message}
                    isInvalid={!!errors.effectiveFrom}
                    isRequired
                  />
                )}
              />

              <Controller
                name="effectiveUntil"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ''}
                    type="date"
                    label={t('superadmin.terms.form.effectiveUntil')}
                  />
                )}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
            <Typography variant="body2">
              {t('superadmin.terms.form.isActive')}
            </Typography>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              variant="flat"
              onPress={() => router.push('/dashboard/terms-conditions')}
              isDisabled={isPending}
            >
              {t('superadmin.terms.form.cancel')}
            </Button>
            <Button
              color="primary"
              type="submit"
              isLoading={isPending}
            >
              {t('superadmin.terms.form.create')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
