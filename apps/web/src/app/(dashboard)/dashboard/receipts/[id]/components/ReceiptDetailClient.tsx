'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ban, Download, Send, Info } from 'lucide-react'
import {
  useReceiptDetail,
  useVoidReceipt,
  useSendReceipt,
  useDownloadReceiptPdf,
  receiptKeys,
} from '@packages/http-client'
import { useQueryClient } from '@tanstack/react-query'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IService {
  id: string
  serviceName: string
  amount: string
}

interface IQuota {
  id: string
  baseAmount: string
  interestAmount: string
  status: string
  paymentConcept?: { name: string; conceptType: string | null }
  services?: IService[]
}

interface ITranslations {
  title: string
  back: string
  receiptNumber: string
  period: string
  status: string
  unitAliquot: string
  generatedAt: string
  amounts: {
    ordinary: string
    extraordinary: string
    reserveFund: string
    interest: string
    fines: string
    previousBalance: string
    total: string
  }
  breakdown?: {
    title: string
    item: string
    amount: string
  }
  statuses: Record<string, string>
  void: string
  voidConfirm: string
  downloadPdf: string
  sendEmail: string
  sendEmailSuccess: string
  loading: string
  notFound: string
  infoModal?: {
    button: string
    title: string
    intro: string
    conceptsTitle: string
    conceptsBody: string
    formulasTitle: string
    formulaFixed: string
    formulaAliquot: string
    formulaPerUnit: string
    breakdownTitle: string
    breakdownBody: string
    summaryTitle: string
    summaryOrdinary: string
    summaryExtraordinary: string
    summaryReserve: string
    summaryInterest: string
    summaryFines: string
    summaryPrevBalance: string
    summaryTotal: string
    interestTitle: string
    interestBody: string
    close: string
  }
}

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'danger'> = {
  draft: 'default',
  generated: 'primary',
  sent: 'success',
  voided: 'danger',
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function formatPeriod(month: number, year: number): string {
  return `${MONTH_NAMES_ES[month - 1] ?? month} ${year}`
}

function formatDateEs(dateStr: string | Date): string {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr)

  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatAliquot(value: string | number | null | undefined): string {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) return '—'

  return `${num.toFixed(2)}%`
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ReceiptDetailClient({
  id,
  translations: t,
}: {
  id: string
  translations: ITranslations
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const { data, isLoading } = useReceiptDetail(id)
  const receipt = data?.data

  const { mutate: voidReceipt, isPending: isVoiding } = useVoidReceipt({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all })
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(id) })
    },
  })

  const { download: downloadPdf, isDownloading } = useDownloadReceiptPdf()

  const { mutate: sendReceipt, isPending: isSending } = useSendReceipt({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(id) })
      if (t.sendEmailSuccess) alert(t.sendEmailSuccess)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <Typography className="ml-3" color="muted">
          {t.loading}
        </Typography>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <Typography color="muted">{t.notFound}</Typography>
      </div>
    )
  }

  const handleVoid = () => {
    if (confirm(t.voidConfirm)) {
      voidReceipt({ id: receipt.id })
    }
  }

  const quotas = (receipt as Record<string, unknown>).quotas as IQuota[] | undefined
  const cs = ((receipt as Record<string, unknown>).currencySymbol as string) ?? ''

  // Build breakdown items: each quota's concept name + base amount,
  // plus each service linked to the concept with its amount
  const breakdownItems: Array<{ label: string; amount: string; sub?: boolean }> = []

  if (quotas?.length) {
    for (const quota of quotas) {
      const conceptName = quota.paymentConcept?.name ?? '—'

      breakdownItems.push({ label: conceptName, amount: quota.baseAmount })
      if (quota.services?.length) {
        for (const svc of quota.services) {
          breakdownItems.push({ label: svc.serviceName, amount: svc.amount, sub: true })
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button isIconOnly variant="light" onPress={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Typography variant="h2">{t.title}</Typography>
            <Typography color="muted">{receipt.receiptNumber}</Typography>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {t.infoModal && (
            <Button
              isIconOnly
              aria-label={t.infoModal.button}
              className="hidden sm:flex"
              variant="light"
              onPress={() => setIsInfoOpen(true)}
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
          {t.infoModal && (
            <Button
              className="w-full sm:hidden"
              startContent={<Info className="h-4 w-4" />}
              variant="light"
              onPress={() => setIsInfoOpen(true)}
            >
              {t.infoModal.button}
            </Button>
          )}
          {t.downloadPdf && (
            <Button
              className="w-full sm:w-auto"
              isLoading={isDownloading}
              startContent={<Download className="h-4 w-4" />}
              variant="flat"
              onPress={() => downloadPdf(receipt.id)}
            >
              {t.downloadPdf}
            </Button>
          )}
          {t.sendEmail && receipt.status !== 'voided' && (
            <Button
              className="w-full sm:w-auto"
              color="primary"
              isLoading={isSending}
              startContent={<Send className="h-4 w-4" />}
              variant="flat"
              onPress={() => sendReceipt({ id: receipt.id })}
            >
              {t.sendEmail}
            </Button>
          )}
          {receipt.status !== 'voided' && t.void && (
            <Button
              className="w-full sm:w-auto"
              color="danger"
              isLoading={isVoiding}
              startContent={<Ban className="h-4 w-4" />}
              variant="flat"
              onPress={handleVoid}
            >
              {t.void}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <Typography color="muted" variant="caption">
            {t.status}
          </Typography>
          <div className="mt-1">
            <Chip color={STATUS_CHIP_COLOR[receipt.status] ?? 'default'}>
              {t.statuses[receipt.status] ?? receipt.status}
            </Chip>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <Typography color="muted" variant="caption">
            {t.period}
          </Typography>
          <Typography className="mt-1" variant="h4">
            {formatPeriod(receipt.periodMonth, receipt.periodYear)}
          </Typography>
        </div>
        <div className="rounded-lg border p-4">
          <Typography color="muted" variant="caption">
            {t.unitAliquot}
          </Typography>
          <Typography className="mt-1" variant="h4">
            {formatAliquot(receipt.unitAliquot)}
          </Typography>
        </div>
        <div className="rounded-lg border p-4">
          <Typography color="muted" variant="caption">
            {t.generatedAt}
          </Typography>
          <Typography className="mt-1" variant="h4">
            {receipt.generatedAt ? formatDateEs(receipt.generatedAt) : '—'}
          </Typography>
        </div>
      </div>

      {/* Period Breakdown — shows what the resident is paying for this month */}
      {t.breakdown && breakdownItems.length > 0 && (
        <div className="rounded-lg border p-4">
          <Typography className="mb-3" variant="subtitle1">
            {t.breakdown.title}
          </Typography>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium">{t.breakdown.item}</th>
                  <th className="pb-2 font-medium text-right">{t.breakdown.amount}</th>
                </tr>
              </thead>
              <tbody>
                {breakdownItems.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className={`py-2 pr-4 ${item.sub ? 'pl-6' : ''}`}>
                      {item.sub ? (
                        <Typography color="muted" variant="caption">
                          {item.label}
                        </Typography>
                      ) : (
                        <Typography variant="body2">{item.label}</Typography>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <Typography
                        color={item.sub ? 'muted' : undefined}
                        variant={item.sub ? 'caption' : 'body2'}
                      >
                        <ConvertedAmount amount={item.amount} currencySymbol={cs} />
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Amounts Summary */}
      <div className="rounded-lg border p-4">
        <div className="space-y-2">
          {[
            { label: t.amounts.ordinary, value: receipt.ordinaryAmount },
            { label: t.amounts.extraordinary, value: receipt.extraordinaryAmount },
            { label: t.amounts.reserveFund, value: receipt.reserveFundAmount },
            { label: t.amounts.interest, value: receipt.interestAmount },
            { label: t.amounts.fines, value: receipt.finesAmount },
            { label: t.amounts.previousBalance, value: receipt.previousBalance },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <Typography color="muted">{label}</Typography>
              <Typography>
                <ConvertedAmount amount={value} currencySymbol={cs} />
              </Typography>
            </div>
          ))}
          <hr className="my-2" />
          <div className="flex justify-between">
            <Typography variant="subtitle1">{t.amounts.total}</Typography>
            <Typography variant="subtitle1">
              <ConvertedAmount amount={receipt.totalAmount} currencySymbol={cs} />
            </Typography>
          </div>
        </div>
      </div>

      {/* Info Modal — explains how receipts are generated */}
      {t.infoModal && (
        <Modal isOpen={isInfoOpen} scrollBehavior="inside" size="2xl" onOpenChange={setIsInfoOpen}>
          <ModalContent>
            {onClose => (
              <>
                <ModalHeader>
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <Typography variant="h3">{t.infoModal!.title}</Typography>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-5">
                    <Typography>{t.infoModal!.intro}</Typography>

                    {/* Payment Concepts */}
                    <div>
                      <Typography className="mb-1" variant="subtitle1">
                        {t.infoModal!.conceptsTitle}
                      </Typography>
                      <Typography color="muted">{t.infoModal!.conceptsBody}</Typography>
                    </div>

                    {/* Formula Types */}
                    <div>
                      <Typography className="mb-1" variant="subtitle1">
                        {t.infoModal!.formulasTitle}
                      </Typography>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <Typography color="muted">{t.infoModal!.formulaFixed}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.formulaAliquot}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.formulaPerUnit}</Typography>
                        </li>
                      </ul>
                    </div>

                    {/* Period Breakdown */}
                    <div>
                      <Typography className="mb-1" variant="subtitle1">
                        {t.infoModal!.breakdownTitle}
                      </Typography>
                      <Typography color="muted">{t.infoModal!.breakdownBody}</Typography>
                    </div>

                    {/* Amounts Summary */}
                    <div>
                      <Typography className="mb-1" variant="subtitle1">
                        {t.infoModal!.summaryTitle}
                      </Typography>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <Typography color="muted">{t.infoModal!.summaryOrdinary}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.summaryExtraordinary}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.summaryReserve}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.summaryInterest}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.summaryFines}</Typography>
                        </li>
                        <li>
                          <Typography color="muted">{t.infoModal!.summaryPrevBalance}</Typography>
                        </li>
                      </ul>
                      <Typography className="mt-2">{t.infoModal!.summaryTotal}</Typography>
                    </div>

                    {/* Interest */}
                    <div>
                      <Typography className="mb-1" variant="subtitle1">
                        {t.infoModal!.interestTitle}
                      </Typography>
                      <Typography color="muted">{t.infoModal!.interestBody}</Typography>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" onPress={onClose}>
                    {t.infoModal!.close}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}
