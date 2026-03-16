'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useCreateSubscriptionTerms } from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

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
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Information */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography className="text-default-700" variant="h4">
              {t('superadmin.terms.form.basicInfo')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="version"
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    errorMessage={errors.version?.message}
                    isInvalid={!!errors.version}
                    label={t('superadmin.terms.form.version')}
                    placeholder={t('superadmin.terms.form.versionPlaceholder')}
                  />
                )}
              />

              <Controller
                control={control}
                name="title"
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    errorMessage={errors.title?.message}
                    isInvalid={!!errors.title}
                    label={t('superadmin.terms.form.titleLabel')}
                    placeholder={t('superadmin.terms.form.titlePlaceholder')}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <Textarea
                  {...field}
                  isRequired
                  errorMessage={errors.content?.message}
                  isInvalid={!!errors.content}
                  label={t('superadmin.terms.form.content')}
                  minRows={10}
                  placeholder={t('superadmin.terms.form.contentPlaceholder')}
                />
              )}
            />

            <Controller
              control={control}
              name="summary"
              render={({ field }) => (
                <Textarea
                  {...field}
                  label={t('superadmin.terms.form.summary')}
                  minRows={3}
                  placeholder={t('superadmin.terms.form.summaryPlaceholder')}
                  value={field.value || ''}
                />
              )}
            />
          </div>

          {/* Dates */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography className="text-default-700" variant="h4">
              {t('superadmin.terms.form.dates')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="effectiveFrom"
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    errorMessage={errors.effectiveFrom?.message}
                    isInvalid={!!errors.effectiveFrom}
                    label={t('superadmin.terms.form.effectiveFrom')}
                    type="date"
                  />
                )}
              />

              <Controller
                control={control}
                name="effectiveUntil"
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.terms.form.effectiveUntil')}
                    type="date"
                    value={field.value || ''}
                  />
                )}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
            <Typography variant="body2">{t('superadmin.terms.form.isActive')}</Typography>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              isDisabled={isPending}
              variant="flat"
              onPress={() => router.push('/dashboard/terms-conditions')}
            >
              {t('superadmin.terms.form.cancel')}
            </Button>
            <Button color="primary" isLoading={isPending} type="submit">
              {t('superadmin.terms.form.create')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
