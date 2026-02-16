'use client'

import { useCallback, useState, useEffect } from 'react'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Info, Wand2 } from 'lucide-react'
import { Button } from '@heroui/button'

import { useAuth, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { InputField } from '@/ui/components/input'
import { PhoneInputField } from '@/ui/components/phone-input'
import { LocationSelector } from '@/ui/components/location-selector'
import { Typography } from '@/ui/components/typography'
import { FormShell } from '@/ui/components/forms'
import { Tooltip } from '@/ui/components/tooltip'
import { ManagementCompanyMultiSelect } from '@/ui/components/management-company-autocomplete'
import { useCreateCondominium, useGenerateCondominiumCode, HttpError } from '@packages/http-client'

// Form schema for creating a condominium - all fields required
const createCondominiumFormSchema = z.object({
  name: z.string().min(1, 'superadmin.condominiums.form.validation.name.required').max(255),
  code: z.string().min(1, 'superadmin.condominiums.form.validation.code.required').max(50),
  managementCompanyIds: z
    .array(z.string().uuid())
    .min(1, 'superadmin.condominiums.form.validation.managementCompany.required'),
  address: z.string().min(1, 'superadmin.condominiums.form.validation.address.required').max(500),
  locationId: z.string().uuid('superadmin.condominiums.form.validation.location.required'),
  email: z.string().min(1, 'superadmin.condominiums.form.validation.email.required').email('superadmin.condominiums.form.validation.email.invalid').max(255),
  phone: z.string().min(1, 'superadmin.condominiums.form.validation.phone.required').max(50),
  phoneCountryCode: z.string().min(1, 'superadmin.condominiums.form.validation.phoneCountryCode.required').max(10),
})

type TCreateCondominiumForm = z.infer<typeof createCondominiumFormSchema>

function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <Typography variant="subtitle1" className="font-semibold">
        {title}
      </Typography>
      <Tooltip
        content={tooltip}
        placement="right"
        showArrow
        classNames={{
          content: 'max-w-xs text-sm',
        }}
      >
        <Info className="h-4 w-4 text-default-400 cursor-help" />
      </Tooltip>
    </div>
  )
}

