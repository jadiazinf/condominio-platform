'use client'

import { useState, useEffect, useMemo } from 'react'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { Button } from '@/ui/components/button'
import { Avatar } from '@/ui/components/avatar-base'
import { useAuth, useTranslation } from '@/contexts'
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
  const { t } = useTranslation()
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
      toast.success(t('superadmin.companies.detail.members.success.added'))
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.message || t('superadmin.companies.detail.members.error.add'))
    },
  })

  const handleSubmit = async () => {
    if (!selectedUserId) return

    await addMember({
      userId: selectedUserId,
      role: 'admin',
      permissions: ADMIN_PERMISSIONS,
      isPrimary: false,
    })
  }

  return (
    <div className="space-y-4 pt-4">
      <Autocomplete
        label={t('superadmin.companies.detail.members.modal.searchLabel')}
        placeholder={t('superadmin.companies.detail.members.modal.searchPlaceholder')}
        isLoading={isLoading}
        items={autocompleteItems}
        onInputChange={setSearch}
        onSelectionChange={(key) => setSelectedUserId(key as string | null)}
        emptyContent={search.length < 2 ? t('superadmin.companies.detail.members.modal.searchMinChars') : t('superadmin.companies.detail.members.modal.noResults')}
      />

      <p className="text-sm text-default-500">
        {t('superadmin.companies.detail.members.modal.adminNote')}
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="flat" onPress={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          color="primary"
          isDisabled={!selectedUserId}
          isLoading={isPending}
          onPress={handleSubmit}
        >
          {t('superadmin.companies.detail.members.modal.addAsAdmin')}
        </Button>
      </div>
    </div>
  )
}
