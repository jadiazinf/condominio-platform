import type { TPaymentConceptAssignment } from '@packages/domain'
import type {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

type TBuildingsRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; isActive: boolean } | null>
}

type TUnitsRepo = {
  getById: (id: string) => Promise<{
    id: string
    buildingId: string
    isActive: boolean
    aliquotPercentage: string | null
  } | null>
  getByBuildingId: (
    buildingId: string
  ) => Promise<{ id: string; aliquotPercentage: string | null; isActive: boolean }[]>
  getByCondominiumId: (
    condominiumId: string
  ) => Promise<{ id: string; aliquotPercentage: string | null; isActive: boolean }[]>
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

type TQuotasRepo = {
  cancelNonPaidByConceptAndUnits: (conceptId: string, unitIds: string[]) => Promise<number>
  cancelAllNonPaidByConceptId: (conceptId: string) => Promise<number>
  withTx: (tx: TDrizzleClient) => TQuotasRepo
}

export interface IDeactivateAssignmentResult {
  assignment: TPaymentConceptAssignment
  cancelledQuotas: number
}

export class AssignPaymentConceptService {
  constructor(
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly buildingsRepo: TBuildingsRepo,
    private readonly unitsRepo: TUnitsRepo,
    private readonly db?: TDrizzleClient,
    private readonly quotasRepo?: TQuotasRepo
  ) {}

  async execute(
    input: IAssignPaymentConceptInput
  ): Promise<TServiceResult<TPaymentConceptAssignment>> {
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
          return failure(
            'No units have aliquot percentage set for proportional distribution',
            'BAD_REQUEST'
          )
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
        assignedBy: input.assignedBy,
      })

      return success(assignment)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create assignment'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  async deactivate(
    assignmentId: string,
    cancelPendingQuotas = false
  ): Promise<TServiceResult<IDeactivateAssignmentResult>> {
    const assignment = await this.assignmentsRepo.getById(assignmentId)
    if (!assignment) {
      return failure('Assignment not found', 'NOT_FOUND')
    }
    if (!assignment.isActive) {
      return failure('Assignment is already deactivated', 'CONFLICT')
    }

    if (!cancelPendingQuotas || !this.db || !this.quotasRepo) {
      // Simple deactivation without quota cancellation
      const updated = await this.assignmentsRepo.update(assignmentId, { isActive: false })
      return success({ assignment: updated!, cancelledQuotas: 0 })
    }

    // Deactivate with quota cancellation in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.db as any).transaction(async (tx: TDrizzleClient) => {
      const txAssignments = this.assignmentsRepo.withTx(tx)
      const txQuotas = this.quotasRepo!.withTx(tx)

      // 1. Find affected unit IDs based on assignment scope
      const unitIds = await this.getAffectedUnitIds(assignment)

      // 2. Cancel pending/overdue quotas for affected units
      let cancelledQuotas = 0
      if (unitIds.length > 0) {
        cancelledQuotas = await txQuotas.cancelNonPaidByConceptAndUnits(
          assignment.paymentConceptId,
          unitIds
        )
      }

      // 3. Deactivate the assignment
      const updated = await txAssignments.update(assignmentId, { isActive: false })

      return { assignment: updated!, cancelledQuotas }
    })

    return success(result)
  }

  private async getAffectedUnitIds(assignment: TPaymentConceptAssignment): Promise<string[]> {
    if (assignment.scopeType === 'unit' && assignment.unitId) {
      return [assignment.unitId]
    }
    if (assignment.scopeType === 'building' && assignment.buildingId) {
      const units = await this.unitsRepo.getByBuildingId(assignment.buildingId)
      return units.filter(u => u.isActive).map(u => u.id)
    }
    if (assignment.scopeType === 'condominium' && assignment.condominiumId) {
      const units = await this.unitsRepo.getByCondominiumId(assignment.condominiumId)
      return units.filter(u => u.isActive).map(u => u.id)
    }
    return []
  }
}
