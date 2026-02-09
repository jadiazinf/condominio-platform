import type { AmenityReservationsRepository } from '@database/repositories'
import type { AmenitiesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICheckAvailabilityInput {
  amenityId: string
  startTime: Date
  endTime: Date
}

export interface IAvailabilityResult {
  available: boolean
  conflictCount: number
}

export class CheckAvailabilityService {
  constructor(
    private readonly reservationsRepository: AmenityReservationsRepository,
    private readonly amenitiesRepository: AmenitiesRepository
  ) {}

  async execute(input: ICheckAvailabilityInput): Promise<TServiceResult<IAvailabilityResult>> {
    // Verify amenity exists
    const amenity = await this.amenitiesRepository.getById(input.amenityId)
    if (!amenity) {
      return failure('Amenity not found', 'NOT_FOUND')
    }

    const overlapping = await this.reservationsRepository.getByAmenityAndDateRange(
      input.amenityId,
      input.startTime,
      input.endTime
    )

    const conflicts = overlapping.filter(
      r => r.status === 'pending' || r.status === 'approved'
    )

    return success({
      available: conflicts.length === 0,
      conflictCount: conflicts.length,
    })
  }
}
