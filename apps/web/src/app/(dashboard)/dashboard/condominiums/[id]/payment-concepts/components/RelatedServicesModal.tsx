'use client'

import type { TServiceExecution } from '@packages/domain'

import { useMemo, useState, useEffect } from 'react'
import { Wrench, Receipt } from 'lucide-react'
import { usePaymentConceptServices } from '@packages/http-client'
import { useServiceExecutionsPaginated } from '@packages/http-client/hooks/use-service-executions'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { Accordion, AccordionItem } from '@/ui/components/accordion'

interface RelatedServicesModalProps {
  isOpen: boolean
  onClose: () => void
  conceptId: string
  managementCompanyId: string
  condominiumId: string
  currencySymbol: string
  currencyCode: string
}

interface ServiceExecutionsListProps {
  companyId: string
  serviceId: string
  condominiumId: string
  conceptId: string
  formatAmount: (amount: number) => string
  enabled: boolean
}

function ServiceExecutionsList({
  companyId,
  serviceId,
  condominiumId,
  conceptId,
  formatAmount,
  enabled,
}: ServiceExecutionsListProps) {
  const { t } = useTranslation()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'

  const { data, isLoading } = useServiceExecutionsPaginated({
    companyId,
    serviceId,
    condominiumId,
    query: { limit: 10, conceptId },
    enabled,
  })

  const executions: TServiceExecution[] = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (executions.length === 0) {
    return (
      <p className="text-xs text-default-400 py-2 text-center">{t(`${d}.noServiceExecutions`)}</p>
    )
  }

  return (
    <div className="space-y-2">
      {executions.map(execution => (
        <div
          key={execution.id}
          className="flex items-center justify-between rounded-md border border-default-100 bg-default-50 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{execution.title}</p>
            <p className="text-xs text-default-400">
              {new Date(execution.executionDate).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-xs font-medium">{formatAmount(Number(execution.totalAmount))}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function RelatedServicesModal({
  isOpen,
  onClose,
  conceptId,
  managementCompanyId,
  condominiumId,
  currencySymbol,
  currencyCode,
}: RelatedServicesModalProps) {
  const { t } = useTranslation()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'

  const [loadedServiceIds, setLoadedServiceIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) setLoadedServiceIds(new Set())
  }, [isOpen])

  const { data, isLoading } = usePaymentConceptServices({
    companyId: managementCompanyId,
    conceptId,
    enabled: isOpen,
  })

  const services = data?.data ?? []

  const totalAmount = useMemo(
    () => services.reduce((sum, s) => sum + Number(s.amount), 0),
    [services]
  )

  const formatAmount = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currencyCode}`.trim()

  const handleSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return
    setLoadedServiceIds(prev => {
      const merged = new Set(prev)

      ;(keys as Set<React.Key>).forEach(k => merged.add(String(k)))

      return merged
    })
  }

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <Wrench className="text-primary" size={18} />
          <Typography variant="h4">{t(`${d}.relatedServices`)}</Typography>
        </ModalHeader>

        <ModalBody className="pb-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-default-400 py-8 text-center">{t(`${d}.noServices`)}</p>
          ) : (
            <Accordion
              className="p-0 gap-0"
              itemClasses={{
                base: 'border border-default-200 rounded-lg mb-2 px-0',
                trigger: 'px-3 py-2 data-[hover=true]:bg-default-50 rounded-lg',
                title: 'text-sm',
                content: 'px-3 pb-3 pt-0',
              }}
              selectionMode="multiple"
              onSelectionChange={handleSelectionChange}
            >
              {services.map(service => (
                <AccordionItem
                  key={service.serviceId}
                  aria-label={service.serviceName}
                  startContent={<Receipt className="text-default-400 shrink-0" size={14} />}
                  title={
                    <div className="flex items-center justify-between w-full pr-2">
                      <div>
                        <span className="text-sm font-medium">{service.serviceName}</span>
                        <span className="text-xs text-default-400 ml-2">
                          {service.providerType === 'company'
                            ? t(`${d}.providerCompany`)
                            : t(`${d}.providerIndividual`)}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatAmount(Number(service.amount))}
                      </span>
                    </div>
                  }
                >
                  <ServiceExecutionsList
                    companyId={managementCompanyId}
                    conceptId={conceptId}
                    condominiumId={condominiumId}
                    enabled={isOpen && loadedServiceIds.has(service.serviceId)}
                    formatAmount={formatAmount}
                    serviceId={service.serviceId}
                  />
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ModalBody>

        {!isLoading && services.length > 0 && (
          <ModalFooter className="border-t border-default-200">
            <div className="flex w-full items-center justify-between">
              <Typography className="font-semibold" variant="body2">
                {t(`${d}.totalAmount`)}
              </Typography>
              <Typography className="font-semibold" variant="body2">
                {formatAmount(totalAmount)}
              </Typography>
            </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  )
}
