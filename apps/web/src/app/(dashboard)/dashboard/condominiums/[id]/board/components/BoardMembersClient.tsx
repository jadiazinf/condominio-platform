'use client'

import type { TCondominiumBoardMember, TBoardPosition } from '@packages/domain'

import { useState, useMemo, useCallback } from 'react'
import { Users, Plus, Trash2, UserCircle } from 'lucide-react'
import { useQueryClient, HttpError, isApiValidationError } from '@packages/http-client'
import {
  useCondominiumBoard,
  useAddBoardMember,
  useRemoveBoardMember,
  condominiumBoardKeys,
} from '@packages/http-client/hooks'

import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
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

type TStatusColor = 'success' | 'default' | 'warning'

const STATUS_COLORS: Record<string, TStatusColor> = {
  active: 'success',
  inactive: 'default',
  replaced: 'warning',
}

const POSITION_ORDER: TBoardPosition[] = [
  'president',
  'secretary',
  'treasurer',
  'substitute_president',
  'substitute_secretary',
  'substitute_treasurer',
]

interface IFormData {
  userId: string
  position: TBoardPosition
  electedAt: string
  termEndsAt: string
  assemblyMinuteId: string
  notes: string
}

const INITIAL_FORM_DATA: IFormData = {
  userId: '',
  position: 'president',
  electedAt: '',
  termEndsAt: '',
  assemblyMinuteId: '',
  notes: '',
}

