'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardBody, CardFooter, CardHeader } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { CalendarDays, MapPin, Users, Clock, ShieldCheck } from 'lucide-react'

import { useTranslation, useCondominium, useUser } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  useAmenitiesByCondominium,
  useReservationsByUser,
  useCreateReservation,
  useCancelReservation,
} from '@packages/http-client'
import type { TAmenity, TAmenityReservation } from '@packages/domain'

type TReservationFormData = {
  date: string
  startTime: string
  endTime: string
  notes: string
}

const INITIAL_FORM_DATA: TReservationFormData = {
  date: '',
  startTime: '',
  endTime: '',
  notes: '',
}

const STATUS_COLOR_MAP: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
}

export function ReservationsClient() {
  const { t } = useTranslation()
  const { selectedCondominium } = useCondominium()
  const { user } = useUser()
  const toast = useToast()

  const condominiumId = selectedCondominium?.condominium?.id ?? ''
  const userId = user?.id ?? ''

  // Form state
  const [formData, setFormData] = useState<TReservationFormData>(INITIAL_FORM_DATA)
  const [selectedAmenity, setSelectedAmenity] = useState<TAmenity | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Modal state
  const reserveModal = useDisclosure()

  // Fetch amenities for the selected condominium
  const {
    data: amenitiesData,
    isLoading: amenitiesLoading,
  } = useAmenitiesByCondominium(condominiumId, {
    enabled: !!condominiumId,
  })

  // Fetch user's reservations
  const {
    data: reservationsData,
    isLoading: reservationsLoading,
  } = useReservationsByUser(userId, {
    enabled: !!userId,
  })

  const amenities = useMemo(
    () => (amenitiesData?.data ?? []).filter((a) => a.isActive),
    [amenitiesData]
  )
  const reservations = reservationsData?.data ?? []

  // Mutations
  const createMutation = useCreateReservation({
    onSuccess: () => {
      toast.success(t('resident.reservations.success'))
      reserveModal.onClose()
      resetForm()
    },
    onError: () => {
      toast.error(t('common.error'))
    },
  })

  const cancelMutation = useCancelReservation(cancellingId ?? '', {
    onSuccess: () => {
      toast.success(t('resident.reservations.cancelSuccess'))
      setCancellingId(null)
    },
    onError: () => {
      toast.error(t('common.error'))
      setCancellingId(null)
    },
  })

  // Handlers
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setSelectedAmenity(null)
  }, [])

  const handleReserve = useCallback(
    (amenity: TAmenity) => {
      setSelectedAmenity(amenity)
      setFormData(INITIAL_FORM_DATA)
      reserveModal.onOpen()
    },
    [reserveModal]
  )

  const handleSubmitReservation = useCallback(() => {
    if (!selectedAmenity || !formData.date || !formData.startTime || !formData.endTime) return

    const startTime = new Date(`${formData.date}T${formData.startTime}:00`)
    const endTime = new Date(`${formData.date}T${formData.endTime}:00`)

    createMutation.mutate({
      amenityId: selectedAmenity.id,
      userId,
      startTime,
      endTime,
      notes: formData.notes || null,
      metadata: null,
    })
  }, [formData, selectedAmenity, userId, createMutation])

  const handleCancel = useCallback(
    (reservation: TAmenityReservation) => {
      setCancellingId(reservation.id)
      cancelMutation.mutate({})
    },
    [cancelMutation]
  )

  const formatDateTime = (dateStr: string | Date) => {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return d.toLocaleString()
  }

  const isLoading = amenitiesLoading || reservationsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Available Amenities */}
      <section>
        <Typography variant="h3" className="mb-4">
          {t('resident.reservations.availableAmenities')}
        </Typography>
        {amenities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
            <CalendarDays className="mb-4 text-default-300" size={48} />
            <Typography color="muted" variant="body1">
              {t('admin.amenities.noAmenities')}
            </Typography>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <Card key={amenity.id} shadow="sm">
                <CardHeader className="pb-2">
                  <div className="flex w-full items-start justify-between gap-2">
                    <Typography variant="h4" className="truncate">
                      {amenity.name}
                    </Typography>
                    {amenity.requiresApproval && (
                      <Chip color="warning" variant="flat" size="sm">
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={12} />
                          {t('admin.amenities.requiresApproval')}
                        </div>
                      </Chip>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="gap-2 py-2">
                  {amenity.description && (
                    <Typography color="muted" variant="body2" className="line-clamp-2">
                      {amenity.description}
                    </Typography>
                  )}
                  <div className="flex flex-col gap-1">
                    {amenity.location && (
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <MapPin size={14} />
                        <span>{amenity.location}</span>
                      </div>
                    )}
                    {amenity.capacity != null && (
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <Users size={14} />
                        <span>
                          {t('admin.amenities.capacity')}: {amenity.capacity}
                        </span>
                      </div>
                    )}
                  </div>
                </CardBody>
                <CardFooter className="pt-2">
                  <Button
                    color="primary"
                    size="sm"
                    className="w-full"
                    startContent={<CalendarDays size={16} />}
                    onPress={() => handleReserve(amenity)}
                  >
                    {t('resident.reservations.reserve')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* My Reservations */}
      <section>
        <Typography variant="h3" className="mb-4">
          {t('resident.reservations.myReservations')}
        </Typography>
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
            <Clock className="mb-4 text-default-300" size={48} />
            <Typography color="muted" variant="body1">
              {t('resident.reservations.myReservations')}
            </Typography>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => (
              <Card key={reservation.id} shadow="sm">
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Typography variant="body1" className="font-medium">
                        {formatDateTime(reservation.startTime)}
                      </Typography>
                      <span className="text-default-400">-</span>
                      <Typography variant="body1" className="font-medium">
                        {formatDateTime(reservation.endTime)}
                      </Typography>
                    </div>
                    {reservation.notes && (
                      <Typography color="muted" variant="body2">
                        {reservation.notes}
                      </Typography>
                    )}
                    {reservation.rejectionReason && (
                      <Typography color="danger" variant="body2">
                        {reservation.rejectionReason}
                      </Typography>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Chip
                      color={STATUS_COLOR_MAP[reservation.status] ?? 'default'}
                      variant="flat"
                    >
                      {t(`resident.reservations.status.${reservation.status}`)}
                    </Chip>
                    {(reservation.status === 'pending' || reservation.status === 'approved') && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isLoading={cancellingId === reservation.id && cancelMutation.isPending}
                        onPress={() => handleCancel(reservation)}
                      >
                        {t('resident.reservations.cancel')}
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Reserve Modal */}
      <Modal isOpen={reserveModal.isOpen} onOpenChange={reserveModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {t('resident.reservations.reserve')} - {selectedAmenity?.name}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label={t('resident.reservations.date')}
                    type="date"
                    value={formData.date}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, date: value }))
                    }
                    isRequired
                    variant="bordered"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={t('resident.reservations.startTime')}
                      type="text"
                      placeholder="09:00"
                      value={formData.startTime}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, startTime: value }))
                      }
                      isRequired
                      variant="bordered"
                    />
                    <Input
                      label={t('resident.reservations.endTime')}
                      type="text"
                      placeholder="11:00"
                      value={formData.endTime}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, endTime: value }))
                      }
                      isRequired
                      variant="bordered"
                    />
                  </div>
                  <Textarea
                    label={t('resident.reservations.notes')}
                    placeholder={t('resident.reservations.notes')}
                    value={formData.notes}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, notes: value }))
                    }
                    variant="bordered"
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmitReservation}
                  isLoading={createMutation.isPending}
                  isDisabled={
                    !formData.date || !formData.startTime || !formData.endTime
                  }
                >
                  {t('resident.reservations.submit')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
