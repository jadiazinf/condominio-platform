'use client'

import { useMemo } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Accordion, AccordionItem } from '@/ui/components/accordion'
import { FileText, ImageIcon, ExternalLink } from 'lucide-react'
import { useReserveFundExpenseDetail } from '@packages/http-client/hooks'
import type { TDocument, TCondominiumService } from '@packages/domain'
import { formatFileSize } from '@packages/domain'
import type { TExpensesTranslations } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExpenseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string | null
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null }>
  translations: TExpensesTranslations['detail']
}

interface IVendorMetadata {
  type?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

interface IExpenseMetadata {
  fundSource?: string
  serviceIds?: string[] | null
  vendor?: IVendorMetadata | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expenseId,
  managementCompanyId,
  currencies,
  translations: t,
}: ExpenseDetailModalProps) {
  const { data, isLoading } = useReserveFundExpenseDetail({
    companyId: managementCompanyId,
    expenseId: expenseId ?? '',
    enabled: !!expenseId && isOpen,
  })

  const expense = data?.data ?? null
  const documents: TDocument[] = expense?.documents ?? []
  const services: TCondominiumService[] = expense?.services ?? []
  const metadata = (expense?.metadata ?? null) as IExpenseMetadata | null

  // Parse name and description from the combined description field
  const { name, description } = useMemo(() => {
    if (!expense?.description) return { name: '', description: '' }
    const newlineIndex = expense.description.indexOf('\n')
    if (newlineIndex === -1) return { name: expense.description, description: '' }
    return {
      name: expense.description.slice(0, newlineIndex),
      description: expense.description.slice(newlineIndex + 1),
    }
  }, [expense?.description])

  // Resolve currency
  const currencyDisplay = useMemo(() => {
    if (!expense?.currencyId) return ''
    const cur = currencies.find(c => c.id === expense.currencyId)
    return cur ? `${cur.symbol ?? ''} ${cur.code}`.trim() : ''
  }, [expense?.currencyId, currencies])

  // Format amount
  const formattedAmount = useMemo(() => {
    if (!expense?.amount) return '0,00'
    return parseFloat(expense.amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [expense?.amount])

  // Format date
  const formattedDate = useMemo(() => {
    if (!expense?.expenseDate) return '-'
    return new Date(expense.expenseDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }, [expense?.expenseDate])

  // Format created at
  const formattedCreatedAt = useMemo(() => {
    if (!expense?.createdAt) return '-'
    return new Date(expense.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [expense?.createdAt])

  // Vendor info
  const hasVendor = !!(expense?.vendorName || expense?.vendorTaxId || metadata?.vendor)
  const vendorMeta = metadata?.vendor

  // Translate provider type
  const translateProviderType = (type: string): string => {
    const key = type as keyof typeof t.providerTypes
    return t.providerTypes[key] ?? type
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t.title}</Typography>
        </ModalHeader>

        <ModalBody className="pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !expense ? (
            <Typography color="muted" className="py-8 text-center">
              Not found
            </Typography>
          ) : (
            <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={['chargeInfo', 'vendorInfo', 'documents']}>
              {/* ── Charge Info ── */}
              <AccordionItem
                key="chargeInfo"
                aria-label={t.chargeInfo}
                title={<span className="text-sm font-semibold">{t.chargeInfo}</span>}
              >
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm pb-2">
                  <span className="text-default-500">{t.name}:</span>
                  <span className="font-medium">{name}</span>

                  {description && (
                    <>
                      <span className="text-default-500">{t.description}:</span>
                      <span className="whitespace-pre-line">{description}</span>
                    </>
                  )}

                  <span className="text-default-500">{t.amount}:</span>
                  <span className="font-medium">{currencyDisplay} {formattedAmount}</span>

                  <span className="text-default-500">{t.date}:</span>
                  <span>{formattedDate}</span>

                  {(expense.invoiceNumber || expense.notes) && (
                    <>
                      {expense.invoiceNumber && (
                        <>
                          <span className="text-default-500">{t.invoiceNumber}:</span>
                          <span>{expense.invoiceNumber}</span>
                        </>
                      )}
                      {expense.notes && (
                        <>
                          <span className="text-default-500">{t.notes}:</span>
                          <span className="whitespace-pre-line">{expense.notes}</span>
                        </>
                      )}
                    </>
                  )}

                  <span className="text-default-500">{t.createdAt}:</span>
                  <span className="text-default-400">{formattedCreatedAt}</span>
                </div>
              </AccordionItem>

              {/* ── Vendor Info ── */}
              <AccordionItem
                key="vendorInfo"
                aria-label={t.vendorInfo}
                title={<span className="text-sm font-semibold">{t.vendorInfo}</span>}
              >
                {services.length > 0 ? (
                  <div className="space-y-3 pb-2">
                    <span className="text-sm text-default-500 block">{t.linkedServices}:</span>
                    {services.map(service => (
                      <div key={service.id} className="rounded-lg bg-default-100 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{service.name}</span>
                          <Chip variant="flat" size="sm" color="primary">
                            {translateProviderType(service.providerType)}
                          </Chip>
                        </div>
                        {service.legalName && (
                          <p className="text-xs text-default-500">{service.legalName}</p>
                        )}
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                          {service.taxIdNumber && (
                            <>
                              <span className="text-default-500">{t.vendorTaxId}:</span>
                              <span>{service.taxIdType ? `${service.taxIdType}-${service.taxIdNumber}` : service.taxIdNumber}</span>
                            </>
                          )}
                          {service.phone && (
                            <>
                              <span className="text-default-500">{t.vendorPhone}:</span>
                              <span>{service.phoneCountryCode ? `${service.phoneCountryCode} ` : ''}{service.phone}</span>
                            </>
                          )}
                          {service.email && (
                            <>
                              <span className="text-default-500">{t.vendorEmail}:</span>
                              <span>{service.email}</span>
                            </>
                          )}
                          {service.address && (
                            <>
                              <span className="text-default-500">{t.vendorAddress}:</span>
                              <span>{service.address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasVendor ? (
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm pb-2">
                    {vendorMeta?.type && (
                      <>
                        <span className="text-default-500">{t.vendorType}:</span>
                        <span>{translateProviderType(vendorMeta.type)}</span>
                      </>
                    )}
                    {expense.vendorName && (
                      <>
                        <span className="text-default-500">{t.vendorName}:</span>
                        <span>{expense.vendorName}</span>
                      </>
                    )}
                    {expense.vendorTaxId && (
                      <>
                        <span className="text-default-500">{t.vendorTaxId}:</span>
                        <span>{expense.vendorTaxId}</span>
                      </>
                    )}
                    {vendorMeta?.phone && (
                      <>
                        <span className="text-default-500">{t.vendorPhone}:</span>
                        <span>{vendorMeta.phone}</span>
                      </>
                    )}
                    {vendorMeta?.email && (
                      <>
                        <span className="text-default-500">{t.vendorEmail}:</span>
                        <span>{vendorMeta.email}</span>
                      </>
                    )}
                    {vendorMeta?.address && (
                      <>
                        <span className="text-default-500">{t.vendorAddress}:</span>
                        <span>{vendorMeta.address}</span>
                      </>
                    )}
                  </div>
                ) : (
                  <Typography variant="body2" color="muted" className="pb-2">
                    {t.noVendor}
                  </Typography>
                )}
              </AccordionItem>

              {/* ── Documents ── */}
              <AccordionItem
                key="documents"
                aria-label={t.documents}
                title={<span className="text-sm font-semibold">{t.documents}</span>}
              >
                {documents.length > 0 ? (
                  <div className="space-y-2 pb-2">
                    {documents.map(doc => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg bg-default-100 p-3 transition-colors hover:bg-default-200"
                      >
                        {doc.fileType?.startsWith('image/') ? (
                          <ImageIcon size={18} className="text-primary shrink-0" />
                        ) : (
                          <FileText size={18} className="text-warning shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.fileName ?? doc.title}
                          </p>
                          {doc.fileSize && (
                            <p className="text-xs text-default-400">
                              {formatFileSize(doc.fileSize)}
                            </p>
                          )}
                        </div>
                        <ExternalLink size={14} className="text-default-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <Typography variant="body2" color="muted" className="pb-2">
                    {t.noDocs}
                  </Typography>
                )}
              </AccordionItem>
            </Accordion>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