interface BoardMembersClientProps {
  condominiumId: string
  managementCompanyId: string
  translations: {
    title: string
    subtitle: string
    addMember: string
    removeMember: string
    empty: string
    emptyDescription: string
    positions: Record<string, string>
    statuses: Record<string, string>
    form: {
      createTitle: string
      userId: string
      userIdPlaceholder: string
      position: string
      electedAt: string
      termEndsAt: string
      assemblyMinuteId: string
      notes: string
      notesPlaceholder: string
      create: string
      creating: string
      success: string
    }
    removeConfirmTitle: string
    removeConfirmMessage: string
    cancel: string
    confirm: string
    electedAt: string
    termEndsAt: string
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BoardMembersClient({
  condominiumId,
  translations: t,
}: BoardMembersClientProps) {
  const createModal = useDisclosure()
  const removeModal = useDisclosure()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<IFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TCondominiumBoardMember | null>(null)

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useCondominiumBoard()

  const members = useMemo(() => {
    const allMembers = (data?.data ?? []) as TCondominiumBoardMember[]
    return allMembers.filter(m => m.condominiumId === condominiumId)
  }, [data, condominiumId])

  const membersByPosition = useMemo(() => {
    const map = new Map<TBoardPosition, TCondominiumBoardMember | undefined>()
    for (const pos of POSITION_ORDER) {
      map.set(pos, members.find(m => m.position === pos && m.status === 'active'))
    }
    return map
  }, [members])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: addMember } = useAddBoardMember()
  const { mutateAsync: removeMember } = useRemoveBoardMember()

  // ─── Select items ─────────────────────────────────────────────────────────

  const positionItems: ISelectItem[] = useMemo(
    () =>
      POSITION_ORDER.map(pos => ({
        key: pos,
        label: t.positions[pos] ?? pos,
      })),
    [t]
  )

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const updateFormData = useCallback((updates: Partial<IFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleClose = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowErrors(false)
    createModal.onClose()
  }, [createModal])

  const handleSubmit = useCallback(async () => {
    if (!formData.userId || !formData.electedAt) {
      setShowErrors(true)
      return
    }

    setIsSubmitting(true)

    try {
      await addMember({
        userId: formData.userId,
        position: formData.position,
        electedAt: formData.electedAt,
        termEndsAt: formData.termEndsAt || null,
        assemblyMinuteId: formData.assemblyMinuteId || null,
        notes: formData.notes || null,
      })

      await queryClient.invalidateQueries({ queryKey: condominiumBoardKeys.all })
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
  }, [formData, addMember, queryClient, handleClose, toast, t])

  const handleOpenAssign = useCallback(
    (position: TBoardPosition) => {
      setFormData({ ...INITIAL_FORM_DATA, position })
      createModal.onOpen()
    },
    [createModal]
  )

  const handleRemoveClick = useCallback(
    (member: TCondominiumBoardMember) => {
      setMemberToRemove(member)
      removeModal.onOpen()
    },
    [removeModal]
  )

  const handleConfirmRemove = useCallback(async () => {
    if (!memberToRemove) return

    try {
      await removeMember({ id: memberToRemove.id })
      await queryClient.invalidateQueries({ queryKey: condominiumBoardKeys.all })
      toast.success(t.removeMember)
      setMemberToRemove(null)
      removeModal.onClose()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }
  }, [memberToRemove, removeMember, queryClient, removeModal, toast, t])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

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
            Error al cargar los miembros de junta
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
          {t.addMember}
        </Button>
      </div>

      {/* Board position cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Users className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t.empty}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t.emptyDescription}
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POSITION_ORDER.map(position => {
            const member = membersByPosition.get(position)

            return (
              <Card key={position} className="w-full">
                <CardHeader className="flex flex-row items-center justify-between pb-1">
                  <Typography variant="subtitle2">
                    {t.positions[position] ?? position}
                  </Typography>
                  {member && (
                    <Chip
                      color={STATUS_COLORS[member.status] || 'default'}
                      size="sm"
                      variant="dot"
                    >
                      {t.statuses[member.status] ?? member.status}
                    </Chip>
                  )}
                </CardHeader>
                <CardBody className="pt-0">
                  {member ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserCircle className="text-default-400 shrink-0" size={20} />
                        <span className="text-sm font-medium truncate">
                          {member.userId}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-default-500">
                        <span>
                          {t.electedAt}: {formatDate(member.electedAt)}
                        </span>
                        {member.termEndsAt && (
                          <span>
                            {t.termEndsAt}: {formatDate(member.termEndsAt)}
                          </span>
                        )}
                      </div>
                      {member.notes && (
                        <p className="text-xs text-default-400 line-clamp-2">
                          {member.notes}
                        </p>
                      )}
                      <div className="flex justify-end pt-1">
                        <Button
                          color="danger"
                          size="sm"
                          startContent={<Trash2 size={14} />}
                          variant="light"
                          onPress={() => handleRemoveClick(member)}
                        >
                          {t.removeMember}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <UserCircle className="mb-2 text-default-200" size={32} />
                      <Typography className="mb-2" color="muted" variant="caption">
                        {t.empty}
                      </Typography>
                      <Button
                        color="primary"
                        size="sm"
                        variant="flat"
                        onPress={() => handleOpenAssign(position)}
                      >
                        {t.addMember}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
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
                errorMessage={showErrors && !formData.userId ? 'Campo requerido' : undefined}
                isInvalid={showErrors && !formData.userId}
                label={t.form.userId}
                placeholder={t.form.userIdPlaceholder}
                value={formData.userId}
                variant="bordered"
                onValueChange={v => updateFormData({ userId: v })}
              />

              <Select
                isRequired
                items={positionItems}
                label={t.form.position}
                value={formData.position}
                variant="bordered"
                onChange={key =>
                  key && updateFormData({ position: key as TBoardPosition })
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  isRequired
                  errorMessage={
                    showErrors && !formData.electedAt ? 'Campo requerido' : undefined
                  }
                  isInvalid={showErrors && !formData.electedAt}
                  label={t.form.electedAt}
                  type="date"
                  value={formData.electedAt}
                  variant="bordered"
                  onValueChange={v => updateFormData({ electedAt: v })}
                />

                <Input
                  label={t.form.termEndsAt}
                  type="date"
                  value={formData.termEndsAt}
                  variant="bordered"
                  onValueChange={v => updateFormData({ termEndsAt: v })}
                />
              </div>

              <Input
                label={t.form.assemblyMinuteId}
                placeholder="UUID"
                value={formData.assemblyMinuteId}
                variant="bordered"
                onValueChange={v => updateFormData({ assemblyMinuteId: v })}
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
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" onPress={handleClose}>
              {t.cancel}
            </Button>
            <Button
              color="primary"
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? t.form.creating : t.form.create}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal isOpen={removeModal.isOpen} size="sm" onClose={removeModal.onClose}>
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">{t.removeConfirmTitle}</Typography>
          </ModalHeader>
          <ModalBody>
            <Typography color="muted" variant="body2">
              {t.removeConfirmMessage}
            </Typography>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={removeModal.onClose}>
              {t.cancel}
            </Button>
            <Button color="danger" onPress={handleConfirmRemove}>
              {t.confirm}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
