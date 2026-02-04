'use client'

import { useState, useEffect, useMemo } from 'react'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { Button } from '@/ui/components/button'
import { Avatar } from '@/ui/components/avatar-base'
import { useAuth } from '@/contexts'
import { useUsersPaginated, useAddMember } from '@packages/http-client/hooks'
import { useToast } from '@/ui/components/toast'

interface ExistingUserSearchProps {
  companyId: string
  onSuccess: () => void
  onClose: () => void
}

const ADMIN_PERMISSIONS = {
  can_change_subscription: true,
  can_manage_members: true,
  can_create_tickets: true,
  can_view_invoices: true,
}

export function ExistingUserSearch({ companyId, onSuccess, onClose }: ExistingUserSearchProps) {
  const { user: firebaseUser } = useAuth()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading } = useUsersPaginated({
    token,
    query: { search, limit: 10, isActive: true },
    enabled: !!token && search.length >= 2,
  })

  const users = data?.data || []

  // Transform users to autocomplete items
  const autocompleteItems: IAutocompleteItem[] = useMemo(() => {
    return users.map((user) => ({
      key: user.id,
      label: user.displayName || user.email,
      description: user.email,
      startContent: (
        <Avatar name={user.displayName || user.email} size="sm" />
      ),
    }))
  }, [users])

  const { mutateAsync: addMember, isPending } = useAddMember(companyId, {
    onSuccess: () => {
      toast.success('Miembro agregado exitosamente')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.message || 'Error al agregar miembro')
    },
  })

  const handleSubmit = async () => {
    if (!selectedUserId) return

    await addMember({
      userId: selectedUserId,
      roleName: 'admin',
      permissions: ADMIN_PERMISSIONS,
      isPrimaryAdmin: false,
    })
  }

  return (
    <div className="space-y-4 pt-4">
      <Autocomplete
        label="Buscar usuario"
        placeholder="Escribe el nombre o email (mínimo 2 caracteres)..."
        isLoading={isLoading}
        items={autocompleteItems}
        onInputChange={setSearch}
        onSelectionChange={(key) => setSelectedUserId(key as string | null)}
        emptyContent={search.length < 2 ? 'Escribe al menos 2 caracteres para buscar' : 'No se encontraron usuarios'}
      />

      <p className="text-sm text-default-500">
        El usuario será agregado con rol <span className="font-medium text-primary">Administrador</span> y todos los permisos de admin.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="flat" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          color="primary"
          isDisabled={!selectedUserId}
          isLoading={isPending}
          onPress={handleSubmit}
        >
          Agregar como Admin
        </Button>
      </div>
    </div>
  )
}
