'use client'

import { useState, useCallback } from 'react'
import { Check, X, Search } from 'lucide-react'
import type { TAccessRequest, TAccessRequestStatus } from '@packages/domain'
import { HttpError } from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Input } from '@/ui/components/input'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { useDisclosure } from '@/ui/components/modal'
import { Textarea } from '@/ui/components/textarea'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { useToast } from '@/ui/components/toast'
import { useCondominiumAccessRequests, useReviewAccessRequest } from '@packages/http-client/hooks'

type TStatusFilter = 'all' | TAccessRequestStatus

interface IAccessRequestsPageClientProps {
  condominiumId: string
  managementCompanyId?: string
  translations: {
    noRequests: string
    searchPlaceholder: string
    statusFilter: {
      all: string
      pending: string
      approved: string
      rejected: string
    }
    table: {
      user: string
      unit: string
      building: string
      ownershipType: string
      date: string
      status: string
      actions: string
    }
    status: {
      pending: string
      approved: string
      rejected: string
    }
    actions: {
      approve: string
      reject: string
      approveConfirm: string
      rejectTitle: string
      rejectNotesPlaceholder: string
      cancel: string
      confirm: string
    }
    success: {
      approved: string
      rejected: string
    }
    error: {
      review: string
      notBelongsToCondominium: string
      alreadyReviewed: string
      notFound: string
    }
    ownershipTypes: {
      owner: string
      tenant: string
      family_member: string
      authorized: string
    }
    detail: {
      title: string
      name: string
      email: string
      phone: string
      identityDocument: string
      building: string
      unit: string
      ownershipType: string
      date: string
      status: string
      adminNotes: string
      noPhone: string
      noDocument: string
    }
  }
}

const STATUS_COLORS: Record<TAccessRequestStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

const API_ERROR_MAP: Record<string, string> = {
  'Access request does not belong to this condominium': 'notBelongsToCondominium',
  'Access request has already been reviewed': 'alreadyReviewed',
  'Access request not found': 'notFound',
}

type TRequestUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phoneCountryCode?: string | null
  phoneNumber?: string | null
  idDocumentType?: string | null
  idDocumentNumber?: string | null
}

function getUser(request: TAccessRequest): TRequestUser | undefined {
  return (request as Record<string, unknown>).user as TRequestUser | undefined
}

function getUnit(request: TAccessRequest) {
  return (request as Record<string, unknown>).unit as { id: string; unitNumber: string; buildingId: string } | undefined
}

function getBuilding(request: TAccessRequest) {
  return (request as Record<string, unknown>).building as { id: string; name: string } | undefined
}

