'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Divider } from '@/ui/components/divider'
import { Tooltip } from '@/ui/components/tooltip'
import { useToast } from '@/ui/components/toast'
import { ChevronRight, Plus, SendHorizonal, User, Mail, Phone, FileText, Tag, Calendar, CircleCheck, Home } from 'lucide-react'
import { AllQuotasModal } from './AllQuotasModal'
import { AllPaymentsModal } from './AllPaymentsModal'
import { AddOwnershipModal, type AddOwnershipModalTranslations } from './AddOwnershipModal'
import { useResendOwnerInvitation } from '@packages/http-client/hooks'
import type { TUnitOwnership } from '@packages/domain'
import { formatFullDate } from '@packages/utils/dates'

interface ModalTranslations {
  filters: {
    dateFrom: string
    dateTo: string
    status: string
    allStatuses: string
    clear: string
  }
}

interface ViewAllQuotasButtonProps {
  unitId: string
  label: string
  translations: ModalTranslations & {
    title: string
    table: {
      concept: string
      period: string
      amount: string
      paid: string
      balance: string
      status: string
    }
    statuses: Record<string, string>
    noResults: string
  }
}

export function ViewAllQuotasButton({ unitId, label, translations }: ViewAllQuotasButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        size="sm"
        variant="light"
        color="primary"
        onPress={onOpen}
        endContent={<ChevronRight size={14} />}
      >
        {label}
      </Button>
      <AllQuotasModal
        isOpen={isOpen}
        onClose={onClose}
        unitId={unitId}
        translations={translations}
      />
    </>
  )
}

interface ViewAllPaymentsButtonProps {
  unitId: string
  label: string
  translations: ModalTranslations & {
    title: string
    table: {
      number: string
      date: string
      amount: string
      method: string
      status: string
    }
    statuses: Record<string, string>
    methods: Record<string, string>
    noResults: string
  }
}

export function ViewAllPaymentsButton({ unitId, label, translations }: ViewAllPaymentsButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        size="sm"
        variant="light"
        color="primary"
        onPress={onOpen}
        endContent={<ChevronRight size={14} />}
      >
        {label}
      </Button>
      <AllPaymentsModal
        isOpen={isOpen}
        onClose={onClose}
        unitId={unitId}
        translations={translations}
      />
    </>
  )
}

interface AddOwnershipButtonProps {
  unitId: string
  label: string
  translations: AddOwnershipModalTranslations
}

