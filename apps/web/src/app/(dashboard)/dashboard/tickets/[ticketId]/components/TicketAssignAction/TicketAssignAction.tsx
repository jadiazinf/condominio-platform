'use client'

import type { TUser } from '@packages/domain'

import { useState, useMemo } from 'react'
import { UserPlus, Search, Check } from 'lucide-react'

import { Button } from '@/ui/components/button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Pagination } from '@/ui/components/pagination'
import { Input } from '@/ui/components/input'

export interface ITicketAssignActionTranslations {
  assignUser: string
  reassignUser: string
  noUsersAvailable: string
  searchPlaceholder: string
  tableColumns: {
    name: string
    email: string
    document: string
    actions: string
  }
  select: string
  selected: string
  selectedUser: string
  cancel: string
  confirm: string
}

interface ITicketAssignActionProps {
  currentAssignedUser?: TUser
  availableUsers: TUser[]
  translations: ITicketAssignActionTranslations
  onAssign: (userId: string) => void
  isLoading?: boolean
  iconOnly?: boolean
}

const ITEMS_PER_PAGE = 5

export function TicketAssignAction({
  currentAssignedUser,
  availableUsers,
  translations,
  onAssign,
  isLoading = false,
  iconOnly = false,
}: ITicketAssignActionProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    currentAssignedUser?.id || null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const label = currentAssignedUser ? translations.reassignUser : translations.assignUser

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers

    const query = searchQuery.toLowerCase().trim()

    return availableUsers.filter(user => {
      const firstName = user.firstName?.toLowerCase() || ''
      const lastName = user.lastName?.toLowerCase() || ''
      const email = user.email?.toLowerCase() || ''
      const document = user.idDocumentNumber?.toLowerCase() || ''
      const displayName = user.displayName?.toLowerCase() || ''

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query) ||
        document.includes(query) ||
        displayName.includes(query)
      )
    })
  }, [availableUsers, searchQuery])

  // Paginate filtered users
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE

    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredUsers, page])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)

  const handleConfirm = () => {
    if (selectedUserId && selectedUserId !== currentAssignedUser?.id) {
      onAssign(selectedUserId)
    }
    onClose()
  }

  const handleOpen = () => {
    setSelectedUserId(currentAssignedUser?.id || null)
    setSearchQuery('')
    setPage(1)
    onOpen()
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1) // Reset to first page when searching
  }

  // Table columns definition
  const columns: ITableColumn<TUser>[] = [
    { key: 'name', label: translations.tableColumns.name },
    { key: 'email', label: translations.tableColumns.email },
    { key: 'document', label: translations.tableColumns.document },
    { key: 'actions', label: translations.tableColumns.actions, align: 'center' },
  ]

  // Render cell content
  const renderCell = (user: TUser, columnKey: keyof TUser | string) => {
    const isCurrentlyAssigned = user.id === currentAssignedUser?.id
    const isSelected = user.id === selectedUserId

    switch (columnKey) {
      case 'name':
        return (
          <div>
            <p className="font-medium">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.displayName || user.email}
            </p>
            {user.firstName && user.lastName && user.displayName && (
              <p className="text-xs text-default-500">{user.displayName}</p>
            )}
          </div>
        )
      case 'email':
        return <span className="text-sm">{user.email}</span>
      case 'document':
        return <span className="text-sm text-default-500">{user.idDocumentNumber || '-'}</span>
      case 'actions':
        return (
          <Button
            color={isSelected ? 'success' : 'primary'}
            isDisabled={isCurrentlyAssigned}
            size="sm"
            variant={isSelected ? 'flat' : 'light'}
            onPress={() => setSelectedUserId(user.id)}
          >
            {isSelected ? (
              <>
                <Check size={14} />
                {translations.selected}
              </>
            ) : (
              translations.select
            )}
          </Button>
        )
      default:
        return null
    }
  }

  if (availableUsers.length === 0) {
    if (iconOnly) {
      return null
    }

    return (
      <Button isDisabled color="default" size="sm" variant="flat">
        {translations.noUsersAvailable}
      </Button>
    )
  }

  return (
    <>
      <Button
        aria-label={label}
        color="primary"
        isDisabled={isLoading}
        isIconOnly={iconOnly}
        size="sm"
        variant="light"
        onPress={handleOpen}
      >
        <UserPlus size={18} />
      </Button>

      <Modal isOpen={isOpen} size="3xl" onOpenChange={onOpenChange}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>{label}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {/* Search input */}
                  <Input
                    isClearable
                    placeholder={translations.searchPlaceholder}
                    startContent={<Search className="text-default-400" size={16} />}
                    type="search"
                    value={searchQuery}
                    onClear={() => handleSearchChange('')}
                    onValueChange={handleSearchChange}
                  />

                  {/* Users table */}
                  <Table
                    isCompact
                    removeWrapper
                    aria-label={label}
                    color="success"
                    columns={columns}
                    emptyContent={translations.noUsersAvailable}
                    renderCell={renderCell}
                    rows={paginatedUsers}
                    selectedKeys={selectedUserId ? new Set([selectedUserId]) : new Set()}
                    selectionMode="single"
                  />

                  {/* Pagination */}
                  {filteredUsers.length > ITEMS_PER_PAGE && (
                    <Pagination
                      limit={ITEMS_PER_PAGE}
                      page={page}
                      showLimitSelector={false}
                      total={filteredUsers.length}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  {translations.cancel}
                </Button>
                <Button
                  color="primary"
                  isDisabled={
                    !selectedUserId || selectedUserId === currentAssignedUser?.id || isLoading
                  }
                  isLoading={isLoading}
                  onPress={handleConfirm}
                >
                  {translations.confirm}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
