'use client'

import { useMemo } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { Wrench } from 'lucide-react'
import { usePaymentConceptServices } from '@packages/http-client'

interface RelatedServicesModalProps {
  isOpen: boolean
  onClose: () => void
  conceptId: string
  managementCompanyId: string
  currencySymbol: string
  currencyCode: string
}

export function RelatedServicesModal({
  isOpen,
  onClose,
  conceptId,
  managementCompanyId,
  currencySymbol,
  currencyCode,
}: RelatedServicesModalProps) {
  const { t } = useTranslation()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <Wrench size={18} className="text-success" />
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
            <div className="space-y-2">
              {services.map(service => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-lg border border-default-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{service.serviceName}</p>
                    <p className="text-xs text-default-400">
                      {service.providerType === 'company' ? t(`${d}.providerCompany`) : t(`${d}.providerIndividual`)}
                    </p>
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    {formatAmount(Number(service.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ModalBody>

        {!isLoading && services.length > 0 && (
          <ModalFooter className="border-t border-default-200">
            <div className="flex w-full items-center justify-between">
              <Typography variant="body2" className="font-semibold">
                {t(`${d}.totalAmount`)}
              </Typography>
              <Typography variant="body2" className="font-semibold">
                {formatAmount(totalAmount)}
              </Typography>
            </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  )
}
