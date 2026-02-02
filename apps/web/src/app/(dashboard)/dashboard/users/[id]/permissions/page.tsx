'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import { Tabs, Tab } from '@heroui/tabs'
import { Switch } from '@heroui/switch'

import { useTranslation, useAuth, useUser } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Table, type ITableColumn } from '@/ui/components/table'
import { useToast } from '@/ui/components/toast'
import { toggleUserPermission } from '@packages/http-client/hooks'
import { useUserDetail } from '../context/UserDetailContext'

interface IPermissionRow {
  id: string
  permissionId: string
  module: string
  action: string
  description: string | null
  isEnabled: boolean
}

export default function UserPermissionsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const { user: firebaseUser } = useAuth()
  const currentUser = useUser()
  const { user, refetch } = useUserDetail()
  const [selectedModule, setSelectedModule] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [togglingPermissionId, setTogglingPermissionId] = useState<string | null>(null)

  // Check if viewing own profile (cannot modify own permissions)
  const isOwnProfile = currentUser?.user?.id === user.id

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Redirect non-superadmins - they shouldn't see this page
  useEffect(() => {
    if (!user.isSuperadmin) {
      router.replace(`/dashboard/users/${user.id}`)
    }
  }, [user.isSuperadmin, user.id, router])

  const permissions: IPermissionRow[] = useMemo(() => {
    if (!user.superadminPermissions) return []
    return user.superadminPermissions.map(p => ({
      id: p.id,
      permissionId: p.permissionId,
      module: p.module,
      action: p.action,
      description: p.description,
      isEnabled: p.isEnabled,
    }))
  }, [user.superadminPermissions])

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, IPermissionRow[]> = {}
    permissions.forEach(p => {
      if (!groups[p.module]) {
        groups[p.module] = []
      }
      groups[p.module].push(p)
    })
    return groups
  }, [permissions])

  // Get module names sorted
  const moduleNames = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions])

  // Set default selected module
  useEffect(() => {
    if (moduleNames.length > 0 && !selectedModule) {
      setSelectedModule(moduleNames[0])
    }
  }, [moduleNames, selectedModule])

  const handleTogglePermission = useCallback(
    async (permissionId: string, isEnabled: boolean) => {
      if (!token) return

      setTogglingPermissionId(permissionId)
      try {
        await toggleUserPermission(token, user.id, permissionId, isEnabled)
        toast.success(t('superadmin.users.detail.permissions.toggleSuccess'))
        refetch()
      } catch {
        toast.error(t('superadmin.users.detail.permissions.toggleError'))
      } finally {
        setTogglingPermissionId(null)
      }
    },
    [token, user.id, refetch, t, toast]
  )

  const tableColumns: ITableColumn<IPermissionRow>[] = useMemo(
    () => [
      { key: 'action', label: t('superadmin.users.detail.permissions.action') },
      { key: 'description', label: t('superadmin.users.detail.permissions.description') },
      { key: 'status', label: t('superadmin.users.detail.permissions.status') },
    ],
    [t]
  )

  // Helper to get translated module name
  const getModuleLabel = (module: string) => {
    const translationKey = `superadmin.users.detail.permissions.modules.${module}`
    const translated = t(translationKey)
    // If translation returns the key itself, format the module name
    if (translated === translationKey) {
      return module
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }
    return translated
  }

  // Helper to get translated action name
  const getActionLabel = (action: string) => {
    const translationKey = `superadmin.users.detail.permissions.actions.${action}`
    const translated = t(translationKey)
    return translated === translationKey ? action : translated
  }

  const renderCell = (row: IPermissionRow, columnKey: string | number | symbol) => {
    switch (String(columnKey)) {
      case 'action':
        return <span className="font-medium">{getActionLabel(row.action)}</span>
      case 'description':
        return <span className="text-default-600">{row.description || '-'}</span>
      case 'status':
        return (
          <Switch
            isSelected={row.isEnabled}
            isDisabled={isOwnProfile || togglingPermissionId === row.permissionId}
            onValueChange={(isEnabled: boolean) => handleTogglePermission(row.permissionId, isEnabled)}
            size="sm"
          />
        )
      default:
        return null
    }
  }

  if (!user.isSuperadmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.users.detail.permissions.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.users.detail.permissions.subtitle')}
        </Typography>
      </div>

      {isOwnProfile && (
        <Card className="p-4 bg-warning-50 border border-warning-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0" />
            <Typography color="warning" variant="body2">
              {t('superadmin.users.detail.permissions.cannotModifyOwn')}
            </Typography>
          </div>
        </Card>
      )}

      {permissions.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <Shield className="w-12 h-12 text-default-300 mb-4" />
          <Typography color="muted" variant="body1">
            {t('superadmin.users.detail.permissions.empty')}
          </Typography>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Tabs
              aria-label={t('superadmin.users.detail.permissions.title')}
              selectedKey={selectedModule}
              onSelectionChange={key => setSelectedModule(key as string)}
              variant="underlined"
              isVertical={false}
              classNames={{
                base: 'w-full',
                tabList: 'gap-4 w-full relative rounded-none p-0 border-b border-divider flex-nowrap overflow-x-auto',
                tab: 'max-w-fit px-4 h-10 whitespace-nowrap',
                cursor: 'bg-primary',
                panel: 'pt-4',
              }}
            >
              {moduleNames.map(module => (
                <Tab key={module} title={getModuleLabel(module)}>
                  <Table<IPermissionRow>
                    aria-label={`${t('superadmin.users.detail.permissions.title')} - ${getModuleLabel(module)}`}
                    columns={tableColumns}
                    rows={groupedPermissions[module] || []}
                    renderCell={renderCell}
                  />
                </Tab>
              ))}
            </Tabs>
          </div>
        </Card>
      )}
    </div>
  )
}
