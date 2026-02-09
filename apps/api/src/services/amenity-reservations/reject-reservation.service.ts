import type { TAmenityReservation } from '@packages/domain'
import type { AmenityReservationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRejectReservationInput {
  reservationId: string
  rejectionReason?: string
}

export class RejectReservationService {
  constructor(private readonly repository: AmenityReservationsRepository) {}

  async execute(input: IRejectReservationInput): Promise<TServiceResult<TAmenityReservation>> {
    const reservation = await this.repository.getById(input.reservationId)
    if (!reservation) {
      return failure('Reservation not found', 'NOT_FOUND')
    }

    if (reservation.status !== 'pending') {
      return failure('Only pending reservations can be rejected', 'BAD_REQUEST')
    }

    const rejected = await this.repository.markAsRejected(
      input.reservationId,
      input.rejectionReason
    )

    if (!rejected) {
      return failure('Failed to reject reservation', 'INTERNAL_ERROR')
    }

    return success(rejected)
  }
}
