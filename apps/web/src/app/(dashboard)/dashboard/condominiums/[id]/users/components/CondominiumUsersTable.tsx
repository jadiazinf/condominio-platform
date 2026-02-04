'use client'

import { useState, useCallback, useMemo } from 'react'
import { Users, Trash2, Home, Shield } from 'lucide-react'
import type { TCondominiumUser } from '@packages/http-client/hooks'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useDisclosure } from '@/ui/components/modal'

import { RemoveUserModal } from './RemoveUserModal'
import { Avatar } from '@/ui/components/avatar-base'

type TUserRow = TCondominiumUser & { id: string }

interface ICondominiumUsersTableProps {
  users: TCondominiumUser[]
  condominiumId: string
  translations: {
    addUser: string
    noUsers: string
    table: {
      user: string
      roles: string
      units: string
      status: string
      actions: string
    }
    status: {
      active: string
      inactive: string
    }
    removeModal: {
      title: string
      confirm: string
      warning: string
      cancel: string
      remove: string
      removing: string
      success: string
      error: string
    }
  }
}

export function CondominiumUsersTable({
  users,
  condominiumId,
  translations,
}: ICondominiumUsersTableProps) {
  const [userToRemove, setUserToRemove] = useState<TCondominiumUser | null>(null)

  const {
    isOpen: isRemoveModalOpen,
    onOpen: onRemoveModalOpen,
    onClose: onRemoveModalClose,
  } = useDisclosure()

  const handleRemove = useCallback(
    (user: TCondominiumUser) => {
      setUserToRemove(user)
      onRemoveModalOpen()
    },
    [onRemoveModalOpen]
  )

  const columns: ITableColumn<TUserRow>[] = useMemo(
    () => [
      { key: 'user', label: translations.table.user },
      { key: 'roles', label: translations.table.roles },
      { key: 'units', label: translations.table.units },
      { key: 'status', label: translations.table.status },
      { key: 'actions', label: translations.table.actions, align: 'end' },
    ],
    [translations.table]
  )

  const renderCell = useCallback(
    (user: TCondominiumUser, columnKey: string) => {
      const isActive = user.isActive && user.roles.some(r => r.isActive)

      switch (columnKey) {
        case 'user':
          return (
            <div className="flex items-center gap-3">
              <Avatar
                src={user.photoUrl ?? undefined}
                name={`${user.firstName} ${user.lastName}`}
                size="sm"
              />
              <div>
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-default-500">{user.email}</p>
              </div>
            </div>
          )
        case 'roles':
          return (
            <div className="flex flex-wrap gap-1">
              {user.roles.length > 0 ? (
                user.roles.map(role => (
                  <Chip
                    key={role.id}
                    size="sm"
                    variant="flat"
                    color={role.isActive ? 'primary' : 'default'}
                    startContent={<Shield size={12} />}
                  >
                    {role.roleName}
                  </Chip>
                ))
              ) : (
                <span className="text-default-400">-</span>
              )}
            </div>
          )
        case 'units':
          return (
            <div className="flex flex-wrap gap-1">
              {user.units.length > 0 ? (
                user.units.map(unit => (
                  <Chip
                    key={unit.id}
                    size="sm"
                    variant="flat"
                    color={unit.isActive ? 'secondary' : 'default'}
                    startContent={<Home size={12} />}
                  >
                    {unit.buildingName} - {unit.unitNumber}
                  </Chip>
                ))
              ) : (
                <span className="text-default-400">-</span>
              )}
            </div>
          )
        case 'status':
          return (
            <Chip color={isActive ? 'success' : 'default'} variant="flat" size="sm">
              {isActive ? translations.status.active : translations.status.inactive}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => handleRemove(user)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        default:
          return null
      }
    },
    [translations.status, handleRemove]
  )

  // Empty state
  if (users.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Users className="mb-4 text-default-300" size={48} />
          <Typography variant="h4" className="mb-2">
            {translations.noUsers}
          </Typography>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table<TUserRow>
          aria-label="Condominium Users"
          columns={columns}
          rows={users}
          renderCell={renderCell}
          classNames={{
            wrapper: 'shadow-sm',
            tr: 'hover:bg-default-50',
          }}
        />
      </div>

      {/* Mobile Cards */}
      <div className="block space-y-3 md:hidden">
        {users.map(user => {
          const isActive = user.isActive && user.roles.some(r => r.isActive)
          return (
            <Card key={user.id} className="w-full">
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar
                      src={user.photoUrl ?? undefined}
                      name={`${user.firstName} ${user.lastName}`}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-default-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Chip color={isActive ? 'success' : 'default'} variant="flat" size="sm">
                    {isActive ? translations.status.active : translations.status.inactive}
                  </Chip>
                </div>

                {/* Roles */}
                {user.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {user.roles.map(role => (
                      <Chip
                        key={role.id}
                        size="sm"
                        variant="flat"
                        color={role.isActive ? 'primary' : 'default'}
                        startContent={<Shield size={12} />}
                      >
                        {role.roleName}
                      </Chip>
                    ))}
                  </div>
                )}

                {/* Units */}
                {user.units.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {user.units.map(unit => (
                      <Chip
                        key={unit.id}
                        size="sm"
                        variant="flat"
                        color={unit.isActive ? 'secondary' : 'default'}
                        startContent={<Home size={12} />}
                      >
                        {unit.buildingName} - {unit.unitNumber}
                      </Chip>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end border-t pt-3">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleRemove(user)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* Remove User Modal */}
      {userToRemove && (
        <RemoveUserModal
          isOpen={isRemoveModalOpen}
          onClose={() => {
            onRemoveModalClose()
            setUserToRemove(null)
          }}
          condominiumId={condominiumId}
          userId={userToRemove.id}
          userName={`${userToRemove.firstName} ${userToRemove.lastName}`}
          translations={translations.removeModal}
        />
      )}
    </div>
  )
}
