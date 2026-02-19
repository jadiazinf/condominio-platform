'use client'

import { useState } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Tooltip } from '@/ui/components/tooltip'
import { useToast } from '@/ui/components/toast'
import { Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from '@/ui/components/modal'
import { Divider } from '@/ui/components/divider'
import { useResendOwnerInvitation } from '@packages/http-client/hooks'
import { Mail, User, Phone, FileText, Calendar } from 'lucide-react'
import type { TQuota, TPayment, TUnitOwnership } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const tableClassNames = {
  wrapper: 'shadow-none border-none p-0',
  tr: 'hover:bg-default-50',
  th: 'text-xs',
  td: 'text-sm py-1.5',
}

// ─────────────────────────────────────────────────────────────────────────────
// Quotas Table
// ─────────────────────────────────────────────────────────────────────────────

interface QuotasTableProps {
  quotas: TQuota[]
  ariaLabel: string
  columns: {
    concept: string
    period: string
    amount: string
    paid: string
    balance: string
    status: string
  }
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
}

type TQuotaRow = TQuota & { id: string }

export function QuotasTable({ quotas, ariaLabel, columns, statusColors, statusLabels }: QuotasTableProps) {
  const tableColumns: ITableColumn<TQuotaRow>[] = [
    { key: 'concept', label: columns.concept },
    { key: 'period', label: columns.period },
    { key: 'amount', label: columns.amount, align: 'end' },
    { key: 'paid', label: columns.paid, align: 'end' },
    { key: 'balance', label: columns.balance, align: 'end' },
    { key: 'status', label: columns.status },
  ]

  const renderCell = (quota: TQuota, columnKey: string) => {
    switch (columnKey) {
      case 'concept':
        return quota.paymentConcept?.name || quota.periodDescription || '-'
      case 'period': {
        if (quota.periodMonth) {
          const monthName = new Date(quota.periodYear, quota.periodMonth - 1).toLocaleDateString('es-VE', { month: 'short' })
          return `${monthName} ${quota.periodYear}`
        }
        return quota.periodDescription || `${quota.periodYear}`
      }
      case 'amount':
        return formatCurrency(quota.baseAmount)
      case 'paid':
        return formatCurrency(quota.paidAmount)
      case 'balance':
        return (
          <span className={parseFloat(quota.balance) > 0 ? 'text-danger font-medium' : ''}>
            {formatCurrency(quota.balance)}
          </span>
        )
      case 'status':
        return (
          <Chip color={(statusColors[quota.status] as 'success' | 'warning' | 'danger' | 'default') || 'default'} variant="flat" size="sm">
            {statusLabels[quota.status] || quota.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <Table<TQuotaRow>
      aria-label={ariaLabel}
      columns={tableColumns}
      rows={quotas}
      renderCell={renderCell}
      classNames={tableClassNames}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments Table
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentsTableProps {
  payments: TPayment[]
  ariaLabel: string
  columns: {
    number: string
    date: string
    amount: string
    method: string
    status: string
  }
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
  methodLabels: Record<string, string>
}

type TPaymentRow = TPayment & { id: string }

export function PaymentsTable({ payments, ariaLabel, columns, statusColors, statusLabels, methodLabels }: PaymentsTableProps) {
  const tableColumns: ITableColumn<TPaymentRow>[] = [
    { key: 'number', label: columns.number },
    { key: 'date', label: columns.date },
    { key: 'amount', label: columns.amount, align: 'end' },
    { key: 'method', label: columns.method },
    { key: 'status', label: columns.status },
  ]

  const renderCell = (payment: TPayment, columnKey: string) => {
    switch (columnKey) {
      case 'number':
        return payment.paymentNumber || '-'
      case 'date':
        return formatDate(payment.paymentDate)
      case 'amount':
        return formatCurrency(payment.amount)
      case 'method':
        return methodLabels[payment.paymentMethod] || payment.paymentMethod
      case 'status':
        return (
          <Chip color={(statusColors[payment.status] as 'success' | 'warning' | 'danger' | 'default' | 'primary') || 'default'} variant="flat" size="sm">
            {statusLabels[payment.status] || payment.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <Table<TPaymentRow>
      aria-label={ariaLabel}
      columns={tableColumns}
      rows={payments}
      renderCell={renderCell}
      classNames={tableClassNames}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Owners Table
// ─────────────────────────────────────────────────────────────────────────────

interface OwnersTableProps {
  ownerships: TUnitOwnership[]
  ariaLabel: string
  columns: {
    name: string
    type: string
    startDate: string
    status: string
    verified: string
    resendTooltip: string
    resendSuccess: string
  }
  detailLabels: {
    title: string
    email: string
    phone: string
    idDocument: string
    joinDate: string
    noData: string
    contact: string
  }
  ownershipTypeLabels: Record<string, string>
  yesLabel: string
  noLabel: string
  activeLabel: string
  inactiveLabel: string
}

type TOwnerRow = TUnitOwnership & { id: string }

export function OwnersTable({
  ownerships,
  ariaLabel,
  columns,
  detailLabels,
  ownershipTypeLabels,
  yesLabel,
  noLabel,
  activeLabel,
  inactiveLabel,
}: OwnersTableProps) {
  const toast = useToast()
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<TUnitOwnership | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const { mutate: resendInvitation } = useResendOwnerInvitation({
    onSuccess: () => {
      toast.success(columns.resendSuccess)
      setResendingId(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setResendingId(null)
    },
  })

  const tableColumns: ITableColumn<TOwnerRow>[] = [
    { key: 'name', label: columns.name },
    { key: 'type', label: columns.type },
    { key: 'startDate', label: columns.startDate },
    { key: 'status', label: columns.status },
    { key: 'verified', label: columns.verified },
  ]

  const renderCell = (ownership: TUnitOwnership, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return ownership.fullName
          || (ownership.user?.firstName ? `${ownership.user.firstName} ${ownership.user.lastName || ''}`.trim() : null)
          || ownership.email
          || '-'
      case 'type':
        return (
          <Chip variant="flat" size="sm">
            {ownershipTypeLabels[ownership.ownershipType] || ownership.ownershipType}
          </Chip>
        )
      case 'startDate':
        return formatDate(ownership.startDate)
      case 'status':
        return (
          <Chip color={ownership.isActive ? 'success' : 'default'} variant="flat" size="sm">
            {ownership.isActive ? activeLabel : inactiveLabel}
          </Chip>
        )
      case 'verified':
        if (ownership.isRegistered) {
          return (
            <Chip color="success" variant="flat" size="sm">
              {yesLabel}
            </Chip>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <Chip color="warning" variant="flat" size="sm">
              {noLabel}
            </Chip>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div onClick={(e) => e.stopPropagation()}>
              <Tooltip content={columns.resendTooltip}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  isLoading={resendingId === ownership.id}
                  onPress={() => {
                    setResendingId(ownership.id)
                    resendInvitation({ ownershipId: ownership.id })
                  }}
                >
                  <Mail size={16} />
                </Button>
              </Tooltip>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const ownerName = selectedOwner
    ? (selectedOwner.fullName
      || (selectedOwner.user?.firstName ? `${selectedOwner.user.firstName} ${selectedOwner.user.lastName || ''}`.trim() : null)
      || selectedOwner.email
      || '-')
    : ''

  const ownerEmail = selectedOwner?.email || selectedOwner?.user?.email || null
  const ownerPhone = (() => {
    if (!selectedOwner) return null
    const phone = selectedOwner.phone || selectedOwner.user?.phoneNumber || null
    if (!phone) return null
    const countryCode = selectedOwner.phoneCountryCode || selectedOwner.user?.phoneCountryCode || null
    const code = countryCode?.startsWith('+') ? countryCode : countryCode ? `+${countryCode}` : null
    return code ? `${code} ${phone}` : phone
  })()

  const idDoc = selectedOwner?.user?.idDocumentType && selectedOwner?.user?.idDocumentNumber
    ? `${selectedOwner.user.idDocumentType}-${selectedOwner.user.idDocumentNumber}`
    : null

  const joinDate = selectedOwner?.user?.createdAt
    ? formatDate(selectedOwner.user.createdAt)
    : null

  return (
    <>
      <Table<TOwnerRow>
        aria-label={ariaLabel}
        columns={tableColumns}
        rows={ownerships}
        renderCell={renderCell}
        classNames={tableClassNames}
        onRowClick={(row) => {
          setSelectedOwner(row)
          onOpen()
        }}
      />

      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <User size={18} className="text-default-500" />
            {detailLabels.title}
          </ModalHeader>
          <ModalBody className="pb-6">
            {/* Name */}
            <p className="text-lg font-semibold">{ownerName}</p>

            <Divider />

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-default-500">{detailLabels.contact}</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-default-400" />
                <span>{ownerEmail || detailLabels.noData}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-default-400" />
                <span>{ownerPhone || detailLabels.noData}</span>
              </div>
            </div>

            <Divider />

            {/* Identity document */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-default-500">{detailLabels.idDocument}</p>
              <div className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-default-400" />
                <span>{idDoc || detailLabels.noData}</span>
              </div>
            </div>

            {/* Join date (only if available) */}
            {joinDate && (
              <>
                <Divider />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-default-500">{detailLabels.joinDate}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-default-400" />
                    <span>{joinDate}</span>
                  </div>
                </div>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
