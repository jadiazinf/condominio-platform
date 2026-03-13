import type { TPaymentConcept } from '@packages/domain'
import type { PaymentConceptsRepository, PaymentConceptAssignmentsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface IDeactivatePaymentConceptInput {
  conceptId: string
  condominiumId: string
  deactivatedBy: string
}

export interface IDeactivatePaymentConceptResult {
  concept: TPaymentConcept
  cancelledQuotas: number
  deactivatedAssignments: number
}

type TQuotasRepo = {
  cancelAllNonPaidByConceptId: (conceptId: string) => Promise<number>
  withTx: (tx: TDrizzleClient) => TQuotasRepo
}

export class DeactivatePaymentConceptService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly quotasRepo: TQuotasRepo,
  ) {}

  async execute(input: IDeactivatePaymentConceptInput): Promise<TServiceResult<IDeactivatePaymentConceptResult>> {
    const concept = await this.conceptsRepo.getById(input.conceptId)

    if (!concept) {
      return failure('Payment concept not found', 'NOT_FOUND')
    }

    if (concept.condominiumId !== input.condominiumId) {
      return failure('Payment concept does not belong to this condominium', 'FORBIDDEN')
    }

    if (!concept.isActive) {
      return failure('Payment concept is already deactivated', 'CONFLICT')
    }

    // Execute all operations in a single transaction
    const result = await (this.db as any).transaction(async (tx: TDrizzleClient) => {
      const txConcepts = this.conceptsRepo.withTx(tx)
      const txAssignments = this.assignmentsRepo.withTx(tx)
      const txQuotas = this.quotasRepo.withTx(tx)

      // 1. Cancel all non-paid quotas (pending/overdue)
      const cancelledQuotas = await txQuotas.cancelAllNonPaidByConceptId(input.conceptId)

      // 2. Deactivate all active assignments
      const deactivatedAssignments = await txAssignments.deactivateAllByConceptId(input.conceptId)

      // 3. Deactivate the concept itself
      const updatedConcept = await txConcepts.update(input.conceptId, { isActive: false } as any)

      return {
        concept: updatedConcept!,
        cancelledQuotas,
        deactivatedAssignments,
      }
    })

    return success(result)
  }
}
