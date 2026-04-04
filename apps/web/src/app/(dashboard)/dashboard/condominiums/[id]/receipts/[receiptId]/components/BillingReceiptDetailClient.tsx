'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ban, Download } from 'lucide-react'
import {
  useBillingReceiptDetail,
  useVoidBillingReceipt,
  useDownloadBillingReceiptPdf,
  billingReceiptKeys,
} from '@packages/http-client'
import { useQueryClient } from '@tanstack/react-query'
import { formatAmount } from '@packages/utils/currency'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Textarea } from '@/ui/components/textarea'
import { Checkbox } from '@/ui/components/checkbox'
import { Link } from '@/ui/components/link'

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  draft: 'default',
  issued: 'primary',
  paid: 'success',
  partial: 'warning',
  voided: 'danger',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  paid: 'Pagado',
  partial: 'Parcial',
  voided: 'Anulado',
}

const MONTHS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function BillingReceiptDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [generateReplacement, setGenerateReplacement] = useState(false)
  const [voidSuccess, setVoidSuccess] = useState(false)

  const { data, isLoading } = useBillingReceiptDetail(id)
  const receipt = data?.data

  const { download: downloadPdf, isDownloading } = useDownloadBillingReceiptPdf()

  const { mutate: voidReceipt, isPending: isVoiding } = useVoidBillingReceipt(id, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingReceiptKeys.all })
      if (generateReplacement) {
        setVoidSuccess(true)
      } else {
        setIsVoidModalOpen(false)
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <Typography color="muted">Recibo no encontrado</Typography>
      </div>
    )
  }

  const handleVoid = () => {
    if (voidReason.length < 10) return
    voidReceipt({ voidReason })
  }

  const amountRows = [
    { label: 'Subtotal', value: receipt.subtotal },
    { label: 'Fondo de Reserva', value: receipt.reserveFundAmount },
    { label: 'Saldo Anterior', value: receipt.previousBalance },
    { label: 'Intereses', value: receipt.interestAmount },
    { label: 'Recargo por Mora', value: receipt.lateFeeAmount },
    { label: 'Descuento', value: receipt.discountAmount, isDiscount: true },
  ].filter(row => parseFloat(row.value) !== 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button isIconOnly variant="light" onPress={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Typography variant="h2">Detalle de Recibo</Typography>
            <Typography color="muted" className="font-mono">{receipt.receiptNumber}</Typography>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="flat"
            isLoading={isDownloading}
            startContent={<Download className="h-4 w-4" />}
            onPress={() => downloadPdf(id)}
          >
            Descargar PDF
          </Button>
          {receipt.status !== 'voided' && (
            <Button
              color="danger"
              variant="flat"
              startContent={<Ban className="h-4 w-4" />}
              onPress={() => setIsVoidModalOpen(true)}
            >
              Anular Recibo
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="p-4">
          <Typography variant="caption" color="muted">Estado</Typography>
          <div className="mt-1">
            <Chip color={STATUS_COLORS[receipt.status] ?? 'default'}>
              {STATUS_LABELS[receipt.status] ?? receipt.status}
            </Chip>
          </div>
        </Card>
        <Card className="p-4">
          <Typography variant="caption" color="muted">Período</Typography>
          <Typography className="mt-1 text-lg font-semibold">
            {MONTHS[receipt.periodMonth]} {receipt.periodYear}
          </Typography>
        </Card>
        <Card className="p-4">
          <Typography variant="caption" color="muted">Vencimiento</Typography>
          <Typography className="mt-1 text-lg font-semibold">
            {receipt.dueDate ?? '—'}
          </Typography>
        </Card>
        <Card className="p-4">
          <Typography variant="caption" color="muted">Total a Pagar</Typography>
          <Typography className="mt-1 text-xl font-bold text-primary">
            {formatAmount(receipt.totalAmount)}
          </Typography>
        </Card>
      </div>

      {/* Void reason banner */}
      {receipt.status === 'voided' && receipt.voidReason && (
        <Card className="border-danger-200 bg-danger-50 p-4">
          <Typography variant="caption" color="muted">Razón de anulación</Typography>
          <Typography className="mt-1">{receipt.voidReason}</Typography>
        </Card>
      )}

      {/* Replacement chain */}
      {receipt.replacesReceiptId && (
        <Card className="border-warning-200 bg-warning-50 p-4">
          <Typography variant="caption" color="muted">
            Este recibo reemplaza a un recibo anulado
          </Typography>
        </Card>
      )}

      {/* Amounts Breakdown */}
      <Card className="p-4">
        <Typography variant="h3" className="mb-4">Desglose de Montos</Typography>
        <div className="space-y-2">
          {amountRows.map(({ label, value, isDiscount }) => (
            <div key={label} className="flex justify-between">
              <Typography color="muted">{label}</Typography>
              <Typography className={isDiscount ? 'text-green-600' : ''}>
                {isDiscount ? '-' : ''}{formatAmount(value)}
              </Typography>
            </div>
          ))}
          <hr className="my-2" />
          <div className="flex justify-between">
            <Typography className="font-semibold">Total</Typography>
            <Typography className="text-lg font-bold">
              {formatAmount(receipt.totalAmount)}
            </Typography>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {receipt.notes && (
        <Card className="p-4">
          <Typography variant="caption" color="muted">Notas</Typography>
          <Typography className="mt-1">{receipt.notes}</Typography>
        </Card>
      )}

      {/* Void Modal */}
      <Modal
        isOpen={isVoidModalOpen}
        onOpenChange={(open) => {
          setIsVoidModalOpen(open)
          if (!open) {
            setVoidSuccess(false)
            setGenerateReplacement(false)
          }
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Anular Recibo</ModalHeader>
              <ModalBody>
                {voidSuccess ? (
                  <div className="space-y-4 text-center">
                    <Typography className="text-green-600 font-semibold">
                      Recibo anulado exitosamente
                    </Typography>
                    <Typography>
                      Puedes generar un recibo de reemplazo para la misma unidad y período.
                    </Typography>
                    <Link
                      href={`/dashboard/billing-receipts/create?replacesReceiptId=${id}&unitId=${receipt.unitId}&periodMonth=${receipt.periodMonth}&periodYear=${receipt.periodYear}`}
                      color="primary"
                    >
                      Generar recibo de reemplazo
                    </Link>
                  </div>
                ) : (
                  <>
                    <Typography className="mb-4">
                      Esta acción anulará el recibo <strong>{receipt.receiptNumber}</strong> y
                      revertirá todos los cargos asociados. Esta acción no se puede deshacer.
                    </Typography>
                    <Textarea
                      label="Razón de anulación"
                      placeholder="Ingresa la razón (mínimo 10 caracteres)"
                      value={voidReason}
                      onValueChange={setVoidReason}
                      minRows={3}
                    />
                    <Checkbox
                      isSelected={generateReplacement}
                      onValueChange={setGenerateReplacement}
                      className="mt-3"
                    >
                      Generar recibo de reemplazo
                    </Checkbox>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {voidSuccess ? (
                  <Button variant="light" onPress={onClose}>Cerrar</Button>
                ) : (
                  <>
                    <Button variant="light" onPress={onClose}>Cancelar</Button>
                    <Button
                      color="danger"
                      isLoading={isVoiding}
                      isDisabled={voidReason.length < 10}
                      onPress={handleVoid}
                    >
                      Anular
                    </Button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
