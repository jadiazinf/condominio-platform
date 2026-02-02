'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import { Tabs, Tab } from '@/ui/components/tabs'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Table, type ITableColumn } from '@/ui/components/table'
import { useToast } from '@/ui/components/toast'
import { toggleUserPermissionAction } from '../../actions'
import type { TSuperadminPermissionDetail } from '@packages/http-client/hooks'

interface IPermissionRow {
  id: string
  permissionId: string
  module: string
  action: string
  description: string | null
  isEnabled: boolean
}

interface PermissionsTableProps {
  userId: string
  currentUserId: string | undefined
  permissions: TSuperadminPermissionDetail[]
  translations: {
    title: string
    action: string
    description: string
    status: string
    cannotModifyOwn: string
    empty: string
    toggleSuccess: string
    toggleError: string
  }
  getModuleLabel: (module: string) => string
  getActionLabel: (action: string) => string
}

export function PermissionsTable({
  userId,
  currentUserId,
  permissions: rawPermissions,
  translations: t,
  getModuleLabel,
  getActionLabel,
}: PermissionsTableProps) {
  const [selectedModule, setSelectedModule] = useState<string>('')
  const [togglingPermissionId, setTogglingPermissionId] = useState<string | null>(null)
  const toast = useToast()

  // Check if viewing own profile (cannot modify own permissions)
  const isOwnProfile = currentUserId === userId

  const permissions: IPermissionRow[] = useMemo(() => {
    if (!rawPermissions) return []
    return rawPermissions.map(p => ({
      id: p.id,
      permissionId: p.permissionId,
      module: p.module,
      action: p.action,
      description: p.description,
      isEnabled: p.isEnabled,
    }))
  }, [rawPermissions])

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
      setTogglingPermissionId(permissionId)
      try {
        const result = await toggleUserPermissionAction(userId, permissionId, isEnabled)

        if (result.success) {
          toast.success(t.toggleSuccess)
        } else {
          toast.error(t.toggleError)
        }
      } catch {
        toast.error(t.toggleError)
      } finally {
        setTogglingPermissionId(null)
      }
    },
    [userId, t, toast]
  )

  const tableColumns: ITableColumn<IPermissionRow>[] = useMemo(
    () => [
      { key: 'action', label: t.action },
      { key: 'description', label: t.description },
      { key: 'status', label: t.status },
    ],
    [t]
  )

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

  return (
    <div className="space-y-6">
      {isOwnProfile && (
        <Card className="p-4 bg-warning-50 border border-warning-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0" />
            <Typography color="warning" variant="body2">
              {t.cannotModifyOwn}
            </Typography>
          </div>
        </Card>
      )}

      {permissions.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <Shield className="w-12 h-12 text-default-300 mb-4" />
          <Typography color="muted" variant="body1">
            {t.empty}
          </Typography>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Tabs
              aria-label={t.title}
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
                    aria-label={`${t.title} - ${getModuleLabel(module)}`}
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
