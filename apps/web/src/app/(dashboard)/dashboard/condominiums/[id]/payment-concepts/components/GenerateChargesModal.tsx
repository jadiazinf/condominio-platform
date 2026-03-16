'use client'

import { useState, useMemo } from 'react'
import { Zap } from 'lucide-react'
import { useGenerateCharges, paymentConceptKeys, useQueryClient } from '@packages/http-client'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

interface GenerateChargesModalProps {
  isOpen: boolean
  onClose: () => void
  conceptId: string
  managementCompanyId: string
}

export function GenerateChargesModal({
  isOpen,
  onClose,
  conceptId,
  managementCompanyId,
}: GenerateChargesModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const g = 'admin.condominiums.detail.paymentConcepts.generate'

  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1))

  const yearItems: ISelectItem[] = useMemo(() => {
    const year = currentDate.getFullYear()

    return [
      { key: String(year - 1), label: String(year - 1) },
      { key: String(year), label: String(year) },
      { key: String(year + 1), label: String(year + 1) },
    ]
  }, [])

  const monthItems: ISelectItem[] = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        key: String(i + 1),
        label: t(`${g}.months.${i + 1}`),
      })),
    [t]
  )

  const generateCharges = useGenerateCharges(managementCompanyId, conceptId, {
    onSuccess: data => {
      const result = data.data.data

      toast.success(
        t(`${g}.success`, {
          count: String(result.quotasCreated),
          total: result.totalAmount.toLocaleString(),
        })
      )
      queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      queryClient.invalidateQueries({ queryKey: ['quotas'] })
      onClose()
    },
    onError: () => toast.error(t(`${g}.error`)),
  })

  const handleGenerate = () => {
    generateCharges.mutate({
      periodYear: Number(selectedYear),
      periodMonth: Number(selectedMonth),
    })
  }

  const handleClose = () => {
    if (!generateCharges.isPending) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} size="sm" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Zap className="text-primary" size={18} />
          {t(`${g}.title`)}
        </ModalHeader>

        <ModalBody className="space-y-4">
          <Typography color="muted" variant="body2">
            {t(`${g}.description`)}
          </Typography>

          <div className="grid grid-cols-2 gap-4">
            <Select
              items={yearItems}
              label={t(`${g}.year`)}
              value={selectedYear}
              variant="bordered"
              onChange={key => key && setSelectedYear(key)}
            />
            <Select
              items={monthItems}
              label={t(`${g}.month`)}
              value={selectedMonth}
              variant="bordered"
              onChange={key => key && setSelectedMonth(key)}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button isDisabled={generateCharges.isPending} variant="flat" onPress={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            color="primary"
            isLoading={generateCharges.isPending}
            startContent={!generateCharges.isPending ? <Zap size={14} /> : undefined}
            onPress={handleGenerate}
          >
            {generateCharges.isPending ? t(`${g}.generating`) : t(`${g}.generate`)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
