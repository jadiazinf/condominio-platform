'use client'

import type { TAssemblyMinute } from '@packages/domain'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollText, Plus, ChevronRight, Upload, X, FileText } from 'lucide-react'
import { useQueryClient, HttpError, isApiValidationError } from '@packages/http-client'
import {
  useAssemblyMinutes,
  useCreateAssemblyMinute,
  assemblyMinuteKeys,
} from '@packages/http-client/hooks'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
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
import { getFirebaseStorage } from '@/libs/firebase/config'

// ─── Types ──────────────────────────────────────────────────────────────────

type TStatusColor = 'default' | 'success' | 'danger'
type TTypeColor = 'primary' | 'warning'

const STATUS_COLORS: Record<string, TStatusColor> = {
  draft: 'default',
  approved: 'success',
  voided: 'danger',
}

const TYPE_COLORS: Record<string, TTypeColor> = {
  ordinary: 'primary',
  extraordinary: 'warning',
}

interface IFormData {
  title: string
  assemblyType: 'ordinary' | 'extraordinary'
  assemblyDate: string
  assemblyLocation: string
  quorumPercentage: string
  attendeesCount: string
  totalUnits: string
  agenda: string
  notes: string
  status: 'draft' | 'approved'
}

const INITIAL_FORM_DATA: IFormData = {
  title: '',
  assemblyType: 'ordinary',
  assemblyDate: '',
  assemblyLocation: '',
  quorumPercentage: '',
  attendeesCount: '',
  totalUnits: '',
  agenda: '',
  notes: '',
  status: 'draft',
}