export function AddOwnershipButton({ unitId, label, translations }: AddOwnershipButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        size="sm"
        color="primary"
        onPress={onOpen}
        startContent={<Plus size={14} />}
      >
        {label}
      </Button>
      <AddOwnershipModal
        isOpen={isOpen}
        onClose={onClose}
        unitId={unitId}
        translations={translations}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Owners Table (client component to avoid passing renderCell from server)
// ─────────────────────────────────────────────────────────────────────────────

export interface OwnersTableTranslations {
  columns: {
    name: string
    type: string
    startDate: string
    status: string
    verified: string
  }
  ownershipTypes: Record<string, string>
  yes: string
  no: string
  active: string
  inactive: string
  noOwners: string
  ariaLabel: string
  resendInvitation: string
  resendSuccess: string
  resendError: string
  detail: {
    title: string
    fullName: string
    email: string
    phone: string
    document: string
    ownershipType: string
    startDate: string
    status: string
    primaryResidence: string
    close: string
    noData: string
  }
}

interface OwnersTableProps {
  ownerships: TUnitOwnership[]
  translations: OwnersTableTranslations
}

type TOwnerRow = TUnitOwnership & { id: string }

export function OwnersTable({ ownerships, translations: t }: OwnersTableProps) {
  const toast = useToast()
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedOwner, setSelectedOwner] = useState<TUnitOwnership | null>(null)

  const resendMutation = useResendOwnerInvitation({
    onSuccess: () => {
      toast.success(t.resendSuccess)
      router.refresh()
    },
    onError: () => {
      toast.error(t.resendError)
    },
  })

  const columns: ITableColumn<TOwnerRow>[] = [
    { key: 'name', label: t.columns.name },
    { key: 'type', label: t.columns.type },
    { key: 'startDate', label: t.columns.startDate },
    { key: 'status', label: t.columns.status },
    { key: 'verified', label: t.columns.verified },
  ]

  const getOwnerName = (ownership: TUnitOwnership) =>
    ownership.fullName
    || (ownership.user?.firstName ? `${ownership.user.firstName} ${ownership.user.lastName || ''}`.trim() : null)
    || ownership.email
    || '-'

  const handleRowClick = (row: TOwnerRow) => {
    setSelectedOwner(row)
    onOpen()
  }

  const renderCell = (ownership: TUnitOwnership, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return getOwnerName(ownership)
      case 'type':
        return (
          <Chip variant="flat" size="sm">
            {t.ownershipTypes[ownership.ownershipType] || ownership.ownershipType}
          </Chip>
        )
      case 'startDate':
        return formatFullDate(ownership.startDate)
      case 'status':
        return (
          <Chip color={ownership.isActive ? 'success' : 'default'} variant="flat" size="sm">
            {ownership.isActive ? t.active : t.inactive}
          </Chip>
        )
      case 'verified':
        return ownership.isRegistered ? (
          <Chip color="success" variant="flat" size="sm">{t.yes}</Chip>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Chip color="warning" variant="flat" size="sm">{t.no}</Chip>
            <Tooltip content={t.resendInvitation}>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => resendMutation.mutate({ ownershipId: ownership.id })}
                isLoading={resendMutation.isPending}
                aria-label={t.resendInvitation}
              >
                <SendHorizonal size={14} />
              </Button>
            </Tooltip>
          </div>
        )
      default:
        return null
    }
  }

  if (ownerships.length === 0) {
    return <Typography variant="body2" color="muted" className="text-xs">{t.noOwners}</Typography>
  }

  const getOwnerPhone = (o: TUnitOwnership) => {
    if (o.phoneCountryCode || o.phone)
      return `${o.phoneCountryCode || ''} ${o.phone || ''}`.trim()
    if (o.user?.phoneCountryCode || o.user?.phoneNumber)
      return `${o.user?.phoneCountryCode || ''} ${o.user?.phoneNumber || ''}`.trim()
    return null
  }

  const getOwnerEmail = (o: TUnitOwnership) =>
    o.email || o.user?.email || null

  const getOwnerDocument = (o: TUnitOwnership) => {
    if (o.idDocumentType && o.idDocumentNumber)
      return `${o.idDocumentType}: ${o.idDocumentNumber}`
    if (o.user?.idDocumentType && o.user?.idDocumentNumber)
      return `${o.user.idDocumentType}: ${o.user.idDocumentNumber}`
    return null
  }

  return (
    <>
      <Table<TOwnerRow>
        aria-label={t.ariaLabel}
        columns={columns}
        rows={ownerships}
        renderCell={renderCell}
        onRowClick={handleRowClick}
        classNames={{
          wrapper: 'shadow-none border-none p-0',
          tr: 'hover:bg-default-50 cursor-pointer',
          th: 'text-xs',
          td: 'text-sm py-1.5',
        }}
      />

      {/* Owner Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          {selectedOwner && (() => {
            const ownerEmail = getOwnerEmail(selectedOwner)
            const ownerPhone = getOwnerPhone(selectedOwner)
            const ownerDocument = getOwnerDocument(selectedOwner)

            return (
              <>
                <ModalHeader>
                  <Typography variant="h4">{t.detail.title}</Typography>
                </ModalHeader>
                <ModalBody>
                  <div className="flex flex-col gap-3">
                    {/* Personal info section */}
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <User size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Typography variant="body2" color="muted" className="text-xs">
                          {t.detail.fullName}
                        </Typography>
                        <Typography variant="body1" className="font-medium">
                          {getOwnerName(selectedOwner)}
                        </Typography>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Mail size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Typography variant="body2" color="muted" className="text-xs">
                          {t.detail.email}
                        </Typography>
                        <Typography variant="body1">
                          {ownerEmail || <span className="text-default-400 text-sm">{t.detail.noData}</span>}
                        </Typography>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Phone size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Typography variant="body2" color="muted" className="text-xs">
                          {t.detail.phone}
                        </Typography>
                        <Typography variant="body1">
                          {ownerPhone || <span className="text-default-400 text-sm">{t.detail.noData}</span>}
                        </Typography>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Typography variant="body2" color="muted" className="text-xs">
                          {t.detail.document}
                        </Typography>
                        <Typography variant="body1">
                          {ownerDocument || <span className="text-default-400 text-sm">{t.detail.noData}</span>}
                        </Typography>
                      </div>
                    </div>

                    <Divider className="my-1" />

                    {/* Ownership info section */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                          <Tag size={16} className="text-default-500" />
                        </div>
                        <div>
                          <Typography variant="body2" color="muted" className="text-xs">
                            {t.detail.ownershipType}
                          </Typography>
                          <Chip variant="flat" size="sm" className="mt-0.5">
                            {t.ownershipTypes[selectedOwner.ownershipType] || selectedOwner.ownershipType}
                          </Chip>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                          <Calendar size={16} className="text-default-500" />
                        </div>
                        <div>
                          <Typography variant="body2" color="muted" className="text-xs">
                            {t.detail.startDate}
                          </Typography>
                          <Typography variant="body1" className="text-sm">
                            {formatFullDate(selectedOwner.startDate)}
                          </Typography>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                          <CircleCheck size={16} className="text-default-500" />
                        </div>
                        <div>
                          <Typography variant="body2" color="muted" className="text-xs">
                            {t.detail.status}
                          </Typography>
                          <Chip
                            color={selectedOwner.isActive ? 'success' : 'default'}
                            variant="flat"
                            size="sm"
                            className="mt-0.5"
                          >
                            {selectedOwner.isActive ? t.active : t.inactive}
                          </Chip>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                          <Home size={16} className="text-default-500" />
                        </div>
                        <div>
                          <Typography variant="body2" color="muted" className="text-xs">
                            {t.detail.primaryResidence}
                          </Typography>
                          <Chip
                            color={selectedOwner.isPrimaryResidence ? 'success' : 'default'}
                            variant="flat"
                            size="sm"
                            className="mt-0.5"
                          >
                            {selectedOwner.isPrimaryResidence ? t.yes : t.no}
                          </Chip>
                        </div>
                      </div>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="bordered" onPress={onClose}>
                    {t.detail.close}
                  </Button>
                </ModalFooter>
              </>
            )
          })()}
        </ModalContent>
      </Modal>
    </>
  )
}
