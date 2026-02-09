import type { TAmenityReservation, TAmenityReservationCreate } from '@packages/domain'
import type { AmenityReservationsRepository } from '@database/repositories'
import type { AmenitiesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateReservationInput {
  data: TAmenityReservationCreate
}

export class CreateReservationService {
  constructor(
    private readonly reservationsRepository: AmenityReservationsRepository,
    private readonly amenitiesRepository: AmenitiesRepository
  ) {}

  async execute(input: ICreateReservationInput): Promise<TServiceResult<TAmenityReservation>> {
    // Verify amenity exists and is active
    const amenity = await this.amenitiesRepository.getById(input.data.amenityId)
    if (!amenity) {
      return failure('Amenity not found', 'NOT_FOUND')
    }

    // Check for time conflicts (overlapping reservations that are not cancelled/rejected)
    const overlapping = await this.reservationsRepository.getByAmenityAndDateRange(
      input.data.amenityId,
      input.data.startTime,
      input.data.endTime
    )

    const conflicts = overlapping.filter(
      r => r.status === 'pending' || r.status === 'approved'
    )

    if (conflicts.length > 0) {
      return failure('Time slot conflicts with an existing reservation', 'CONFLICT')
    }

    const reservation = await this.reservationsRepository.create(input.data)
    return success(reservation)
  }
}
