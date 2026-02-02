'use client'

import { Info } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { SelectField } from '@/ui/components/select'
import { SelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { Spinner } from '@/ui/components/spinner'

interface IRoleOption {
  id: string
  name: string
  isSystemRole: boolean
}

interface RoleAssignmentStepProps {
  roles: IRoleOption[]
  isLoadingRoles: boolean
  translateError: (message: string | undefined) => string | undefined
}

export function RoleAssignmentStep({
  roles,
  isLoadingRoles,
  translateError,
}: RoleAssignmentStepProps) {
  const { t } = useTranslation()

  // Helper to get role display name with translation fallback
  const getRoleLabel = (roleName: string) => {
    const translationKey = `superadmin.users.roles.${roleName}`
    const translated = t(translationKey)
    // If translation returns the key itself, use the original role name
    return translated === translationKey ? roleName : translated
  }

  if (isLoadingRoles) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.users.create.roleAssignmentTitle')}
        </Typography>
        <Tooltip
          content={t('superadmin.users.create.roleAssignmentDescription')}
          placement="right"
          showArrow
          classNames={{
            content: 'max-w-xs text-sm',
          }}
        >
          <Info className="h-4 w-4 text-default-400 cursor-help" />
        </Tooltip>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-10">
        <SelectField
          name="roleId"
          label={t('superadmin.users.create.fields.role')}
          placeholder={t('superadmin.users.create.fields.rolePlaceholder')}
          tooltip={t('superadmin.users.create.fields.roleDescription')}
          isRequired
          translateError={translateError}
        >
          {roles.map(role => (
            <SelectItem key={role.id}>{getRoleLabel(role.name)}</SelectItem>
          ))}
        </SelectField>

        {roles.length === 0 && !isLoadingRoles && (
          <Typography color="muted" variant="body2">
            {t('superadmin.users.create.roleAssignment.noRoles')}
          </Typography>
        )}
      </div>
    </div>
  )
}
