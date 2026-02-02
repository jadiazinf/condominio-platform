'use client'

import { Info } from 'lucide-react'
import { Accordion, AccordionItem } from '@/ui/components/accordion'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { Skeleton } from '@/ui/components/skeleton'
import { Switch } from '@/ui/components/switch'

import { useTranslation } from '@/contexts'

interface IPermissionModule {
  module: string
  permissions: Array<{
    id: string
    action: string
    name: string
    description?: string
    granted: boolean
  }>
}

interface PermissionsStepProps {
  rolePermissions: IPermissionModule[]
  customPermissions: Record<string, boolean>
  onTogglePermission: (permissionId: string) => void
  isLoading: boolean
}

export function PermissionsStep({
  rolePermissions,
  customPermissions,
  onTogglePermission,
  isLoading,
}: PermissionsStepProps) {
  const { t } = useTranslation()

  // Helper to get module display name with translation
  const getModuleLabel = (module: string) => {
    const translationKey = `superadmin.users.create.permissionModules.${module.toLowerCase()}`
    const translated = t(translationKey)

    // If translation exists and is not the same as the key, use it
    if (translated && translated !== translationKey) {
      return translated
    }

    // Fallback to formatted module name
    return module
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper to get action display name with translation
  const getActionLabel = (action: string) => {
    const translationKey = `superadmin.users.create.permissionActions.${action.toLowerCase()}`
    const translated = t(translationKey)

    // If translation exists and is not the same as the key, use it
    if (translated && translated !== translationKey) {
      return translated
    }

    // Fallback to formatted action name
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-96 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!rolePermissions || rolePermissions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Typography variant="subtitle1" className="font-semibold">
            {t('superadmin.users.create.permissions')}
          </Typography>
          <Tooltip
            content={t('superadmin.users.create.permissionsDescription')}
            placement="right"
            showArrow
            classNames={{
              content: 'max-w-xs text-sm',
            }}
          >
            <Info className="h-4 w-4 text-default-400 cursor-help" />
          </Tooltip>
        </div>
        <Typography color="muted" variant="body2" className="text-center py-8">
          {t('superadmin.users.create.noPermissions')}
        </Typography>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.users.create.permissions')}
        </Typography>
        <Tooltip
          content={t('superadmin.users.create.permissionsDescription')}
          placement="right"
          showArrow
          classNames={{
            content: 'max-w-xs text-sm',
          }}
        >
          <Info className="h-4 w-4 text-default-400 cursor-help" />
        </Tooltip>
      </div>

      <Typography color="muted" variant="body2">
        {t('superadmin.users.create.permissionsHint')}
      </Typography>

      {/* Permissions by module */}
      <Accordion variant="splitted" defaultExpandedKeys={[rolePermissions[0]?.module]}>
        {rolePermissions.map((module) => (
          <AccordionItem
            key={module.module}
            aria-label={getModuleLabel(module.module)}
            title={getModuleLabel(module.module)}
          >
            <div className="space-y-3">
              {module.permissions.map((permission) => {
                const isGranted = customPermissions[permission.id] ?? permission.granted

                return (
                  <div
                    key={permission.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-default-200 p-4 hover:bg-default-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <Typography variant="subtitle2" className="font-medium">
                        {permission.name || getActionLabel(permission.action)}
                      </Typography>
                      {permission.description && (
                        <Typography color="muted" variant="body2" className="mt-1">
                          {permission.description}
                        </Typography>
                      )}
                      <Typography color="muted" variant="caption" className="mt-1 block">
                        {permission.action}
                      </Typography>
                    </div>
                    <Switch
                      isSelected={isGranted}
                      onValueChange={() => onTogglePermission(permission.id)}
                      color="primary"
                      className="shrink-0"
                    />
                  </div>
                )
              })}
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
