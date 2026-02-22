import type { TPaymentConceptAssignment } from '@packages/domain'
import type { PaymentConceptsRepository, PaymentConceptAssignmentsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

type TBuildingsRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; isActive: boolean } | null>
}

type TUnitsRepo = {
  getById: (id: string) => Promise<{ id: string; buildingId: string; isActive: boolean; aliquotPercentage: string | null } | null>
  getByBuildingId: (buildingId: string) => Promise<{ id: string; aliquotPercentage: string | null; isActive: boolean }[]>
  getByCondominiumId: (condominiumId: string) => Promise<{ id: string; aliquotPercentage: string | null; isActive: boolean }[]>
}

export interface IAssignPaymentConceptInput {
  paymentConceptId: string
  scopeType: 'condominium' | 'building' | 'unit'
  condominiumId: string
  buildingId?: string
  unitId?: string
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
  assignedBy: string
}

export class AssignPaymentConceptService {
  constructor(
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly buildingsRepo: TBuildingsRepo,
    private readonly unitsRepo: TUnitsRepo
  ) {}

  async execute(input: IAssignPaymentConceptInput): Promise<TServiceResult<TPaymentConceptAssignment>> {
    // Validate amount
    if (input.amount <= 0) {
      return failure('Amount must be greater than 0', 'BAD_REQUEST')
    }

    // Validate scope requirements
    if (input.scopeType === 'building' && !input.buildingId) {
      return failure('Building ID is required when scope is building', 'BAD_REQUEST')
    }

    if (input.scopeType === 'unit' && !input.unitId) {
      return failure('Unit ID is required when scope is unit', 'BAD_REQUEST')
    }

    if (input.scopeType === 'unit' && input.distributionMethod !== 'fixed_per_unit') {
      return failure('Unit-level assignments must use fixed_per_unit distribution', 'BAD_REQUEST')
    }

    // Validate concept exists and is active
    const concept = await this.conceptsRepo.getById(input.paymentConceptId)
    if (!concept) {
      return failure('Payment concept not found', 'NOT_FOUND')
    }
    if (!concept.isActive) {
      return failure('Cannot assign to an inactive payment concept', 'BAD_REQUEST')
    }

    // Validate building belongs to condominium
    if (input.scopeType === 'building' && input.buildingId) {
      const building = await this.buildingsRepo.getById(input.buildingId)
      if (!building) {
        return failure('Building not found', 'NOT_FOUND')
      }
      if (building.condominiumId !== input.condominiumId) {
        return failure('Building does not belong to the specified condominium', 'BAD_REQUEST')
      }
    }

    // Validate unit exists and is active
    if (input.scopeType === 'unit' && input.unitId) {
      const unit = await this.unitsRepo.getById(input.unitId)
      if (!unit) {
        return failure('Unit not found', 'NOT_FOUND')
      }
      if (!unit.isActive) {
        return failure('Cannot assign to an inactive unit', 'BAD_REQUEST')
      }
    }

    // Validate proportional/equal_split: check that units exist with aliquot data
    if (input.distributionMethod === 'by_aliquot' || input.distributionMethod === 'equal_split') {
      let units: { id: string; aliquotPercentage: string | null; isActive: boolean }[]

      if (input.scopeType === 'building' && input.buildingId) {
        units = await this.unitsRepo.getByBuildingId(input.buildingId)
      } else {
        units = await this.unitsRepo.getByCondominiumId(input.condominiumId)
      }

      const activeUnits = units.filter(u => u.isActive)

      if (activeUnits.length === 0) {
        return failure('No active units found for this scope', 'BAD_REQUEST')
      }

      if (input.distributionMethod === 'by_aliquot') {
        const unitsWithAliquot = activeUnits.filter(
          u => u.aliquotPercentage != null && Number(u.aliquotPercentage) > 0
        )
        if (unitsWithAliquot.length === 0) {
          return failure('No units have aliquot percentage set for proportional distribution', 'BAD_REQUEST')
        }
      }
    }

    // Check for duplicate
    const existing = await this.assignmentsRepo.getByConceptAndScope(
      input.paymentConceptId,
      input.scopeType,
      input.buildingId ?? null,
      input.unitId ?? null
    )
    if (existing) {
      return failure('An assignment already exists for this scope', 'CONFLICT')
    }

    try {
      const assignment = await this.assignmentsRepo.create({
        paymentConceptId: input.paymentConceptId,
        scopeType: input.scopeType,
        condominiumId: input.condominiumId,
        buildingId: input.buildingId,
        unitId: input.unitId,
        distributionMethod: input.distributionMethod,
        amount: input.amount,
      })

      return success(assignment)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create assignment'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  async deactivate(assignmentId: string): Promise<TServiceResult<TPaymentConceptAssignment>> {
    const assignment = await this.assignmentsRepo.update(assignmentId, { isActive: false })
    if (!assignment) {
      return failure('Assignment not found', 'NOT_FOUND')
    }
    return success(assignment)
  }
}
