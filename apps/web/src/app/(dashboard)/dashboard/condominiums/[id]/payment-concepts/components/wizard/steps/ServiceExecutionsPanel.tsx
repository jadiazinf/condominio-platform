'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react'
import { useServiceExecutionsPaginated, useDeleteServiceExecution } from '@packages/http-client/hooks/use-service-executions'
import { ExecutionModal } from '../../../../services/components/ExecutionModal'
import type { TServiceExecution } from '@packages/domain'
import { useToast } from '@/ui/components/toast'

interface ServiceExecutionsPanelProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
  serviceId: string
  serviceName: string
  condominiumId: string
  currencyId: string
}

export function ServiceExecutionsPanel({
  isOpen,
  onClose,
  managementCompanyId,
  serviceId,
  serviceName,
  condominiumId,
  currencyId,
}: ServiceExecutionsPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const d = 'admin.condominiums.detail.services.detail'

  const [executionToEdit, setExecutionToEdit] = useState<TServiceExecution | null>(null)
  const [executionModalOpen, setExecutionModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useServiceExecutionsPaginated({
    companyId: managementCompanyId,
    serviceId,
    condominiumId,
    query: { limit: 50 },
    enabled: isOpen,
  })

  const executions: TServiceExecution[] = data?.data ?? []

  const deleteExecution = useDeleteServiceExecution(
    managementCompanyId,
    serviceId,
    condominiumId,
    {
      onSuccess: () => {
        toast.success(t(`${d}.executionDeleted`))
        setDeletingId(null)
        refetch()
      },
      onError: () => {
        toast.error(t(`${d}.executionDeleteError`))
        setDeletingId(null)
      },
    }
  )

  const handleNewExecution = () => {
    setExecutionToEdit(null)
    setExecutionModalOpen(true)
  }

  const handleEditExecution = (execution: TServiceExecution) => {
    setExecutionToEdit(execution)
    setExecutionModalOpen(true)
  }

  const handleDeleteExecution = (executionId: string) => {
    setDeletingId(executionId)
    deleteExecution.mutate({ executionId })
  }

  const handleExecutionSuccess = () => {
    setExecutionModalOpen(false)
    setExecutionToEdit(null)
    refetch()
  }

  const statusColor = (status: string) =>
    status === 'confirmed' ? 'primary' : 'default'

  const statusLabel = (status: string) =>
    status === 'confirmed' ? t(`${d}.confirmed`) : t(`${d}.draft`)

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center justify-between gap-3 pr-12">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt size={18} className="text-primary shrink-0" />
              <div className="min-w-0">
                <Typography variant="h4">{t(`${d}.executions`)}</Typography>
                <p className="text-xs text-default-400 truncate">{serviceName}</p>
              </div>
            </div>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<Plus size={14} />}
              onPress={handleNewExecution}
              className="shrink-0"
            >
              {t(`${d}.newExecution`)}
            </Button>
          </ModalHeader>

          <ModalBody className="pb-6">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner size="lg" />
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Receipt size={40} className="text-default-300" />
                <p className="text-sm text-default-400">{t(`${d}.noExecutions`)}</p>
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={<Plus size={14} />}
                  onPress={handleNewExecution}
                >
                  {t(`${d}.newExecution`)}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {executions.map(execution => (
                  <div
                    key={execution.id}
                    className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{execution.title}</p>
                      <p className="text-xs text-default-400">
                        {new Date(execution.executionDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={statusColor(execution.status)}
                    >
                      {statusLabel(execution.status)}
                    </Chip>
                    <p className="text-sm font-medium shrink-0 tabular-nums">
                      {Number(execution.totalAmount).toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleEditExecution(execution)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        isLoading={deletingId === execution.id}
                        onPress={() => handleDeleteExecution(execution.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {executionModalOpen && (
        <ExecutionModal
          isOpen={executionModalOpen}
          onClose={() => {
            setExecutionModalOpen(false)
            setExecutionToEdit(null)
          }}
          managementCompanyId={managementCompanyId}
          serviceId={serviceId}
          condominiumId={condominiumId}
          currencyId={currencyId}
          execution={executionToEdit}
          onSuccess={handleExecutionSuccess}
        />
      )}
    </>
  )
}
