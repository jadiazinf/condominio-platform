'use client'

import type { TUnitOwnership, TQuota, TPayment } from '@packages/domain'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  Plus,
  SendHorizonal,
  User,
  Mail,
  Phone,
  FileText,
  Tag,
  Calendar,
  CircleCheck,
  Home,
} from 'lucide-react'
import { useResendOwnerInvitation } from '@packages/http-client/hooks'
import { formatFullDate } from '@packages/utils/dates'
import { formatAmount } from '@packages/utils/currency'

import { AllQuotasModal, type AllQuotasModalTranslations } from './AllQuotasModal'
import { AllPaymentsModal } from './AllPaymentsModal'
import { AddOwnershipModal, type AddOwnershipModalTranslations } from './AddOwnershipModal'

import {
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Divider } from '@/ui/components/divider'
import { Tooltip } from '@/ui/components/tooltip'
import { useToast } from '@/ui/components/toast'

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
  translations: AllQuotasModalTranslations
}

export function ViewAllQuotasButton({ unitId, label, translations }: ViewAllQuotasButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        color="primary"
        endContent={<ChevronRight size={14} />}
        size="sm"
        variant="light"
        onPress={onOpen}
      >
        {label}
      </Button>
      <AllQuotasModal
        isOpen={isOpen}
        translations={translations}
        unitId={unitId}
        onClose={onClose}
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
        color="primary"
        endContent={<ChevronRight size={14} />}
        size="sm"
        variant="light"
        onPress={onOpen}
      >
        {label}
      </Button>
      <AllPaymentsModal
        isOpen={isOpen}
        translations={translations}
        unitId={unitId}
        onClose={onClose}
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
      <Button color="primary" size="sm" startContent={<Plus size={14} />} onPress={onOpen}>
        {label}
      </Button>
      <AddOwnershipModal
        isOpen={isOpen}
        translations={translations}
        unitId={unitId}
        onClose={onClose}
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
    ownership.fullName ||
    (ownership.user?.firstName
      ? `${ownership.user.firstName} ${ownership.user.lastName || ''}`.trim()
      : null) ||
    ownership.email ||
    '-'

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
          <Chip size="sm" variant="flat">
            {t.ownershipTypes[ownership.ownershipType] || ownership.ownershipType}
          </Chip>
        )
      case 'startDate':
        return formatFullDate(ownership.startDate)
      case 'status':
        return (
          <Chip color={ownership.isActive ? 'success' : 'default'} size="sm" variant="flat">
            {ownership.isActive ? t.active : t.inactive}
          </Chip>
        )
      case 'verified':
        return ownership.isRegistered ? (
          <Chip color="success" size="sm" variant="flat">
            {t.yes}
          </Chip>
        ) : (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Chip color="warning" size="sm" variant="flat">
              {t.no}
            </Chip>
            <Tooltip content={t.resendInvitation}>
              <Button
                isIconOnly
                aria-label={t.resendInvitation}
                isLoading={resendMutation.isPending}
                size="sm"
                variant="light"
                onPress={() => resendMutation.mutate({ ownershipId: ownership.id })}
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
    return (
      <Typography className="text-xs" color="muted" variant="body2">
        {t.noOwners}
      </Typography>
    )
  }

  const getOwnerPhone = (o: TUnitOwnership) => {
    if (o.phoneCountryCode || o.phone) return `${o.phoneCountryCode || ''} ${o.phone || ''}`.trim()
    if (o.user?.phoneCountryCode || o.user?.phoneNumber)
      return `${o.user?.phoneCountryCode || ''} ${o.user?.phoneNumber || ''}`.trim()

    return null
  }

  const getOwnerEmail = (o: TUnitOwnership) => o.email || o.user?.email || null

  const getOwnerDocument = (o: TUnitOwnership) => {
    if (o.idDocumentType && o.idDocumentNumber) return `${o.idDocumentType}: ${o.idDocumentNumber}`
    if (o.user?.idDocumentType && o.user?.idDocumentNumber)
      return `${o.user.idDocumentType}: ${o.user.idDocumentNumber}`

    return null
  }

  return (
    <>
      <Table<TOwnerRow>
        aria-label={t.ariaLabel}
        classNames={{
          wrapper: 'shadow-none border-none p-0',
          tr: 'hover:bg-default-50 cursor-pointer',
          th: 'text-xs',
          td: 'text-sm py-1.5',
        }}
        columns={columns}
        renderCell={renderCell}
        rows={ownerships}
        onRowClick={handleRowClick}
      />

      {/* Owner Detail Modal */}
      <Modal isOpen={isOpen} size="md" onClose={onClose}>
        <ModalContent>
          {selectedOwner &&
            (() => {
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
                          <User className="text-primary" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography className="text-xs" color="muted" variant="body2">
                            {t.detail.fullName}
                          </Typography>
                          <Typography className="font-medium" variant="body1">
                            {getOwnerName(selectedOwner)}
                          </Typography>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Mail className="text-primary" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography className="text-xs" color="muted" variant="body2">
                            {t.detail.email}
                          </Typography>
                          <Typography variant="body1">
                            {ownerEmail || (
                              <span className="text-default-400 text-sm">{t.detail.noData}</span>
                            )}
                          </Typography>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Phone className="text-primary" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography className="text-xs" color="muted" variant="body2">
                            {t.detail.phone}
                          </Typography>
                          <Typography variant="body1">
                            {ownerPhone || (
                              <span className="text-default-400 text-sm">{t.detail.noData}</span>
                            )}
                          </Typography>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <FileText className="text-primary" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography className="text-xs" color="muted" variant="body2">
                            {t.detail.document}
                          </Typography>
                          <Typography variant="body1">
                            {ownerDocument || (
                              <span className="text-default-400 text-sm">{t.detail.noData}</span>
                            )}
                          </Typography>
                        </div>
                      </div>

                      <Divider className="my-1" />

                      {/* Ownership info section */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                            <Tag className="text-default-500" size={16} />
                          </div>
                          <div>
                            <Typography className="text-xs" color="muted" variant="body2">
                              {t.detail.ownershipType}
                            </Typography>
                            <Chip className="mt-0.5" size="sm" variant="flat">
                              {t.ownershipTypes[selectedOwner.ownershipType] ||
                                selectedOwner.ownershipType}
                            </Chip>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                            <Calendar className="text-default-500" size={16} />
                          </div>
                          <div>
                            <Typography className="text-xs" color="muted" variant="body2">
                              {t.detail.startDate}
                            </Typography>
                            <Typography className="text-sm" variant="body1">
                              {formatFullDate(selectedOwner.startDate)}
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                            <CircleCheck className="text-default-500" size={16} />
                          </div>
                          <div>
                            <Typography className="text-xs" color="muted" variant="body2">
                              {t.detail.status}
                            </Typography>
                            <Chip
                              className="mt-0.5"
                              color={selectedOwner.isActive ? 'success' : 'default'}
                              size="sm"
                              variant="flat"
                            >
                              {selectedOwner.isActive ? t.active : t.inactive}
                            </Chip>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default/10">
                            <Home className="text-default-500" size={16} />
                          </div>
                          <div>
                            <Typography className="text-xs" color="muted" variant="body2">
                              {t.detail.primaryResidence}
                            </Typography>
                            <Chip
                              className="mt-0.5"
                              color={selectedOwner.isPrimaryResidence ? 'success' : 'default'}
                              size="sm"
                              variant="flat"
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

// ─────────────────────────────────────────────────────────────────────────────
// Recent Quotas Table (client component — renderCell cannot live in server)
// ─────────────────────────────────────────────────────────────────────────────

const quotaStatusColors: Record<
  string,
  'success' | 'warning' | 'danger' | 'default' | 'secondary' | 'primary'
> = {
  paid: 'success',
  pending: 'warning',
  partial: 'primary',
  overdue: 'danger',
  cancelled: 'default',
  exonerated: 'secondary',
}

const paymentStatusColors: Record<
  string,
  'success' | 'warning' | 'danger' | 'default' | 'primary'
> = {
  completed: 'success',
  pending: 'warning',
  pending_verification: 'primary',
  failed: 'danger',
  refunded: 'default',
  rejected: 'danger',
}

type TQuotaRow = TQuota & { id: string }

export interface RecentQuotasTableProps {
  quotas: TQuota[]
  translations: {
    ariaLabel: string
    columns: {
      concept: string
      period: string
      amount: string
      paid: string
      balance: string
      status: string
    }
    statuses: Record<string, string>
  }
}

export function RecentQuotasTable({ quotas, translations: t }: RecentQuotasTableProps) {
  const columns: ITableColumn<TQuotaRow>[] = [
    { key: 'concept', label: t.columns.concept },
    { key: 'period', label: t.columns.period },
    { key: 'amount', label: t.columns.amount, align: 'end' },
    { key: 'paid', label: t.columns.paid, align: 'end' },
    { key: 'balance', label: t.columns.balance, align: 'end' },
    { key: 'status', label: t.columns.status },
  ]

  const renderCell = (quota: TQuota, columnKey: string) => {
    const sym = quota.currency?.symbol || quota.currency?.code || '$'

    switch (columnKey) {
      case 'concept':
        return quota.paymentConcept?.name || quota.periodDescription || '-'
      case 'period': {
        if (quota.periodMonth) {
          const monthName = new Date(quota.periodYear, quota.periodMonth - 1).toLocaleDateString(
            'es-VE',
            { month: 'short' }
          )

          return `${monthName} ${quota.periodYear}`
        }

        return quota.periodDescription || `${quota.periodYear}`
      }
      case 'amount':
        return `${sym} ${formatAmount(quota.baseAmount)}`
      case 'paid':
        return `${sym} ${formatAmount(quota.paidAmount)}`
      case 'balance':
        return (
          <span className={parseFloat(quota.balance) > 0 ? 'text-danger font-medium' : ''}>
            {sym} {formatAmount(quota.balance)}
          </span>
        )
      case 'status':
        return (
          <Chip color={quotaStatusColors[quota.status] || 'default'} size="sm" variant="flat">
            {t.statuses[quota.status] || quota.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <Table<TQuotaRow>
      aria-label={t.ariaLabel}
      classNames={{
        wrapper: 'shadow-none border-none p-0',
        tr: 'hover:bg-default-50',
        th: 'text-xs',
        td: 'text-sm py-1.5',
      }}
      columns={columns}
      renderCell={renderCell}
      rows={quotas}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent Payments Table (client component)
// ─────────────────────────────────────────────────────────────────────────────

type TPaymentRow = TPayment & { id: string }

export interface RecentPaymentsTableProps {
  payments: TPayment[]
  translations: {
    ariaLabel: string
    columns: { number: string; date: string; amount: string; method: string; status: string }
    statuses: Record<string, string>
    methods: Record<string, string>
  }
}

export function RecentPaymentsTable({ payments, translations: t }: RecentPaymentsTableProps) {
  const columns: ITableColumn<TPaymentRow>[] = [
    { key: 'number', label: t.columns.number },
    { key: 'date', label: t.columns.date },
    { key: 'amount', label: t.columns.amount, align: 'end' },
    { key: 'method', label: t.columns.method },
    { key: 'status', label: t.columns.status },
  ]

  const renderCell = (payment: TPayment, columnKey: string) => {
    switch (columnKey) {
      case 'number':
        return payment.paymentNumber || '-'
      case 'date':
        return formatFullDate(payment.paymentDate)
      case 'amount':
        return formatAmount(payment.amount)
      case 'method':
        return t.methods[payment.paymentMethod] || payment.paymentMethod
      case 'status':
        return (
          <Chip color={paymentStatusColors[payment.status] || 'default'} size="sm" variant="flat">
            {t.statuses[payment.status] || payment.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <Table<TPaymentRow>
      aria-label={t.ariaLabel}
      classNames={{
        wrapper: 'shadow-none border-none p-0',
        tr: 'hover:bg-default-50',
        th: 'text-xs',
        td: 'text-sm py-1.5',
      }}
      columns={columns}
      renderCell={renderCell}
      rows={payments}
    />
  )
}
