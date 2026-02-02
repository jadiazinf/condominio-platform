'use client'

import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'

interface IPermissionModule {
  module: string
  permissions: Array<{
    action: string
    granted: boolean
  }>
}

interface PermissionModuleTabProps {
  module: IPermissionModule
  customPermissions: Record<string, boolean>
  onTogglePermission: (permissionKey: string) => void
}

export function PermissionModuleTab({
  module,
  customPermissions,
  onTogglePermission,
}: PermissionModuleTabProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 pt-4">
      {module.permissions.map((permission) => {
        const permissionKey = `${module.module}:${permission.action}`
        const isCustomized = permissionKey in customPermissions
        const isGranted = isCustomized
          ? customPermissions[permissionKey]
          : permission.granted

        return (
          <div
            key={permissionKey}
            className="flex items-center justify-between rounded-lg border border-default-200 p-4 hover:bg-default-50"
          >
            <div className="flex-1">
              <Typography variant="subtitle2" className="font-medium">
                {t(`superadmin.permissions.actions.${permission.action}`)}
              </Typography>
              <Typography color="muted" variant="caption">
                {permissionKey}
                {isCustomized && (
                  <span className="ml-2 text-warning">(Customized)</span>
                )}
              </Typography>
            </div>
            <Switch
              isSelected={isGranted}
              onValueChange={() => onTogglePermission(permissionKey)}
              color="primary"
            />
          </div>
        )
      })}
    </div>
  )
}
