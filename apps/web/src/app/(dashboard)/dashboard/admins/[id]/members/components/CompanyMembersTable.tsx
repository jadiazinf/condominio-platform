'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { User, Plus, Crown } from 'lucide-react'
import { Avatar } from '@/ui/components/avatar-base'

import { useManagementCompanyMembers } from '@packages/http-client'
import { useAuth } from '@/contexts'
import { AddMemberModal } from './AddMemberModal'

interface TMemberRow {
  id: string
  roleName: string
  isActive: boolean
  isPrimaryAdmin: boolean
  joinedAt: Date | string
  user?: {
    displayName?: string
    email?: string
  }
}

interface CompanyMembersTableProps {
  companyId: string
}

export function CompanyMembersTable({ companyId }: CompanyMembersTableProps) {
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading, refetch } = useManagementCompanyMembers(companyId, {
    enabled: !!token && !!companyId,
  })

  const members = (data?.data || []) as TMemberRow[]

  const handleAddMemberSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  // Table columns
  const tableColumns: ITableColumn<TMemberRow>[] = useMemo(
    () => [
      { key: 'member', label: 'MIEMBRO' },
      { key: 'roleName', label: 'ROL' },
      { key: 'joinedAt', label: 'FECHA DE INGRESO' },
      { key: 'status', label: 'ESTADO' },
    ],
    []
  )

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'primary'
      case 'accountant':
        return 'secondary'
      case 'support':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      accountant: 'Contador',
      support: 'Soporte',
      viewer: 'Visualizador',
    }
    return labels[role.toLowerCase()] || role
  }

  const renderCell = useCallback((member: TMemberRow, columnKey: keyof TMemberRow | string) => {
    switch (columnKey) {
      case 'member':
        return (
          <div className="flex items-center gap-3">
            <Avatar name={member.user?.displayName || 'Usuario'} />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{member.user?.displayName || 'Sin nombre'}</p>
                {member.isPrimaryAdmin && <Crown className="text-warning" size={14} />}
              </div>
              <p className="text-xs text-default-500">{member.user?.email || 'Sin email'}</p>
            </div>
          </div>
        )
      case 'roleName':
        return (
          <Chip color={getRoleColor(member.roleName)} variant="flat">
            {getRoleLabel(member.roleName)}
          </Chip>
        )
      case 'joinedAt':
        return <p className="text-sm text-default-600">{formatDate(member.joinedAt)}</p>
      case 'status':
        return (
          <Chip color={member.isActive ? 'success' : 'default'} variant="dot">
            {member.isActive ? 'Activo' : 'Inactivo'}
          </Chip>
        )
      default:
        return null
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <User className="mb-4 text-default-400" size={48} />
          <h3 className="text-lg font-semibold text-default-700">No hay miembros</h3>
          <p className="mt-1 text-sm text-default-500">
            Esta administradora aún no tiene miembros registrados
          </p>
          <Button
            className="mt-4"
            color="primary"
            startContent={<Plus size={16} />}
            onPress={() => setIsAddModalOpen(true)}
          >
            Agregar Miembro
          </Button>
        </div>

        <AddMemberModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          companyId={companyId}
          onSuccess={handleAddMemberSuccess}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            color="primary"
            startContent={<Plus size={16} />}
            onPress={() => setIsAddModalOpen(true)}
          >
            Agregar Miembro
          </Button>
        </div>

        <Table<TMemberRow>
          aria-label="Tabla de miembros"
          columns={tableColumns}
          rows={members}
          renderCell={renderCell}
        />
      </div>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        companyId={companyId}
        onSuccess={handleAddMemberSuccess}
      />
    </>
  )
}
