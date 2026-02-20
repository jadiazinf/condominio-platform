'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import type { TAccessRequest, TAccessRequestStatus } from '@packages/domain'
import { formatFullDate } from '@packages/utils/dates'

import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Link } from '@/ui/components/link'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { useDisclosure } from '@/ui/components/modal'
import { useMyAccessRequests } from '@packages/http-client/hooks'

type TStatusFilter = 'all' | TAccessRequestStatus

interface IMyRequestsClientProps {
  translations: {
    noRequests: string
    joinCondominium: string
    statusFilter: {
      all: string
      pending: string
      approved: string
      rejected: string
    }
    table: {
      condominium: string
      building: string
      unit: string
      ownershipType: string
      date: string
      status: string
    }
    status: {
      pending: string
      approved: string
      rejected: string
    }
    ownershipTypes: {
      owner: string
      tenant: string
      family_member: string
      authorized: string
    }
    detail: {
      title: string
      condominium: string
      building: string
      unit: string
      ownershipType: string
      date: string
      status: string
      adminNotes: string
      noAdminNotes: string
      close: string
      statusMessages: {
        pending: string
        approved: string
        rejected: string
      }
    }
  }
}

const STATUS_COLORS: Record<TAccessRequestStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export function MyRequestsClient({ translations }: IMyRequestsClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<TAccessRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const { data: response, isLoading } = useMyAccessRequests({
    page,
    limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const requests = response?.data ?? []
  const pagination = response?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  const statusItems: ISelectItem[] = [
    { key: 'all', label: translations.statusFilter.all },
    { key: 'pending', label: translations.statusFilter.pending },
    { key: 'approved', label: translations.statusFilter.approved },
    { key: 'rejected', label: translations.statusFilter.rejected },
  ]

  const handleStatusChange = (key: string | null) => {
    setStatusFilter((key ?? 'all') as TStatusFilter)
    setPage(1)
  }

  const getCondominiumName = (request: TAccessRequest) => {
    const condo = (request as Record<string, unknown>).condominium as Record<string, string> | undefined
    return condo?.name ?? '-'
  }

  const getUnitNumber = (request: TAccessRequest) => {
    const unit = (request as Record<string, unknown>).unit as Record<string, string> | undefined
    return unit?.unitNumber ?? '-'
  }

  const getBuildingName = (request: TAccessRequest) => {
    const building = (request as Record<string, unknown>).building as Record<string, string> | undefined
    return building?.name ?? '-'
  }

  const getOwnershipLabel = (type: string) => {
    return translations.ownershipTypes[type as keyof typeof translations.ownershipTypes] ?? type
  }

  const handleRowClick = (request: TAccessRequest) => {
    setSelectedRequest(request)
    onOpen()
  }

  return (
    <>
      {/* Status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          aria-label="Status"
          items={statusItems}
          value={statusFilter}
          onChange={handleStatusChange}
          className="sm:max-w-[200px]"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-default-400">{translations.noRequests}</p>
          <Link href="/dashboard/join-condominium">
            <Button color="primary" startContent={<KeyRound size={16} />}>
              {translations.joinCondominium}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default-200 text-left">
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.condominium}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.building}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.unit}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.ownershipType}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.date}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.status}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr
                    key={request.id}
                    className="border-b border-default-100 hover:bg-default-50 cursor-pointer"
                    onClick={() => handleRowClick(request)}
                  >
                    <td className="px-4 py-3 font-medium">{getCondominiumName(request)}</td>
                    <td className="px-4 py-3">{getBuildingName(request)}</td>
                    <td className="px-4 py-3">{getUnitNumber(request)}</td>
                    <td className="px-4 py-3">{getOwnershipLabel(request.ownershipType)}</td>
                    <td className="px-4 py-3">
                      {formatFullDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Chip
                        size="sm"
                        color={STATUS_COLORS[request.status]}
                        variant="flat"
                      >
                        {translations.status[request.status]}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit)
              setPage(1)
            }}
          />
        </>
      )}

      {/* Detail modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          {selectedRequest && (
            <>
              <ModalHeader>{translations.detail.title}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.condominium}</p>
                      <p className="text-sm font-medium">{getCondominiumName(selectedRequest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.building}</p>
                      <p className="text-sm font-medium">{getBuildingName(selectedRequest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.unit}</p>
                      <p className="text-sm font-medium">{getUnitNumber(selectedRequest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.ownershipType}</p>
                      <p className="text-sm font-medium">{getOwnershipLabel(selectedRequest.ownershipType)}</p>
                    </div>
                  </div>

                  <hr className="border-default-200" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.date}</p>
                      <p className="text-sm font-medium">{formatFullDate(selectedRequest.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.status}</p>
                      <div className="mt-1">
                        <Chip
                          size="sm"
                          color={STATUS_COLORS[selectedRequest.status]}
                          variant="flat"
                        >
                          {translations.status[selectedRequest.status]}
                        </Chip>
                      </div>
                    </div>
                  </div>

                  {/* Status message */}
                  <div className={`rounded-lg p-3 text-sm ${
                    selectedRequest.status === 'pending'
                      ? 'bg-warning-50 text-warning-700'
                      : selectedRequest.status === 'approved'
                        ? 'bg-success-50 text-success-700'
                        : 'bg-danger-50 text-danger-700'
                  }`}>
                    {translations.detail.statusMessages[selectedRequest.status]}
                  </div>

                  {/* Admin notes (if has notes) */}
                  {selectedRequest.adminNotes && (
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.adminNotes}</p>
                      <p className="text-sm mt-1 bg-default-100 rounded-lg p-3">
                        {selectedRequest.adminNotes}
                      </p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {translations.detail.close}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
