import type { TAmenityReservation } from '@packages/domain'
import type { AmenityReservationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IApproveReservationInput {
  reservationId: string
  approvedBy: string
}

export class ApproveReservationService {
  constructor(private readonly repository: AmenityReservationsRepository) {}

  async execute(input: IApproveReservationInput): Promise<TServiceResult<TAmenityReservation>> {
    const reservation = await this.repository.getById(input.reservationId)
    if (!reservation) {
      return failure('Reservation not found', 'NOT_FOUND')
    }

    if (reservation.status !== 'pending') {
      return failure('Only pending reservations can be approved', 'BAD_REQUEST')
    }

    const approved = await this.repository.markAsApproved(
      input.reservationId,
      input.approvedBy
    )

    if (!approved) {
      return failure('Failed to approve reservation', 'INTERNAL_ERROR')
    }

    return success(approved)
  }
}