export function AccessRequestsPageClient({
  condominiumId,
  managementCompanyId,
  translations,
}: IAccessRequestsPageClientProps) {
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [rejectNotes, setRejectNotes] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<TAccessRequest | null>(null)
  const [detailRequest, setDetailRequest] = useState<TAccessRequest | null>(null)
  const { isOpen: isRejectOpen, onOpen: onRejectOpen, onClose: onRejectClose } = useDisclosure()
  const { isOpen: isApproveOpen, onOpen: onApproveOpen, onClose: onApproveClose } = useDisclosure()
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure()

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
    setSearchTimeout(timeout)
  }, [searchTimeout])

  const { data: response, isLoading, refetch } = useCondominiumAccessRequests({
    condominiumId,
    managementCompanyId,
    page,
    limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
  })

  const requests = response?.data ?? []
  const pagination = response?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  const reviewMutation = useReviewAccessRequest({
    condominiumId,
    managementCompanyId,
    onSuccess: result => {
      toast.success(
        result.data.status === 'approved'
          ? translations.success.approved
          : translations.success.rejected
      )
      refetch()
      onRejectClose()
      onApproveClose()
      onDetailClose()
      setSelectedRequest(null)
      setDetailRequest(null)
      setRejectNotes('')
    },
    onError: (error: Error) => {
      if (HttpError.isHttpError(error)) {
        const errorKey = API_ERROR_MAP[error.message]
        if (errorKey && errorKey in translations.error) {
          toast.error(translations.error[errorKey as keyof typeof translations.error])
          return
        }
      }
      toast.error(translations.error.review)
    },
  })

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

  const handleRowClick = (request: TAccessRequest) => {
    setDetailRequest(request)
    onDetailOpen()
  }

  const handleApprove = (request: TAccessRequest) => {
    setSelectedRequest(request)
    onApproveOpen()
  }

  const handleReject = (request: TAccessRequest) => {
    setSelectedRequest(request)
    setRejectNotes('')
    onRejectOpen()
  }

  const confirmApprove = () => {
    if (!selectedRequest) return
    reviewMutation.mutate({
      requestId: selectedRequest.id,
      status: 'approved',
    })
  }

  const confirmReject = () => {
    if (!selectedRequest) return
    reviewMutation.mutate({
      requestId: selectedRequest.id,
      status: 'rejected',
      adminNotes: rejectNotes || undefined,
    })
  }

  const getOwnershipLabel = (type: string) => {
    return translations.ownershipTypes[type as keyof typeof translations.ownershipTypes] ?? type
  }

  const getUserDisplay = (request: TAccessRequest) => {
    const user = getUser(request)
    if (user) {
      return user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    }
    return request.userId
  }

  const getUnitDisplay = (request: TAccessRequest) => {
    const unit = getUnit(request)
    return unit?.unitNumber ?? request.unitId
  }

  const getBuildingDisplay = (request: TAccessRequest) => {
    const building = getBuilding(request)
    return building?.name ?? '-'
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={translations.searchPlaceholder}
          value={search}
          onValueChange={handleSearchChange}
          startContent={<Search size={16} className="text-default-400" />}
          className="sm:max-w-xs"
          isClearable
          onClear={() => handleSearchChange('')}
        />
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
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-default-400">{translations.noRequests}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default-200 text-left">
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.user}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.building}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.unit}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.ownershipType}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.date}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.status}</th>
                  <th className="px-4 py-3 font-medium text-default-500">{translations.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr
                    key={request.id}
                    className="border-b border-default-100 hover:bg-default-50 cursor-pointer"
                    onClick={() => handleRowClick(request)}
                  >
                    <td className="px-4 py-3">{getUserDisplay(request)}</td>
                    <td className="px-4 py-3">{getBuildingDisplay(request)}</td>
                    <td className="px-4 py-3">{getUnitDisplay(request)}</td>
                    <td className="px-4 py-3">{getOwnershipLabel(request.ownershipType)}</td>
                    <td className="px-4 py-3">
                      {new Date(request.createdAt).toLocaleDateString()}
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
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {request.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            isIconOnly
                            onPress={() => handleApprove(request)}
                            aria-label={translations.actions.approve}
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            isIconOnly
                            onPress={() => handleReject(request)}
                            aria-label={translations.actions.reject}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      )}
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
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="lg">
        <ModalContent>
          <ModalHeader>{translations.detail.title}</ModalHeader>
          <ModalBody>
            {detailRequest && (() => {
              const user = getUser(detailRequest)
              const unit = getUnit(detailRequest)
              const building = getBuilding(detailRequest)
              const userName = user
                ? (user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email)
                : detailRequest.userId
              const phone = user?.phoneCountryCode && user?.phoneNumber
                ? `${user.phoneCountryCode} ${user.phoneNumber}`
                : null
              const document = user?.idDocumentType && user?.idDocumentNumber
                ? `${user.idDocumentType}: ${user.idDocumentNumber}`
                : null

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.name}</p>
                      <p className="text-sm font-medium">{userName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.email}</p>
                      <p className="text-sm font-medium">{user?.email ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.phone}</p>
                      <p className="text-sm font-medium">{phone ?? translations.detail.noPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.identityDocument}</p>
                      <p className="text-sm font-medium">{document ?? translations.detail.noDocument}</p>
                    </div>
                  </div>

                  <hr className="border-default-200" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.building}</p>
                      <p className="text-sm font-medium">{building?.name ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.unit}</p>
                      <p className="text-sm font-medium">{unit?.unitNumber ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.ownershipType}</p>
                      <p className="text-sm font-medium">{getOwnershipLabel(detailRequest.ownershipType)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.date}</p>
                      <p className="text-sm font-medium">{new Date(detailRequest.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-default-400">{translations.detail.status}</p>
                    <div className="mt-1">
                      <Chip
                        size="sm"
                        color={STATUS_COLORS[detailRequest.status]}
                        variant="flat"
                      >
                        {translations.status[detailRequest.status]}
                      </Chip>
                    </div>
                  </div>

                  {detailRequest.adminNotes && (
                    <div>
                      <p className="text-xs text-default-400">{translations.detail.adminNotes}</p>
                      <p className="text-sm mt-1">{detailRequest.adminNotes}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </ModalBody>
          <ModalFooter>
            {detailRequest?.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  color="danger"
                  variant="flat"
                  onPress={() => {
                    onDetailClose()
                    if (detailRequest) handleReject(detailRequest)
                  }}
                >
                  {translations.actions.reject}
                </Button>
                <Button
                  color="success"
                  onPress={() => {
                    onDetailClose()
                    if (detailRequest) handleApprove(detailRequest)
                  }}
                >
                  {translations.actions.approve}
                </Button>
              </div>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Approve confirmation modal */}
      <Modal isOpen={isApproveOpen} onClose={onApproveClose} size="sm">
        <ModalContent>
          <ModalHeader>{translations.actions.approve}</ModalHeader>
          <ModalBody>
            <p className="text-sm">{translations.actions.approveConfirm}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onApproveClose}>
              {translations.actions.cancel}
            </Button>
            <Button
              color="success"
              onPress={confirmApprove}
              isLoading={reviewMutation.isPending}
            >
              {translations.actions.confirm}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject modal with notes */}
      <Modal isOpen={isRejectOpen} onClose={onRejectClose} size="md">
        <ModalContent>
          <ModalHeader>{translations.actions.rejectTitle}</ModalHeader>
          <ModalBody>
            <Textarea
              placeholder={translations.actions.rejectNotesPlaceholder}
              value={rejectNotes}
              onValueChange={setRejectNotes}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onRejectClose}>
              {translations.actions.cancel}
            </Button>
            <Button
              color="danger"
              onPress={confirmReject}
              isLoading={reviewMutation.isPending}
            >
              {translations.actions.reject}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
