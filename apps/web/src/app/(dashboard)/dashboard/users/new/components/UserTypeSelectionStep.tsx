'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { RadioGroup, Radio } from '@/ui/components/radio'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { Info, User, Building, Shield } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { TUserType } from '../hooks/useCreateUserForm'

interface UserTypeSelectionStepProps {
  translateError: (message: string | undefined) => string | undefined
}

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

export function UserTypeSelectionStep({ translateError }: UserTypeSelectionStepProps) {
  const { t } = useTranslation()
  const { control, formState: { errors } } = useFormContext()

  const userTypeOptions: Array<{ value: TUserType; label: string; description: string; icon: React.ReactNode }> = [
    {
      value: 'general',
      label: t('superadmin.users.create.userType.general.label'),
      description: t('superadmin.users.create.userType.general.description'),
      icon: <User className="h-5 w-5" />,
    },
    {
      value: 'condominium',
      label: t('superadmin.users.create.userType.condominium.label'),
      description: t('superadmin.users.create.userType.condominium.description'),
      icon: <Building className="h-5 w-5" />,
    },
    {
      value: 'superadmin',
      label: t('superadmin.users.create.userType.superadmin.label'),
      description: t('superadmin.users.create.userType.superadmin.description'),
      icon: <Shield className="h-5 w-5" />,
    },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('superadmin.users.create.userType.title')}
        tooltip={t('superadmin.users.create.userType.tooltip')}
      />

      <Controller
        control={control}
        name="userType"
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            orientation="vertical"
            classNames={{
              wrapper: 'gap-4',
            }}
          >
            {userTypeOptions.map((option) => (
              <div
                key={option.value}
                className="relative flex items-start gap-3 rounded-lg border-2 border-default-200 p-4 transition-colors hover:border-primary/50 cursor-pointer"
                onClick={() => field.onChange(option.value)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    field.onChange(option.value)
                  }
                }}
              >
                <Radio value={option.value} />
                <div className="flex flex-1 items-start gap-3 pointer-events-none">
                  <div className="mt-0.5 text-default-500">{option.icon}</div>
                  <div className="flex-1">
                    <Typography variant="subtitle2" className="font-semibold">
                      {option.label}
                    </Typography>
                    <Typography color="muted" variant="body2" className="mt-1">
                      {option.description}
                    </Typography>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      />

      {errors.userType && (
        <Typography color="danger" variant="body2">
          {translateError(errors.userType.message as string)}
        </Typography>
      )}
    </div>
  )
}
