'use client'

import { Info } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { UserBasicInfoFields } from '@/ui/components/forms'

interface BasicInfoStepProps {
  translateError: (message: string | undefined) => string | undefined
}

export function BasicInfoStep({ translateError }: BasicInfoStepProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.users.create.basicInfo')}
        </Typography>
        <Tooltip
          content={t('superadmin.users.create.basicInfoDescription')}
          placement="right"
          showArrow
          classNames={{
            content: 'max-w-xs text-sm',
          }}
        >
          <Info className="h-4 w-4 text-default-400 cursor-help" />
        </Tooltip>
      </div>

      {/* Shared user fields */}
      <UserBasicInfoFields
        translateError={translateError}
        labels={{
          email: t('superadmin.users.create.fields.email'),
          emailPlaceholder: t('superadmin.users.create.fields.emailPlaceholder'),
          emailTooltip: t('superadmin.users.create.fields.emailDescription'),
          firstName: t('superadmin.users.create.fields.firstName'),
          firstNamePlaceholder: t('superadmin.users.create.fields.firstNamePlaceholder'),
          firstNameTooltip: t('superadmin.users.create.fields.firstNameDescription'),
          lastName: t('superadmin.users.create.fields.lastName'),
          lastNamePlaceholder: t('superadmin.users.create.fields.lastNamePlaceholder'),
          lastNameTooltip: t('superadmin.users.create.fields.lastNameDescription'),
          phone: t('superadmin.users.create.fields.phone'),
          phoneTooltip: t('superadmin.users.create.fields.phoneDescription'),
          idDocument: t('superadmin.users.create.fields.idDocument'),
          idDocumentTypePlaceholder: t('superadmin.users.create.fields.idDocumentTypePlaceholder'),
          idDocumentNumberPlaceholder: t('superadmin.users.create.fields.idDocumentNumberPlaceholder'),
          idDocumentTooltip: t('superadmin.users.create.fields.idDocumentDescription'),
        }}
        showDocumentFields={true}
      />
    </div>
  )
}
