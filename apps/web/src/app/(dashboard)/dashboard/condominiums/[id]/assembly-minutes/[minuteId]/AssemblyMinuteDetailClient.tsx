'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ScrollText,
  Calendar,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  AlertTriangle,
  Upload,
  X,
} from 'lucide-react'
import { useQueryClient, HttpError, isApiValidationError } from '@packages/http-client'
import {
  useAssemblyMinuteDetail,
  useUpdateAssemblyMinute,
  useDeleteAssemblyMinute,
  assemblyMinuteKeys,
} from '@packages/http-client/hooks'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
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
import { useTranslation } from '@/contexts'
import { getFirebaseStorage } from '@/libs/firebase/config'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  draft: 'default',
  approved: 'success',
  voided: 'danger',
} as const

const TYPE_COLORS = {
  ordinary: 'primary',
  extraordinary: 'warning',
} as const

// ─── Types ──────────────────────────────────────────────────────────────────

interface AssemblyMinuteDetailClientProps {
  condominiumId: string
  minuteId: string
}

interface IEditFormData {
  title: string
  assemblyType: 'ordinary' | 'extraordinary'
  assemblyDate: string
  assemblyLocation: string
  quorumPercentage: string
  attendeesCount: string
  totalUnits: string
  agenda: string
  notes: string
  status: 'draft' | 'approved' | 'voided'
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AssemblyMinuteDetailClient({
  condominiumId,
  minuteId,
}: AssemblyMinuteDetailClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const p = 'admin.condominiums.detail.assemblyMinutes'

  const editModal = useDisclosure()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState<IEditFormData | null>(null)

  // Document upload state
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: minuteData, isLoading } = useAssemblyMinuteDetail(minuteId)
  const minute = minuteData?.data

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: updateMinute } = useUpdateAssemblyMinute(minuteId)

  const deleteMutation = useDeleteAssemblyMinute({
    onSuccess: () => {
      toast.success(t(`${p}.detail.deleted`))
      queryClient.invalidateQueries({ queryKey: assemblyMinuteKeys.all })
      router.push(`/dashboard/condominiums/${condominiumId}/assembly-minutes`)
    },
    onError: () => toast.error(t(`${p}.detail.deleteError`)),
  })

  // ─── Select items ─────────────────────────────────────────────────────────

  const typeItems: ISelectItem[] = [
    { key: 'ordinary', label: t(`${p}.types.ordinary`) },
    { key: 'extraordinary', label: t(`${p}.types.extraordinary`) },
  ]

  const statusItems: ISelectItem[] = [
    { key: 'draft', label: t(`${p}.status.draft`) },
    { key: 'approved', label: t(`${p}.status.approved`) },
    { key: 'voided', label: t(`${p}.status.voided`) },
  ]

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenEdit = useCallback(() => {
    if (!minute) return

    setEditFormData({
      title: minute.title,
      assemblyType: minute.assemblyType,
      assemblyDate: minute.assemblyDate.split('T')[0] ?? minute.assemblyDate,
      assemblyLocation: minute.assemblyLocation ?? '',
      quorumPercentage: minute.quorumPercentage ?? '',
      attendeesCount: minute.attendeesCount?.toString() ?? '',
      totalUnits: minute.totalUnits?.toString() ?? '',
      agenda: minute.agenda ?? '',
      notes: minute.notes ?? '',
      status: minute.status,
    })
    setDocumentFile(null)
    setUploadProgress(0)
    editModal.onOpen()
  }, [minute, editModal])

  const handleCloseEdit = useCallback(() => {
    setEditFormData(null)
    setDocumentFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    editModal.onClose()
  }, [editModal])

  const updateEditFormData = useCallback((updates: Partial<IEditFormData>) => {
    setEditFormData(prev => (prev ? { ...prev, ...updates } : null))
  }, [])

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

  const handleSubmitEdit = useCallback(async () => {
    if (!editFormData) return

    setIsSubmitting(true)

    try {
      let documentUrl: string | null | undefined
      let documentFileName: string | null | undefined

      if (documentFile) {
        const result = await uploadDocument(documentFile)

        if (result) {
          documentUrl = result.url
          documentFileName = result.fileName
        }
      }

      await updateMinute({
        title: editFormData.title,
        assemblyType: editFormData.assemblyType,
        assemblyDate: editFormData.assemblyDate,
        assemblyLocation: editFormData.assemblyLocation || null,
        quorumPercentage: editFormData.quorumPercentage || null,
        attendeesCount: editFormData.attendeesCount ? Number(editFormData.attendeesCount) : null,
        totalUnits: editFormData.totalUnits ? Number(editFormData.totalUnits) : null,
        agenda: editFormData.agenda || null,
        notes: editFormData.notes || null,
        status: editFormData.status,
        ...(documentUrl !== undefined && { documentUrl }),
        ...(documentFileName !== undefined && { documentFileName }),
      })

      await queryClient.invalidateQueries({ queryKey: assemblyMinuteKeys.all })
      toast.success(t(`${p}.detail.updated`))
      handleCloseEdit()
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
  }, [editFormData, documentFile, updateMinute, queryClient, handleCloseEdit, toast, t, uploadDocument])

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: minuteId })
  }, [deleteMutation, minuteId])

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

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading || !minute) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <ScrollText className="text-primary shrink-0" size={22} />
          <Typography variant="h3">{minute.title}</Typography>
          <Chip
            color={TYPE_COLORS[minute.assemblyType] || 'primary'}
            size="sm"
            variant="flat"
          >
            {t(`${p}.types.${minute.assemblyType}`)}
          </Chip>
          <Chip
            color={STATUS_COLORS[minute.status] || 'default'}
            size="sm"
            variant="dot"
          >
            {t(`${p}.status.${minute.status}`)}
          </Chip>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            startContent={<Pencil size={14} />}
            variant="bordered"
            onPress={handleOpenEdit}
          >
            {t(`${p}.detail.edit`)}
          </Button>
          <Button
            color="danger"
            isDisabled={confirmDelete}
            size="sm"
            startContent={<Trash2 size={14} />}
            variant="bordered"
            onPress={() => setConfirmDelete(true)}
          >
            {t(`${p}.detail.delete`)}
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="rounded-lg bg-danger-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-danger" size={18} />
            <Typography className="font-semibold text-danger" variant="body2">
              {t(`${p}.detail.confirmDelete`)}
            </Typography>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              color="danger"
              isLoading={deleteMutation.isPending}
              size="sm"
              onPress={handleDelete}
            >
              {t(`${p}.detail.delete`)}
            </Button>
          </div>
        </div>
      )}

      {/* Assembly Info */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold" variant="body2">
            {t(`${p}.detail.assemblyInfo`)}
          </Typography>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Calendar className="text-default-400 mt-0.5 shrink-0" size={14} />
              <div>
                <p className="text-xs text-default-400">{t(`${p}.detail.date`)}</p>
                <p className="text-sm">{formatDate(minute.assemblyDate)}</p>
              </div>
            </div>

            {minute.assemblyLocation && (
              <div className="flex items-start gap-2">
                <MapPin className="text-default-400 mt-0.5 shrink-0" size={14} />
                <div>
                  <p className="text-xs text-default-400">{t(`${p}.detail.location`)}</p>
                  <p className="text-sm">{minute.assemblyLocation}</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Quorum Info */}
      {(minute.quorumPercentage || minute.attendeesCount || minute.totalUnits) && (
        <Card>
          <CardBody className="space-y-3">
            <Typography className="font-semibold flex items-center gap-2" variant="body2">
              <Users size={16} />
              {t(`${p}.detail.quorumInfo`)}
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {minute.quorumPercentage && (
                <div>
                  <p className="text-xs text-default-400">{t(`${p}.detail.quorumPercentage`)}</p>
                  <p className="text-sm font-medium">{minute.quorumPercentage}%</p>
                </div>
              )}
              {minute.attendeesCount && (
                <div>
                  <p className="text-xs text-default-400">{t(`${p}.detail.attendeesCount`)}</p>
                  <p className="text-sm font-medium">{minute.attendeesCount}</p>
                </div>
              )}
              {minute.totalUnits && (
                <div>
                  <p className="text-xs text-default-400">{t(`${p}.detail.totalUnits`)}</p>
                  <p className="text-sm font-medium">{minute.totalUnits}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Agenda */}
      {minute.agenda && (
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t(`${p}.detail.agenda`)}
            </Typography>
            <p className="text-sm whitespace-pre-wrap">{minute.agenda}</p>
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      {minute.notes && (
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t(`${p}.detail.notes`)}
            </Typography>
            <p className="text-sm whitespace-pre-wrap">{minute.notes}</p>
          </CardBody>
        </Card>
      )}

      {/* Document */}
      {minute.documentUrl && (
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t(`${p}.detail.document`)}
            </Typography>
            <a
              className="flex items-center gap-2 rounded-lg border border-default-200 p-3 hover:bg-default-50 transition-colors"
              href={minute.documentUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileText className="text-default-400 shrink-0" size={16} />
              <span className="text-sm flex-1 truncate">
                {minute.documentFileName || t(`${p}.detail.viewDocument`)}
              </span>
              <ExternalLink className="text-default-400 shrink-0" size={14} />
            </a>
          </CardBody>
        </Card>
      )}

      {/* Edit Modal */}
      {editFormData && (
        <Modal isOpen={editModal.isOpen} scrollBehavior="inside" size="2xl" onClose={handleCloseEdit}>
          <ModalContent>
            <ModalHeader>
              <Typography variant="h4">{t(`${p}.detail.editTitle`)}</Typography>
            </ModalHeader>

            <ModalBody>
              <div className="flex flex-col gap-5">
                <Input
                  isRequired
                  label={t(`${p}.form.title`)}
                  placeholder={t(`${p}.form.titlePlaceholder`)}
                  value={editFormData.title}
                  variant="bordered"
                  onValueChange={v => updateEditFormData({ title: v })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    isRequired
                    items={typeItems}
                    label={t(`${p}.form.assemblyType`)}
                    value={editFormData.assemblyType}
                    variant="bordered"
                    onChange={key =>
                      key &&
                      updateEditFormData({
                        assemblyType: key as 'ordinary' | 'extraordinary',
                      })
                    }
                  />

                  <Input
                    isRequired
                    label={t(`${p}.form.assemblyDate`)}
                    type="date"
                    value={editFormData.assemblyDate}
                    variant="bordered"
                    onValueChange={v => updateEditFormData({ assemblyDate: v })}
                  />
                </div>

                <Input
                  label={t(`${p}.form.assemblyLocation`)}
                  placeholder={t(`${p}.form.assemblyLocationPlaceholder`)}
                  value={editFormData.assemblyLocation}
                  variant="bordered"
                  onValueChange={v => updateEditFormData({ assemblyLocation: v })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    endContent={<span className="text-default-400 text-sm">%</span>}
                    label={t(`${p}.form.quorumPercentage`)}
                    type="number"
                    value={editFormData.quorumPercentage}
                    variant="bordered"
                    onValueChange={v => updateEditFormData({ quorumPercentage: v })}
                  />

                  <Input
                    label={t(`${p}.form.attendeesCount`)}
                    type="number"
                    value={editFormData.attendeesCount}
                    variant="bordered"
                    onValueChange={v => updateEditFormData({ attendeesCount: v })}
                  />

                  <Input
                    label={t(`${p}.form.totalUnits`)}
                    type="number"
                    value={editFormData.totalUnits}
                    variant="bordered"
                    onValueChange={v => updateEditFormData({ totalUnits: v })}
                  />
                </div>

                <Textarea
                  label={t(`${p}.form.agenda`)}
                  maxRows={6}
                  minRows={3}
                  placeholder={t(`${p}.form.agendaPlaceholder`)}
                  value={editFormData.agenda}
                  variant="bordered"
                  onValueChange={v => updateEditFormData({ agenda: v })}
                />

                <Textarea
                  label={t(`${p}.form.notes`)}
                  maxRows={4}
                  minRows={2}
                  placeholder={t(`${p}.form.notesPlaceholder`)}
                  value={editFormData.notes}
                  variant="bordered"
                  onValueChange={v => updateEditFormData({ notes: v })}
                />

                {/* Document upload */}
                <div className="space-y-2">
                  <Typography variant="body2">{t(`${p}.form.document`)}</Typography>

                  {minute.documentUrl && !documentFile && (
                    <a
                      className="flex items-center gap-2 rounded-lg border border-default-200 p-3 hover:bg-default-50 transition-colors"
                      href={minute.documentUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <FileText className="text-default-400 shrink-0" size={16} />
                      <span className="text-sm flex-1 truncate">
                        {minute.documentFileName || t(`${p}.detail.viewDocument`)}
                      </span>
                      <ExternalLink className="text-default-400 shrink-0" size={14} />
                    </a>
                  )}

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
                      {minute.documentUrl
                        ? t(`${p}.detail.replaceDocument`)
                        : t(`${p}.form.document`)}
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
                  label={t(`${p}.form.status`)}
                  value={editFormData.status}
                  variant="bordered"
                  onChange={key =>
                    key &&
                    updateEditFormData({
                      status: key as 'draft' | 'approved' | 'voided',
                    })
                  }
                />
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={handleCloseEdit}>
                {t('common.cancel')}
              </Button>
              <Button
                color="primary"
                isDisabled={isSubmitting || isUploading}
                isLoading={isSubmitting}
                onPress={handleSubmitEdit}
              >
                {t(`${p}.detail.save`)}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}