export function CreateCondominiumForm() {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [token, setToken] = useState<string>('')

  // Get token on mount
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const form = useForm<TCreateCondominiumForm>({
    resolver: zodResolver(createCondominiumFormSchema),
    defaultValues: {
      name: '',
      code: '',
      managementCompanyIds: [],
      address: '',
      locationId: '',
      email: '',
      phone: '',
      phoneCountryCode: '+58',
    },
    mode: 'onBlur',
  })

  const { control, formState: { errors } } = form

  // Create condominium mutation
  const createCondominiumMutation = useCreateCondominium({
    token,
    onSuccess: () => {
      toast.success(t('superadmin.condominiums.form.success'))
      router.push('/dashboard/condominiums')
    },
    onError: (error: Error) => {
      if (HttpError.isHttpError(error)) {
        toast.error(error.message)
      } else {
        toast.error(t('superadmin.condominiums.form.error'))
      }
    },
  })

  // Generate code mutation
  const generateCodeMutation = useGenerateCondominiumCode({
    token,
    onSuccess: (data) => {
      form.setValue('code', data.code, { shouldValidate: true })
      toast.success(t('superadmin.condominiums.form.codeGenerated'))
    },
    onError: (error: Error) => {
      if (HttpError.isHttpError(error)) {
        toast.error(error.message)
      } else {
        toast.error(t('superadmin.condominiums.form.codeGenerateError'))
      }
    },
  })

  const handleGenerateCode = useCallback(() => {
    if (!token) return
    generateCodeMutation.mutate()
  }, [token, generateCodeMutation])

  const handleSubmit = useCallback(
    async (data: TCreateCondominiumForm) => {
      if (!firebaseUser || !token) return

      try {
        await createCondominiumMutation.mutateAsync({
          name: data.name,
          code: data.code,
          managementCompanyIds: data.managementCompanyIds,
          address: data.address,
          locationId: data.locationId,
          email: data.email,
          phone: data.phone,
          phoneCountryCode: data.phoneCountryCode,
          defaultCurrencyId: null,
          isActive: true,
          metadata: null,
          createdBy: null,
        })
      } catch {
        // Error already handled in onError callback
      }
    },
    [firebaseUser, token, createCondominiumMutation]
  )

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  return (
    <FormProvider {...form}>
      <FormShell
        onSubmit={form.handleSubmit(handleSubmit)}
        isSubmitting={createCondominiumMutation.isPending}
        submitButtonText={t('superadmin.condominiums.form.submit')}
        submittingButtonText={t('superadmin.condominiums.form.submitting')}
        cancelButtonText={t('common.cancel')}
        onCancel={() => router.push('/dashboard/condominiums')}
        minHeight="auto"
      >
        <div className="space-y-10">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <SectionHeader
              title={t('superadmin.condominiums.form.basicSection.title')}
              tooltip={t('superadmin.condominiums.form.basicSection.description')}
            />

            <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
              <InputField
                name="name"
                isRequired
                tooltip={t('superadmin.condominiums.form.fields.nameDescription')}
                label={t('superadmin.condominiums.form.fields.name')}
                placeholder={t('superadmin.condominiums.form.fields.namePlaceholder')}
                translateError={translateError}
                errorMessage={translateError(errors?.name?.message)}
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    name="code"
                    isRequired
                    tooltip={t('superadmin.condominiums.form.fields.codeDescription')}
                    label={t('superadmin.condominiums.form.fields.code')}
                    placeholder={t('superadmin.condominiums.form.fields.codePlaceholder')}
                    translateError={translateError}
                    errorMessage={translateError(errors?.code?.message)}
                  />
                </div>
                <div className="pt-[26px]">
                  <Tooltip
                    content={t('superadmin.condominiums.form.fields.generateCode')}
                    placement="top"
                  >
                    <Button
                      type="button"
                      variant="flat"
                      color="primary"
                      size="sm"
                      isIconOnly
                      isLoading={generateCodeMutation.isPending}
                      onPress={handleGenerateCode}
                    >
                      <Wand2 size={14} />
                    </Button>
                  </Tooltip>
                </div>
              </div>

              <Controller
                control={control}
                name="managementCompanyIds"
                render={({ field }) => (
                  <ManagementCompanyMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    isRequired
                    errorMessage={translateError(errors?.managementCompanyIds?.message)}
                    label={t('superadmin.condominiums.form.fields.managementCompanies')}
                    tooltip={t('superadmin.condominiums.form.fields.managementCompaniesDescription')}
                    placeholder={t('superadmin.condominiums.form.fields.managementCompanyPlaceholder')}
                  />
                )}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-6">
            <SectionHeader
              title={t('superadmin.condominiums.form.contactSection.title')}
              tooltip={t('superadmin.condominiums.form.contactSection.description')}
            />

            <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
              <InputField
                name="email"
                type="email"
                isRequired
                tooltip={t('superadmin.condominiums.form.fields.emailDescription')}
                label={t('superadmin.condominiums.form.fields.email')}
                placeholder={t('superadmin.condominiums.form.fields.emailPlaceholder')}
                translateError={translateError}
                errorMessage={translateError(errors?.email?.message)}
              />

              <PhoneInputField
                countryCodeFieldName="phoneCountryCode"
                phoneNumberFieldName="phone"
                isRequired
                label={t('superadmin.condominiums.form.fields.phone')}
                tooltip={t('superadmin.condominiums.form.fields.phoneDescription')}
                translateError={translateError}
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-6">
            <SectionHeader
              title={t('superadmin.condominiums.form.locationSection.title')}
              tooltip={t('superadmin.condominiums.form.locationSection.description')}
            />

            <div className="flex flex-col gap-8">
              <Controller
                control={control}
                name="locationId"
                render={({ field }) => (
                  <LocationSelector
                    value={field.value}
                    onChange={(locationId) => field.onChange(locationId)}
                    isRequired
                    errorMessage={translateError(errors?.locationId?.message)}
                    label={t('superadmin.condominiums.form.fields.location')}
                    tooltip={t('superadmin.condominiums.form.fields.locationDescription')}
                    countryLabel={t('common.country')}
                    countryPlaceholder={t('common.countryPlaceholder')}
                    provinceLabel={t('common.province')}
                    provincePlaceholder={t('common.provincePlaceholder')}
                    cityLabel={t('common.city')}
                    cityPlaceholder={t('common.cityPlaceholder')}
                  />
                )}
              />

              <InputField
                name="address"
                isRequired
                tooltip={t('superadmin.condominiums.form.fields.addressDescription')}
                label={t('superadmin.condominiums.form.fields.address')}
                placeholder={t('superadmin.condominiums.form.fields.addressPlaceholder')}
                translateError={translateError}
                errorMessage={translateError(errors?.address?.message)}
              />
            </div>
          </div>
        </div>
      </FormShell>
    </FormProvider>
  )
}
