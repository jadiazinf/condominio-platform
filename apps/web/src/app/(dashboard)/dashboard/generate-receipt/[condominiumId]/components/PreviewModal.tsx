'use client'

import type { IPreviewResult } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'

// ─── Types ───

interface IPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previewData: IPreviewResult
  onConfirm: () => void
  isGenerating: boolean
}

type TPreviewRow = {
  id: string
  unitNumber: string
  aliquotPercentage: string
  charges: string
  total: string
}

// ─── Component ───

export function PreviewModal({
  isOpen,
  onClose,
  previewData,
  onConfirm,
  isGenerating,
}: IPreviewModalProps) {
  const { t } = useTranslation()
  const p = 'admin.receipts.generate.preview'

  const rows: TPreviewRow[] = previewData.unitPreviews.map((up) => ({
    id: up.unitId,
    unitNumber: up.unitNumber,
    aliquotPercentage: up.aliquotPercentage,
    charges: up.charges.map((c) => `${c.chargeTypeName}: ${formatAmount(c.amount)}`).join(', '),
    total: up.total,
  }))

  const columns: ITableColumn<TPreviewRow>[] = [
    { key: 'unitNumber', label: t(`${p}.unit`) },
    { key: 'aliquotPercentage', label: t(`${p}.aliquot`), width: 100 },
    { key: 'charges', label: t(`${p}.total`) },
    { key: 'total', label: t(`${p}.total`), align: 'end' as const, width: 120 },
  ]

  const renderCell = (row: TPreviewRow, key: string) => {
    switch (key) {
      case 'unitNumber':
        return <span className="font-medium">{row.unitNumber}</span>
      case 'aliquotPercentage':
        return `${row.aliquotPercentage}%`
      case 'charges':
        return <span className="text-sm text-default-500">{row.charges}</span>
      case 'total':
        return <span className="font-semibold">{formatAmount(row.total)}</span>
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <Typography variant="h3">{t(`${p}.title`)}</Typography>
        </ModalHeader>

        <ModalBody>
          <Table aria-label="preview" columns={columns} rows={rows} renderCell={renderCell} />

          <div className="mt-4 flex items-center justify-between rounded-lg bg-default-100 px-4 py-3">
            <div>
              <Typography variant="body2" color="muted">
                {t(`${p}.aliquotSum`)}: {previewData.aliquotSum}%
              </Typography>
            </div>
            <div>
              <Typography variant="h4">
                {t(`${p}.grandTotal`)}: {formatAmount(previewData.grandTotal)}
              </Typography>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t(`${p}.close`)}
          </Button>
          <Button color="primary" onPress={onConfirm} isLoading={isGenerating}>
            {t(`${p}.confirmGenerate`)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
