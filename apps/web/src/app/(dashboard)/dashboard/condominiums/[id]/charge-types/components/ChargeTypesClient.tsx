'use client'

import type { TChargeType } from '@packages/domain'

import { useState, useMemo, useCallback } from 'react'
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'
import { useQueryClient, HttpError, isApiValidationError } from '@packages/http-client'
import {
  useChargeTypes,
  useCreateChargeType,
  useUpdateChargeType,
  useDeleteChargeType,
  chargeTypeKeys,
  useChargeCategories,
} from '@packages/http-client/hooks'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Select, type ISelectItem } from '@/ui/components/select'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'

// ─── Types ──────────────────────────────────────────────────────────────────

type TCategoryColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default'

const CATEGORY_COLORS: Record<string, TCategoryColor> = {
  ordinary: 'primary',
  extraordinary: 'warning',
  reserve_fund: 'success',
  social_benefits: 'secondary',
  non_common: 'default',
  fine: 'danger',
  other: 'default',
}

interface IFormData {
  name: string
  categoryId: string
}

const INITIAL_FORM_DATA: IFormData = {
  name: '',
  categoryId: '',
}

interface ChargeTypesClientProps {
  condominiumId: string
  managementCompanyId: string
  translations: {
    title: string
    subtitle: string
    create: string
    empty: string
    emptyDescription: string
    table: {
      name: string
      category: string
      actions: string
    }
    categories: Record<string, string>
    form: {
      name: string
      namePlaceholder: string
      category: string
      categoryPlaceholder: string
      create: string
      update: string
    }
    deleteConfirm: string
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChargeTypesClient({
  condominiumId,
  translations: t,
}: ChargeTypesClientProps) {
  const formModal = useDisclosure()
  const deleteModal = useDisclosure()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<IFormData>(INITIAL_FORM_DATA)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useChargeTypes()
  const { data: categoriesData } = useChargeCategories()

  const categories = useMemo(() => (categoriesData?.data ?? []), [categoriesData])

  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; label: string }>()
    for (const cat of categories) {
      map.set(cat.id, { name: cat.name, label: cat.label ?? cat.name })
    }
    return map
  }, [categories])

  const chargeTypes = useMemo(() => {
    const all = (data?.data ?? []) as TChargeType[]
    return all.filter(ct => ct.condominiumId === condominiumId)
  }, [data, condominiumId])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: createChargeType } = useCreateChargeType()
  const { mutateAsync: updateChargeType } = useUpdateChargeType(editingId ?? '')
  const { mutateAsync: deleteChargeType } = useDeleteChargeType()

  // ─── Select items ─────────────────────────────────────────────────────────

  const categoryItems: ISelectItem[] = useMemo(
    () =>
      categories.map(cat => ({
        key: cat.id,
        label: cat.label ?? cat.name,
      })),
    [categories, t]
  )

  // ─── Table columns ───────────────────────────────────────────────────────

  const tableColumns: ITableColumn<TChargeType>[] = useMemo(
    () => [
      { key: 'name', label: t.table.name },
      { key: 'category', label: t.table.category },
      { key: 'actions', label: t.table.actions },
    ],
    [t]
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getCategoryName = useCallback(
    (categoryId: string) => categoryMap.get(categoryId)?.name ?? '',
    [categoryMap]
  )

  const getCategoryLabel = useCallback(
    (categoryId: string) => {
      const cat = categoryMap.get(categoryId)
      if (!cat) return ''
      return t.categories[cat.name] || cat.label
    },
    [categoryMap, t]
  )

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const updateFormData = useCallback((updates: Partial<IFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleOpenCreate = useCallback(() => {
    setEditingId(null)
    setFormData(INITIAL_FORM_DATA)
    setShowErrors(false)
    formModal.onOpen()
  }, [formModal])

  const handleOpenEdit = useCallback(
    (chargeType: TChargeType) => {
      setEditingId(chargeType.id)
      setFormData({
        name: chargeType.name,
        categoryId: chargeType.categoryId,
      })
      setShowErrors(false)
      formModal.onOpen()
    },
    [formModal]
  )

  const handleOpenDelete = useCallback(
    (id: string) => {
      setDeletingId(id)
      deleteModal.onOpen()
    },
    [deleteModal]
  )

  const handleClose = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setEditingId(null)
    setShowErrors(false)
    formModal.onClose()
  }, [formModal])

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.categoryId) {
      setShowErrors(true)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
      }

      if (editingId) {
        await updateChargeType(payload)
      } else {
        await createChargeType(payload)
      }

      await queryClient.invalidateQueries({ queryKey: chargeTypeKeys.all })
      handleClose()
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        const details = error.details
        if (isApiValidationError(details)) {
          const fieldMessages = details.error.fields
            .map((f: any) => f.messages.join(', '))
            .join('\n')
          toast.error(fieldMessages || error.message)
        } else {
          toast.error(error.message)
        }
      } else if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, editingId, createChargeType, updateChargeType, queryClient, handleClose, toast])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingId) return

    setIsSubmitting(true)

    try {
      await deleteChargeType({ id: deletingId })
      await queryClient.invalidateQueries({ queryKey: chargeTypeKeys.all })
      setDeletingId(null)
      deleteModal.onClose()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [deletingId, deleteChargeType, queryClient, deleteModal, toast])

  // ─── Render cell ──────────────────────────────────────────────────────────

  const renderCell = useCallback(
    (chargeType: TChargeType, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return <span className="font-medium text-sm">{chargeType.name}</span>
        case 'category': {
          const catName = getCategoryName(chargeType.categoryId)
          return (
            <Chip
              color={CATEGORY_COLORS[catName] || 'default'}
              size="sm"
              variant="flat"
            >
              {getCategoryLabel(chargeType.categoryId)}
            </Chip>
          )
        }
        case 'actions':
          return (
            <div className="flex justify-end gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => handleOpenEdit(chargeType)}
              >
                <Pencil size={14} />
              </Button>
              <Button
                isIconOnly
                color="danger"
                size="sm"
                variant="light"
                onPress={() => handleOpenDelete(chargeType.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        default:
          return null
      }
    },
    [getCategoryName, getCategoryLabel, handleOpenEdit, handleOpenDelete]
  )

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h3">{t.title}</Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {t.subtitle}
            </Typography>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
          <Typography color="danger" variant="body1">
            Error al cargar los tipos de cargo
          </Typography>
          <Button className="mt-4" color="primary" onPress={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h3">{t.title}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t.subtitle}
          </Typography>
        </div>
        <Button
          className="w-full sm:w-auto"
          color="primary"
          startContent={<Plus size={16} />}
          onPress={handleOpenCreate}
        >
          {t.create}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : chargeTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Tag className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t.empty}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t.emptyDescription}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block space-y-3 md:hidden">
            {chargeTypes.map(ct => (
              <Card key={ct.id} className="w-full">
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{ct.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleOpenEdit(ct)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        isIconOnly
                        color="danger"
                        size="sm"
                        variant="light"
                        onPress={() => handleOpenDelete(ct.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip
                      color={CATEGORY_COLORS[getCategoryName(ct.categoryId)] || 'default'}
                      size="sm"
                      variant="flat"
                    >
                      {getCategoryLabel(ct.categoryId)}
                    </Chip>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table<TChargeType>
              aria-label={t.title}
              columns={tableColumns}
              mobileCards={false}
              renderCell={renderCell}
              rows={chargeTypes}
            />
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={formModal.isOpen} size="lg" onClose={handleClose}>
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">
              {editingId ? t.form.update : t.form.create}
            </Typography>
          </ModalHeader>

          <ModalBody>
            <div className="flex flex-col gap-5">
              <Input
                isRequired
                errorMessage={showErrors && !formData.name ? 'Campo requerido' : undefined}
                isInvalid={showErrors && !formData.name}
                label={t.form.name}
                placeholder={t.form.namePlaceholder}
                value={formData.name}
                variant="bordered"
                onValueChange={v => updateFormData({ name: v })}
              />

              <Select
                isRequired
                items={categoryItems}
                label={t.form.category}
                placeholder={t.form.categoryPlaceholder}
                selectedKeys={formData.categoryId ? [formData.categoryId] : []}
                variant="bordered"
                onChange={key =>
                  key && updateFormData({ categoryId: key })
                }
              />

            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              color="primary"
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
              onPress={handleSubmit}
            >
              {editingId ? t.form.update : t.form.create}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} size="sm" onClose={() => { setDeletingId(null); deleteModal.onClose() }}>
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">Eliminar</Typography>
          </ModalHeader>
          <ModalBody>
            <Typography variant="body2">{t.deleteConfirm}</Typography>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => { setDeletingId(null); deleteModal.onClose() }}>
              Cancelar
            </Button>
            <Button
              color="danger"
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
              onPress={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
