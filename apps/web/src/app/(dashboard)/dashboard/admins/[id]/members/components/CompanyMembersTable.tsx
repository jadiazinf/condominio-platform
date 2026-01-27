'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from '@heroui/table'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { User, Plus, Crown } from 'lucide-react'
import { Avatar } from '@heroui/avatar'

import { useManagementCompanyMembers } from '@packages/http-client'
import { useAuth } from '@/contexts'

interface CompanyMembersTableProps {
  companyId: string
}

export function CompanyMembersTable({ companyId }: CompanyMembersTableProps) {
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading } = useManagementCompanyMembers(companyId, {
    enabled: !!token && !!companyId,
  })

  const members = data?.data || []

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <User className="mb-4 text-default-400" size={48} />
        <h3 className="text-lg font-semibold text-default-700">No hay miembros</h3>
        <p className="mt-1 text-sm text-default-500">
          Esta administradora aún no tiene miembros registrados
        </p>
        <Button
          className="mt-4"
          color="primary"
          size="sm"
          startContent={<Plus size={16} />}
        >
          Agregar Miembro
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          color="primary"
          size="sm"
          startContent={<Plus size={16} />}
        >
          Agregar Miembro
        </Button>
      </div>

      <Table aria-label="Tabla de miembros">
        <TableHeader>
          <TableColumn>MIEMBRO</TableColumn>
          <TableColumn>ROL</TableColumn>
          <TableColumn>FECHA DE INGRESO</TableColumn>
          <TableColumn>ESTADO</TableColumn>
        </TableHeader>
        <TableBody>
          {members.map(member => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={member.user?.displayName || 'Usuario'}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {member.user?.displayName || 'Sin nombre'}
                      </p>
                      {member.isPrimaryAdmin && (
                        <Crown className="text-warning" size={14} />
                      )}
                    </div>
                    <p className="text-xs text-default-500">
                      {member.user?.email || 'Sin email'}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Chip
                  color={getRoleColor(member.roleName)}
                  size="sm"
                  variant="flat"
                >
                  {getRoleLabel(member.roleName)}
                </Chip>
              </TableCell>
              <TableCell>
                <p className="text-sm text-default-600">
                  {formatDate(member.joinedAt)}
                </p>
              </TableCell>
              <TableCell>
                <Chip
                  color={member.isActive ? 'success' : 'default'}
                  size="sm"
                  variant="dot"
                >
                  {member.isActive ? 'Activo' : 'Inactivo'}
                </Chip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