interface AssemblyMinutesListClientProps {
  condominiumId: string
  managementCompanyId: string
  translations: {
    title: string
    subtitle: string
    addMinute: string
    empty: string
    emptyDescription: string
    table: {
      title: string
      type: string
      date: string
      quorum: string
      status: string
    }
    types: {
      ordinary: string
      extraordinary: string
    }
    status: {
      draft: string
      approved: string
      voided: string
    }
    form: {
      createTitle: string
      title: string
      titlePlaceholder: string
      assemblyType: string
      assemblyDate: string
      assemblyLocation: string
      assemblyLocationPlaceholder: string
      quorumPercentage: string
      attendeesCount: string
      totalUnits: string
      agenda: string
      agendaPlaceholder: string
      notes: string
      notesPlaceholder: string
      document: string
      documentHint: string
      status: string
      create: string
      creating: string
      success: string
    }
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AssemblyMinutesListClient({
  condominiumId,
  translations: t,
}: AssemblyMinutesListClientProps) {
  const createModal = useDisclosure()
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<IFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  // Document upload state
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useAssemblyMinutes()

  const minutes = useMemo(() => {
    const allMinutes = (data?.data ?? []) as TAssemblyMinute[]

    return allMinutes.filter(m => m.condominiumId === condominiumId)
  }, [data, condominiumId])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: createMinute } = useCreateAssemblyMinute()

  // ─── Select items ─────────────────────────────────────────────────────────

  const typeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'ordinary', label: t.types.ordinary },
      { key: 'extraordinary', label: t.types.extraordinary },
    ],
    [t]
  )

  const statusItems: ISelectItem[] = useMemo(
    () => [
      { key: 'draft', label: t.status.draft },
      { key: 'approved', label: t.status.approved },
    ],
    [t]
  )

  // ─── Table columns ───────────────────────────────────────────────────────

  const tableColumns: ITableColumn<TAssemblyMinute>[] = useMemo(
    () => [
      { key: 'title', label: t.table.title },
      { key: 'assemblyType', label: t.table.type },
      { key: 'assemblyDate', label: t.table.date },
      { key: 'quorumPercentage', label: t.table.quorum },
      { key: 'status', label: t.table.status },
      { key: 'actions', label: '' },
    ],
    [t]
  )

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const updateFormData = useCallback((updates: Partial<IFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleRowClick = useCallback(
    (minute: TAssemblyMinute) => {
      router.push(`/dashboard/condominiums/${condominiumId}/assembly-minutes/${minute.id}`)
    },
    [router, condominiumId]
  )

  const handleClose = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowErrors(false)
    setDocumentFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    createModal.onClose()
  }, [createModal])

  const uploadDocument = useCallback(
    async (file: File): Promise<{ url: string; fileName: string } | null> => {
      try {
        const storage = getFirebaseStorage()
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `assembly-minutes/${condominiumId}/${crypto.randomUUID()}_${safeFileName}`
        const storageRef = ref(storage, storagePath)

        setIsUploading(true)
        setUploadProgress(0)

        const uploadTask = uploadBytesResumable(storageRef, file)

        return await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            snapshot => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              )

              setUploadProgress(progress)
            },
            error => {
              setIsUploading(false)
              reject(error)
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

                setIsUploading(false)
                resolve({ url: downloadURL, fileName: file.name })
              } catch (err) {
                setIsUploading(false)
                reject(err)
              }
            }
          )
        })
      } catch {
        setIsUploading(false)

        return null
      }
    },
    [condominiumId]
  )

  const handleSubmit = useCallback(async () => {
    if (!formData.title || !formData.assemblyDate) {
      setShowErrors(true)

      return
    }

    setIsSubmitting(true)

    try {
      let documentUrl: string | null = null
      let documentFileName: string | null = null

      if (documentFile) {
        const result = await uploadDocument(documentFile)

        if (result) {
          documentUrl = result.url
          documentFileName = result.fileName
        }
      }

      await createMinute({
        title: formData.title,
        assemblyType: formData.assemblyType,
        assemblyDate: formData.assemblyDate,
        assemblyLocation: formData.assemblyLocation || null,
        quorumPercentage: formData.quorumPercentage || null,
        attendeesCount: formData.attendeesCount ? Number(formData.attendeesCount) : null,
        totalUnits: formData.totalUnits ? Number(formData.totalUnits) : null,
        agenda: formData.agenda || null,
        notes: formData.notes || null,
        documentUrl,
        documentFileName,
        status: formData.status,
      })

      await queryClient.invalidateQueries({ queryKey: assemblyMinuteKeys.all })
      toast.success(t.form.success)
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
  }, [formData, documentFile, createMinute, queryClient, handleClose, toast, t, uploadDocument])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (file) {
      setDocumentFile(file)
    }
  }, [])

  const handleRemoveFile = useCallback(() => {
    setDocumentFile(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // ─── Render cell ──────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const renderCell = useCallback(
    (minute: TAssemblyMinute, columnKey: string) => {
      switch (columnKey) {
        case 'title':
          return <span className="font-medium text-sm">{minute.title}</span>
        case 'assemblyType':
          return (
            <Chip
              color={TYPE_COLORS[minute.assemblyType] || 'primary'}
              size="sm"
              variant="flat"
            >
              {t.types[minute.assemblyType as keyof typeof t.types] || minute.assemblyType}
            </Chip>
          )
        case 'assemblyDate':
          return <span className="text-sm">{formatDate(minute.assemblyDate)}</span>
        case 'quorumPercentage':
          return (
            <span className="text-sm">
              {minute.quorumPercentage ? `${minute.quorumPercentage}%` : '-'}
            </span>
          )
        case 'status':
          return (
            <Chip
              color={STATUS_COLORS[minute.status] || 'default'}
              size="sm"
              variant="dot"
            >
              {t.status[minute.status as keyof typeof t.status] || minute.status}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex justify-end">
              <ChevronRight className="text-default-400" size={16} />
            </div>
          )
        default:
          return null
      }
    },
    [t]
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
            Error al cargar las actas
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
          onPress={createModal.onOpen}
        >
          {t.addMinute}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : minutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <ScrollText className="mb-4 text-default-300" size={48} />
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
            {minutes.map(minute => (
              <Card
                key={minute.id}
                isPressable
                className="w-full cursor-pointer hover:bg-default-50 transition-colors"
                onPress={() => handleRowClick(minute)}
              >
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{minute.title}</p>
                      <p className="text-xs text-default-500">{formatDate(minute.assemblyDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        color={STATUS_COLORS[minute.status] || 'default'}
                        size="sm"
                        variant="dot"
                      >
                        {t.status[minute.status as keyof typeof t.status] || minute.status}
                      </Chip>
                      <ChevronRight className="text-default-400" size={14} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip
                      color={TYPE_COLORS[minute.assemblyType] || 'primary'}
                      size="sm"
                      variant="flat"
                    >
                      {t.types[minute.assemblyType as keyof typeof t.types] || minute.assemblyType}
                    </Chip>
                    {minute.quorumPercentage && (
                      <span className="text-xs text-default-500">
                        Quorum: {minute.quorumPercentage}%
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table<TAssemblyMinute>
              aria-label={t.title}
              classNames={{
                tr: 'hover:bg-default-100 transition-colors cursor-pointer',
              }}
              columns={tableColumns}
              mobileCards={false}
              renderCell={renderCell}
              rows={minutes}
              onRowClick={handleRowClick}
            />
          </div>
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal.isOpen} scrollBehavior="inside" size="2xl" onClose={handleClose}>
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">{t.form.createTitle}</Typography>
          </ModalHeader>

          <ModalBody>
            <div className="flex flex-col gap-5">
              <Input
                isRequired
                errorMessage={showErrors && !formData.title ? 'Campo requerido' : undefined}
                isInvalid={showErrors && !formData.title}
                label={t.form.title}
                placeholder={t.form.titlePlaceholder}
                value={formData.title}
                variant="bordered"
                onValueChange={v => updateFormData({ title: v })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  isRequired
                  items={typeItems}
                  label={t.form.assemblyType}
                  value={formData.assemblyType}
                  variant="bordered"
                  onChange={key =>
                    key && updateFormData({ assemblyType: key as 'ordinary' | 'extraordinary' })
                  }
                />

                <Input
                  isRequired
                  errorMessage={
                    showErrors && !formData.assemblyDate ? 'Campo requerido' : undefined
                  }
                  isInvalid={showErrors && !formData.assemblyDate}
                  label={t.form.assemblyDate}
                  type="date"
                  value={formData.assemblyDate}
                  variant="bordered"
                  onValueChange={v => updateFormData({ assemblyDate: v })}
                />
              </div>

              <Input
                label={t.form.assemblyLocation}
                placeholder={t.form.assemblyLocationPlaceholder}
                value={formData.assemblyLocation}
                variant="bordered"
                onValueChange={v => updateFormData({ assemblyLocation: v })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  endContent={<span className="text-default-400 text-sm">%</span>}
                  label={t.form.quorumPercentage}
                  type="number"
                  value={formData.quorumPercentage}
                  variant="bordered"
                  onValueChange={v => updateFormData({ quorumPercentage: v })}
                />

                <Input
                  label={t.form.attendeesCount}
                  type="number"
                  value={formData.attendeesCount}
                  variant="bordered"
                  onValueChange={v => updateFormData({ attendeesCount: v })}
                />

                <Input
                  label={t.form.totalUnits}
                  type="number"
                  value={formData.totalUnits}
                  variant="bordered"
                  onValueChange={v => updateFormData({ totalUnits: v })}
                />
              </div>

              <Textarea
                label={t.form.agenda}
                maxRows={6}
                minRows={3}
                placeholder={t.form.agendaPlaceholder}
                value={formData.agenda}
                variant="bordered"
                onValueChange={v => updateFormData({ agenda: v })}
              />

              <Textarea
                label={t.form.notes}
                maxRows={4}
                minRows={2}
                placeholder={t.form.notesPlaceholder}
                value={formData.notes}
                variant="bordered"
                onValueChange={v => updateFormData({ notes: v })}
              />

              {/* Document upload */}
              <div className="space-y-2">
                <Typography variant="body2">{t.form.document}</Typography>
                <Typography color="muted" variant="caption">
                  {t.form.documentHint}
                </Typography>

                {documentFile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-default-200 p-3">
                    <FileText className="text-default-400 shrink-0" size={16} />
                    <span className="text-sm flex-1 truncate">{documentFile.name}</span>
                    {isUploading && (
                      <span className="text-xs text-default-500">{uploadProgress}%</span>
                    )}
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={handleRemoveFile}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    startContent={<Upload size={16} />}
                    variant="bordered"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    {t.form.document}
                  </Button>
                )}

                <input
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  type="file"
                  onChange={handleFileChange}
                />
              </div>

              <Select
                items={statusItems}
                label={t.form.status}
                value={formData.status}
                variant="bordered"
                onChange={key =>
                  key && updateFormData({ status: key as 'draft' | 'approved' })
                }
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" onPress={handleClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              isDisabled={isSubmitting || isUploading}
              isLoading={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? t.form.creating : t.form.create}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
