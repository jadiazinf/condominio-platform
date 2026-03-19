'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  useMyCompanyMemberAuditLogsPaginated,
  type TAuditLogEntry,
} from '@packages/http-client/hooks'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { DatePicker } from '@/ui/components/date-picker'
import { Select } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { useTranslation } from '@/contexts'

const T_PREFIX = 'admin.company.myCompany.members.detail'
const ITEMS_PER_PAGE = 10

interface AuditLogsModalProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
  memberId: string
}

type TAuditLogRow = TAuditLogEntry & { id: string }

const actionColors: Record<string, 'success' | 'danger' | 'primary' | 'default'> = {
  INSERT: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
}

export function AuditLogsModal({
  isOpen,
  onClose,
  managementCompanyId,
  memberId,
}: AuditLogsModalProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useMyCompanyMemberAuditLogsPaginated(
    managementCompanyId,
    memberId,
    {
      page,
      limit: ITEMS_PER_PAGE,
      action: (action || undefined) as 'INSERT' | 'UPDATE' | 'DELETE' | undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: isOpen }
  )

  const logs = (data?.data ?? []) as TAuditLogRow[]
  const pagination = data?.pagination

  const handleClearFilters = () => {
    setAction('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasFilters = action || dateFrom || dateTo

  const columns: ITableColumn<TAuditLogRow>[] = [
    { key: 'action', label: t(`${T_PREFIX}.auditLogsModal.table.action`) },
    {
      key: 'changedFields',
      label: t(`${T_PREFIX}.auditLogsModal.table.changedFields`),
      hideOnMobile: true,
    },
    { key: 'createdAt', label: t(`${T_PREFIX}.auditLogsModal.table.date`) },
  ]

  const renderCell = (log: TAuditLogRow, columnKey: string) => {
    switch (columnKey) {
      case 'action':
        return (
          <Chip color={actionColors[log.action] || 'default'} size="sm" variant="flat">
            {t(`${T_PREFIX}.auditLogs.action.${log.action}`)}
          </Chip>
        )
      case 'changedFields': {
        const fields = log.changedFields ?? []

        if (fields.length === 0) return '-'

        return (
          <div className="flex flex-wrap gap-1">
            {fields.slice(0, 3).map(field => (
              <Chip key={field} className="text-xs" size="sm" variant="flat">
                {t(`${T_PREFIX}.auditLogs.fields.${field}`) || field}
              </Chip>
            ))}
            {fields.length > 3 && (
              <Chip className="text-xs" size="sm" variant="flat">
                +{fields.length - 3}
              </Chip>
            )}
          </div>
        )
      }
      case 'createdAt':
        return new Date(log.createdAt).toLocaleString()
      default:
        return null
    }
  }

  const handleRowClick = (log: TAuditLogRow) => {
    onClose()
    router.push(`/dashboard/my-management-company/members/${memberId}/activity/${log.id}`)
  }

  const actionOptions = [
    { key: '', label: t(`${T_PREFIX}.auditLogsModal.filters.allActions`) },
    { key: 'INSERT', label: t(`${T_PREFIX}.auditLogs.action.INSERT`) },
    { key: 'UPDATE', label: t(`${T_PREFIX}.auditLogs.action.UPDATE`) },
    { key: 'DELETE', label: t(`${T_PREFIX}.auditLogs.action.DELETE`) },
  ]

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="4xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t(`${T_PREFIX}.auditLogsModal.title`)}</Typography>
        </ModalHeader>
        <ModalBody className="pb-6">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <DatePicker
                label={t(`${T_PREFIX}.auditLogsModal.filters.dateFrom`)}
                value={dateFrom}
                onChange={value => {
                  setDateFrom(value)
                  setPage(1)
                }}
              />
            </div>
            <div className="min-w-[140px]">
              <DatePicker
                label={t(`${T_PREFIX}.auditLogsModal.filters.dateTo`)}
                value={dateTo}
                onChange={value => {
                  setDateTo(value)
                  setPage(1)
                }}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                items={actionOptions}
                label={t(`${T_PREFIX}.auditLogsModal.filters.action`)}
                selectedKeys={action ? [action] : []}
                size="sm"
                onChange={key => {
                  setAction(key ?? '')
                  setPage(1)
                }}
              />
            </div>
            {hasFilters && (
              <Button
                size="sm"
                startContent={<X size={14} />}
                variant="light"
                onPress={handleClearFilters}
              >
                {t(`${T_PREFIX}.auditLogsModal.filters.clear`)}
              </Button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : logs.length === 0 ? (
            <Typography className="py-8 text-center" color="muted" variant="body2">
              {t(`${T_PREFIX}.auditLogs.noLogs`)}
            </Typography>
          ) : (
            <>
              <Table<TAuditLogRow>
                aria-label={t(`${T_PREFIX}.auditLogsModal.title`)}
                classNames={{
                  wrapper: 'shadow-none border-none p-0',
                  tr: 'hover:bg-default-50 cursor-pointer',
                }}
                columns={columns}
                renderCell={renderCell}
                rows={logs}
                onRowClick={handleRowClick}
              />
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    limit={pagination.limit}
                    page={pagination.page}
                    showLimitSelector={false}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
