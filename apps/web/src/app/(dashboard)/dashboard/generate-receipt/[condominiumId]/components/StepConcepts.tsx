'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { Plus, Trash2, Info, Upload, Paperclip, X } from 'lucide-react'
import { useCreateChargeType, useChargeCategories } from '@packages/http-client'
import { useQueryClient } from '@tanstack/react-query'
import type { TGenerateReceiptForm } from '../GenerateReceiptsClient'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

import type { ISelectItem } from '@/ui/components/select'
import { Select } from '@/ui/components/select'
import { Input, CurrencyInput } from '@/ui/components/input'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Card } from '@/ui/components/card'

// ─── LPH Required Concepts ───
// Art. 14 LPH: El recibo debe detallar los gastos comunes del período
const LPH_REQUIRED_CONCEPTS = [
  'Administración',
  'Fondo de Reserva',
]

// ─── Props ───

interface IStepConceptsProps {
  chargeTypeItems: ISelectItem[]
  currencySymbol: string
  conceptFiles: Map<number, File>
  onConceptFileChange: (index: number, file: File | null) => void
}

// ─── Component ───

export function StepConcepts({
  chargeTypeItems,
  currencySymbol,
  conceptFiles,
  onConceptFileChange,
}: IStepConceptsProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const p = 'admin.receipts.generate'
  const { control, watch, setValue, formState: { errors } } = useFormContext<TGenerateReceiptForm>()

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'concepts',
  })

  const concepts = watch('concepts')
  const runningTotal = concepts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  // ─── Auto-populate with LPH required concepts ───
  useEffect(() => {
    if (chargeTypeItems.length > 0 && concepts.length === 1 && !concepts[0].chargeTypeId) {
      const lphConcepts = LPH_REQUIRED_CONCEPTS
        .map(name => chargeTypeItems.find(ct => ct.label.toLowerCase() === name.toLowerCase()))
        .filter(Boolean)
        .map(ct => ({ chargeTypeId: ct!.key, amount: '', description: '' }))

      if (lphConcepts.length > 0) {
        replace(lphConcepts)
      }
    }
  }, [chargeTypeItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch charge categories from API (labels resolved by API based on Accept-Language) ───
  const { data: categoriesData } = useChargeCategories()
  const categoryItems: ISelectItem[] = useMemo(() => {
    const cats = categoriesData?.data ?? []
    return cats.map((cat: any) => ({
      key: cat.id,
      label: cat.label ?? cat.name,
    }))
  }, [categoriesData])

  // ─── Quick Create Concept Modal ───
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newConceptName, setNewConceptName] = useState('')
  const [newConceptCategoryId, setNewConceptCategoryId] = useState('')

  // Set default category when categories load
  useEffect(() => {
    if (categoryItems.length > 0 && !newConceptCategoryId) {
      setNewConceptCategoryId(categoryItems[0].key)
    }
  }, [categoryItems, newConceptCategoryId])

  const { mutate: createChargeType, isPending: isCreating } = useCreateChargeType({
    onSuccess: () => {
      toast.success(t(`${p}.conceptCreated`))
      setShowCreateModal(false)
      setNewConceptName('')
      setNewConceptCategoryId(categoryItems[0]?.key ?? '')
      queryClient.invalidateQueries({ queryKey: ['monthly-billing'] })
      queryClient.invalidateQueries({ queryKey: ['charge-types'] })
    },
    onError: () => {
      toast.error(t(`${p}.conceptCreateError`))
    },
  })

  const handleCreateConcept = () => {
    if (!newConceptName.trim() || !newConceptCategoryId) return
    createChargeType({
      name: newConceptName.trim(),
      categoryId: newConceptCategoryId,
    })
  }

  const handleFileSelect = (index: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      onConceptFileChange(index, file)
      // Store the file name in form state for display in review step
      setValue(`concepts.${index}.documentFileName`, file.name)
      setValue(`concepts.${index}.documentUrl`, undefined)
      toast.success(t(`${p}.documentUploaded`))
    }
    input.click()
  }

  const handleFileRemove = (index: number) => {
    onConceptFileChange(index, null)
    setValue(`concepts.${index}.documentFileName`, undefined)
    setValue(`concepts.${index}.documentUrl`, undefined)
  }

  const handleRemoveConcept = (index: number) => {
    // Clean up file from the map when removing a concept
    onConceptFileChange(index, null)
    remove(index)
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Typography variant="h4">{t(`${p}.conceptsTitle`)}</Typography>
          <Tooltip
            showArrow
            placement="right"
            content={t(`${p}.conceptsTooltip`)}
            classNames={{ content: 'max-w-xs text-sm' }}
          >
            <button type="button" tabIndex={-1} className="inline-flex">
              <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="bordered"
            startContent={<Plus size={14} />}
            onPress={() => setShowCreateModal(true)}
          >
            {t(`${p}.createConcept`)}
          </Button>
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus size={14} />}
            onPress={() => append({ chargeTypeId: '', amount: '', description: '' })}
          >
            {t(`${p}.addConcept`)}
          </Button>
        </div>
      </div>

      {errors.concepts?.root?.message && (
        <Typography variant="body2" color="danger">
          {t(errors.concepts.root.message)}
        </Typography>
      )}

      <div className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const attachedFile = conceptFiles.get(index)

          return (
            <div
              key={field.id}
              className="flex items-start gap-4 rounded-lg border border-default-200 p-4"
            >
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <Controller
                      name={`concepts.${index}.chargeTypeId`}
                      control={control}
                      render={({ field: f, fieldState }) => {
                        // Filter out concepts already selected in other rows
                        const selectedIds = concepts
                          .map(c => c.chargeTypeId)
                          .filter((id, i) => id && i !== index)
                        const availableItems = chargeTypeItems.filter(
                          item => !selectedIds.includes(item.key)
                        )

                        return (
                          <Select
                            label={t(`${p}.concept`)}
                            placeholder={t(`${p}.conceptPlaceholder`)}
                            items={availableItems}
                            selectedKeys={f.value ? [f.value] : []}
                            onChange={(key) => key && f.onChange(key)}
                            isInvalid={!!fieldState.error}
                            errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                          />
                        )
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Controller
                      name={`concepts.${index}.amount`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <CurrencyInput
                          label={t(`${p}.amount`)}
                          value={f.value}
                          onValueChange={(val) => f.onChange(val)}
                          currencySymbol={
                            <span className="text-default-400 text-sm">{currencySymbol}</span>
                          }
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Controller
                      name={`concepts.${index}.description`}
                      control={control}
                      render={({ field: f }) => (
                        <Input
                          label={t(`${p}.description`)}
                          value={f.value ?? ''}
                          onValueChange={(val) => f.onChange(val)}
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {attachedFile ? (
                      <div className="flex items-center gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          color="success"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <span className="max-w-[120px] truncate text-xs text-default-500">
                          {attachedFile.name}
                        </span>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleFileRemove(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleFileSelect(index)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {fields.length > 1 && (
                <Button
                  isIconOnly
                  variant="light"
                  color="danger"
                  className="mt-8"
                  onPress={() => handleRemoveConcept(index)}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Running total */}
      <div className="flex justify-end rounded-lg bg-default-100 px-4 py-3">
        <Typography variant="subtitle1">
          {t(`${p}.total`)}: {currencySymbol} {runningTotal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
        </Typography>
      </div>

      {/* Create Concept Modal */}
      <Modal isOpen={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>{t(`${p}.createConceptTitle`)}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  isRequired
                  label={t(`${p}.conceptName`)}
                  placeholder={t(`${p}.conceptNamePlaceholder`)}
                  value={newConceptName}
                  onValueChange={setNewConceptName}
                />
                <Select
                  isRequired
                  items={categoryItems}
                  label={t(`${p}.conceptCategory`)}
                  selectedKeys={newConceptCategoryId ? [newConceptCategoryId] : []}
                  onChange={(key) => key && setNewConceptCategoryId(key)}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  isDisabled={!newConceptName.trim() || !newConceptCategoryId}
                  isLoading={isCreating}
                  onPress={handleCreateConcept}
                >
                  {t(`${p}.create`)}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  )
}
