import type { TAmenityReservation } from '@packages/domain'
import type { AmenityReservationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICancelReservationInput {
  reservationId: string
}

export class CancelReservationService {
  constructor(private readonly repository: AmenityReservationsRepository) {}

  async execute(input: ICancelReservationInput): Promise<TServiceResult<TAmenityReservation>> {
    const reservation = await this.repository.getById(input.reservationId)
    if (!reservation) {
      return failure('Reservation not found', 'NOT_FOUND')
    }

    if (reservation.status === 'cancelled') {
      return failure('Reservation is already cancelled', 'BAD_REQUEST')
    }

    if (reservation.status === 'rejected') {
      return failure('Cannot cancel a rejected reservation', 'BAD_REQUEST')
    }

    const cancelled = await this.repository.markAsCancelled(input.reservationId)
    if (!cancelled) {
      return failure('Failed to cancel reservation', 'INTERNAL_ERROR')
    }

    return success(cancelled)
  }
}
