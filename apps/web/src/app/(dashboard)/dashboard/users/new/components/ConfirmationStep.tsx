'use client'

import { Tabs, Tab } from '@/ui/components/tabs'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { TUserType } from '../hooks/useCreateUserForm'

interface ICondominium {
  id: string
  name: string
  code: string | null
  address: string | null
}

interface IRole {
  id: string
  name: string
  description?: string | null
}

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

interface ConfirmationStepProps {
  basicInfo: {
    email: string
    firstName: string
    lastName: string
    phoneCountryCode: string
    phoneNumber: string
    idDocumentType: string
    idDocumentNumber: string
  }
  userType: TUserType
  condominium?: ICondominium
  role?: IRole
  permissions?: IPermissionModule[]
}

export function ConfirmationStep({
  basicInfo,
  userType,
  condominium,
  role,
  permissions,
}: ConfirmationStepProps) {
  const { t } = useTranslation()

  // Helper to get module display name with translation
  const getModuleLabel = (module: string) => {
    const translationKey = `superadmin.users.create.permissionModules.${module.toLowerCase()}`
    const translated = t(translationKey)

    if (translated && translated !== translationKey) {
      return translated
    }

    return module
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper to get action display name with translation
  const getActionLabel = (action: string) => {
    const translationKey = `superadmin.users.create.permissionActions.${action.toLowerCase()}`
    const translated = t(translationKey)

    if (translated && translated !== translationKey) {
      return translated
    }

    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Count enabled permissions
  const enabledPermissionsCount = permissions?.reduce(
    (count, module) =>
      count + module.permissions.filter(p => p.granted).length,
    0
  ) ?? 0

  const totalPermissionsCount = permissions?.reduce(
    (count, module) => count + module.permissions.length,
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.companies.form.confirmation.title')}
        </Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.companies.form.confirmation.description')}
        </Typography>
      </div>

      {/* Tabs */}
      <Tabs aria-label="Confirmation tabs" variant="underlined" color="primary">
        {/* Basic Information Tab */}
        <Tab key="basic" title={t('superadmin.users.create.steps.basic')}>
          <div className="space-y-4 pt-4">
            <InfoRow
              label={t('superadmin.users.create.fields.email')}
              value={basicInfo.email}
            />
            <InfoRow
              label={t('superadmin.users.create.fields.firstName')}
              value={basicInfo.firstName}
            />
            <InfoRow
              label={t('superadmin.users.create.fields.lastName')}
              value={basicInfo.lastName}
            />
            <InfoRow
              label={t('superadmin.users.create.fields.phone')}
              value={`${basicInfo.phoneCountryCode} ${basicInfo.phoneNumber}`}
            />
            <InfoRow
              label={t('superadmin.users.create.fields.idDocument')}
              value={`${t(`superadmin.users.create.idDocumentTypes.${basicInfo.idDocumentType}`)} ${basicInfo.idDocumentNumber}`}
            />
          </div>
        </Tab>

        {/* User Type Tab */}
        <Tab key="userType" title={t('superadmin.users.create.steps.userType')}>
          <div className="space-y-4 pt-4">
            <InfoRow
              label={t('superadmin.users.create.userType.title')}
              value={
                <Chip color="primary" variant="flat">
                  {t(`superadmin.users.create.userType.${userType}.label`)}
                </Chip>
              }
            />
            <div className="rounded-lg bg-default-100 p-4">
              <Typography color="muted" variant="body2">
                {t(`superadmin.users.create.userType.${userType}.description`)}
              </Typography>
            </div>
          </div>
        </Tab>

        {/* Condominium Tab (only for condominium users) */}
        {userType === 'condominium' && condominium && (
          <Tab key="condominium" title={t('superadmin.users.create.steps.condominium')}>
            <div className="space-y-4 pt-4">
              <InfoRow
                label={t('superadmin.users.create.condominium.table.name')}
                value={condominium.name}
              />
              {condominium.code && (
                <InfoRow
                  label={t('superadmin.users.create.condominium.table.code')}
                  value={condominium.code}
                />
              )}
              {condominium.address && (
                <InfoRow
                  label={t('superadmin.users.create.condominium.table.address')}
                  value={condominium.address}
                />
              )}
            </div>
          </Tab>
        )}

        {/* Role Tab (only for condominium users) */}
        {userType === 'condominium' && role && (
          <Tab key="role" title={t('superadmin.users.create.steps.role')}>
            <div className="space-y-4 pt-4">
              <InfoRow
                label={t('superadmin.users.create.fields.role')}
                value={
                  <Chip color="secondary" variant="flat">
                    {role.name}
                  </Chip>
                }
              />
              {role.description && (
                <div className="rounded-lg bg-default-100 p-4">
                  <Typography color="muted" variant="body2">
                    {role.description}
                  </Typography>
                </div>
              )}
            </div>
          </Tab>
        )}

        {/* Permissions Tab (for condominium and superadmin users) */}
        {(userType === 'condominium' || userType === 'superadmin') && permissions && (
          <Tab key="permissions" title={t('superadmin.users.create.steps.permissions')}>
            <div className="space-y-4 pt-4">
              {/* Permission Summary */}
              <div className="rounded-lg border border-default-200 p-4">
                <div className="flex items-center justify-between">
                  <Typography variant="subtitle2" className="font-medium">
                    {t('superadmin.users.create.permissions')}
                  </Typography>
                  <Chip color={enabledPermissionsCount > 0 ? 'success' : 'default'} size="sm">
                    {enabledPermissionsCount} / {totalPermissionsCount}
                  </Chip>
                </div>
              </div>

              {/* Permissions by Module */}
              <div className="space-y-3">
                {permissions.map((module) => {
                  const enabledInModule = module.permissions.filter(p => p.granted).length

                  return (
                    <div
                      key={module.module}
                      className="rounded-lg border border-default-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Typography variant="subtitle2" className="font-medium">
                          {getModuleLabel(module.module)}
                        </Typography>
                        <Chip size="sm" variant="flat">
                          {enabledInModule} / {module.permissions.length}
                        </Chip>
                      </div>

                      <div className="space-y-2">
                        {module.permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            {permission.granted ? (
                              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-default-300 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <Typography
                                variant="body2"
                                className={permission.granted ? '' : 'text-default-400'}
                              >
                                {permission.name || getActionLabel(permission.action)}
                              </Typography>
                              {permission.description && (
                                <Typography
                                  color="muted"
                                  variant="caption"
                                  className="mt-0.5"
                                >
                                  {permission.description}
                                </Typography>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Tab>
        )}
      </Tabs>

      {/* Warning about invitation */}
      <div className="rounded-lg bg-warning-50 border border-warning-200 p-4">
        <Typography variant="body2" className="text-warning-800">
          {t('superadmin.companies.form.confirmation.warning')}
        </Typography>
      </div>
    </div>
  )
}

// Helper component for displaying information rows
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Typography color="muted" variant="caption" className="uppercase tracking-wide">
        {label}
      </Typography>
      {typeof value === 'string' ? (
        <Typography variant="body1">{value}</Typography>
      ) : (
        value
      )}
    </div>
  )
}
