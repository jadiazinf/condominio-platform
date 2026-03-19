'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import {
  useSubscriptionTermsDetail,
  useUpdateSubscriptionTerms,
  useDeactivateSubscriptionTerms,
  subscriptionTermsKeys,
  useQueryClient,
} from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { DatePicker } from '@/ui/components/date-picker'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { Card, CardBody } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

const editTermsSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  summary: z.string().optional(),
  effectiveFrom: z.string().min(1),
  effectiveUntil: z.string().optional(),
  isActive: z.boolean(),
})

type TEditTermsForm = z.infer<typeof editTermsSchema>

function formatDateForInput(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)

  return d.toISOString().split('T')[0]
}

interface EditTermsFormProps {
  id: string
}

export function EditTermsForm({ id }: EditTermsFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useSubscriptionTermsDetail(id)
  const terms = data?.data

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TEditTermsForm>({
    resolver: zodResolver(editTermsSchema),
    values: terms
      ? {
          title: terms.title,
          content: terms.content,
          summary: terms.summary ?? '',
          effectiveFrom: formatDateForInput(terms.effectiveFrom),
          effectiveUntil: formatDateForInput(terms.effectiveUntil),
          isActive: terms.isActive,
        }
      : undefined,
  })

  const updateMutation = useUpdateSubscriptionTerms(id, {
    onSuccess: () => {
      toast.success(t('superadmin.terms.edit.success'))
      router.push('/dashboard/terms-conditions')
    },
    onError: (error: Error) => {
      toast.error(error.message || t('superadmin.terms.edit.error'))
    },
  })

  const deactivateMutation = useDeactivateSubscriptionTerms({
    onSuccess: () => {
      toast.success(t('superadmin.terms.deactivate.success'))
      queryClient.invalidateQueries({ queryKey: subscriptionTermsKeys.all })
      router.push('/dashboard/terms-conditions')
    },
    onError: () => {
      toast.error(t('superadmin.terms.deactivate.error'))
    },
  })

  const onSubmit = (data: TEditTermsForm) => {
    updateMutation.mutate({
      title: data.title,
      content: data.content,
      summary: data.summary || null,
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
      isActive: data.isActive,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    )
  }

  if (error || !terms) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center justify-center py-16">
          <Typography color="danger" variant="body1">
            {t('common.loadError')}
          </Typography>
          <Button
            className="mt-4"
            color="primary"
            onPress={() => router.push('/dashboard/terms-conditions')}
          >
            {t('common.back')}
          </Button>
        </CardBody>
      </Card>
    )
  }

  const isPending = isSubmitting || updateMutation.isPending

  return (
    <Card>
      <CardBody>
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          {/* Version (read-only) */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography className="text-default-700" variant="h4">
              {t('superadmin.terms.form.basicInfo')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input isDisabled label={t('superadmin.terms.form.version')} value={terms.version} />

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
                  <DatePicker
                    isRequired
                    errorMessage={errors.effectiveFrom?.message}
                    label={t('superadmin.terms.form.effectiveFrom')}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                control={control}
                name="effectiveUntil"
                render={({ field }) => (
                  <DatePicker
                    label={t('superadmin.terms.form.effectiveUntil')}
                    value={field.value || ''}
                    onChange={field.onChange}
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

          {/* Actions */}
          <div className="flex justify-between">
            {terms.isActive && (
              <Button
                color="warning"
                isDisabled={isPending}
                isLoading={deactivateMutation.isPending}
                variant="flat"
                onPress={() => deactivateMutation.mutate({ id: terms.id })}
              >
                {t('superadmin.terms.deactivate.title')}
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button
                isDisabled={isPending}
                variant="flat"
                onPress={() => router.push('/dashboard/terms-conditions')}
              >
                {t('superadmin.terms.form.cancel')}
              </Button>
              <Button color="primary" isLoading={isPending} type="submit">
                {t('superadmin.terms.form.save')}
              </Button>
            </div>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
