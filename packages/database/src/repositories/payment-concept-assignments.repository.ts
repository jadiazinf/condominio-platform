import { eq, and } from 'drizzle-orm'
import type {
  TPaymentConceptAssignment,
  TPaymentConceptAssignmentCreate,
  TPaymentConceptAssignmentUpdate,
} from '@packages/domain'
import { paymentConceptAssignments } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TAssignmentRecord = typeof paymentConceptAssignments.$inferSelect

export class PaymentConceptAssignmentsRepository extends BaseRepository<
  typeof paymentConceptAssignments,
  TPaymentConceptAssignment,
  TPaymentConceptAssignmentCreate,
  TPaymentConceptAssignmentUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, paymentConceptAssignments)
  }

  protected mapToEntity(record: unknown): TPaymentConceptAssignment {
    const r = record as TAssignmentRecord
    return {
      id: r.id,
      paymentConceptId: r.paymentConceptId,
      scopeType: r.scopeType as TPaymentConceptAssignment['scopeType'],
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      unitId: r.unitId,
      distributionMethod: r.distributionMethod as TPaymentConceptAssignment['distributionMethod'],
      amount: Number(r.amount),
      isActive: r.isActive ?? true,
      assignedBy: r.assignedBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected override mapToInsertValues(
    dto: TPaymentConceptAssignmentCreate
  ): Record<string, unknown> {
    return {
      paymentConceptId: dto.paymentConceptId,
      scopeType: dto.scopeType,
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId ?? null,
      unitId: dto.unitId ?? null,
      distributionMethod: dto.distributionMethod,
      amount: dto.amount.toString(),
    }
  }

  protected override mapToUpdateValues(
    dto: TPaymentConceptAssignmentUpdate
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {}
    if (dto.amount !== undefined) values.amount = dto.amount.toString()
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    return values
  }

  /**
   * Deactivates all active assignments for a payment concept.
   * Returns the count of deactivated assignments.
   */
  async deactivateAllByConceptId(conceptId: string): Promise<number> {
    const results = await this.db
      .update(paymentConceptAssignments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(paymentConceptAssignments.paymentConceptId, conceptId),
          eq(paymentConceptAssignments.isActive, true)
        )
      )
      .returning()

    return results.length
  }

  async listByConceptId(
    conceptId: string,
    activeOnly = true
  ): Promise<TPaymentConceptAssignment[]> {
    const conditions = [eq(paymentConceptAssignments.paymentConceptId, conceptId)]
    if (activeOnly) {
      conditions.push(eq(paymentConceptAssignments.isActive, true))
    }

    const results = await this.db
      .select()
      .from(paymentConceptAssignments)
      .where(and(...conditions))

    return results.map(r => this.mapToEntity(r))
  }

  async getByConceptAndScope(
    conceptId: string,
    scopeType: string,
    buildingId: string | null,
    unitId: string | null
  ): Promise<TPaymentConceptAssignment | null> {
    const conditions = [
      eq(paymentConceptAssignments.paymentConceptId, conceptId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eq(paymentConceptAssignments.scopeType, scopeType as any),
    ]

    if (buildingId) {
      conditions.push(eq(paymentConceptAssignments.buildingId, buildingId))
    }
    if (unitId) {
      conditions.push(eq(paymentConceptAssignments.unitId, unitId))
    }

    const results = await this.db
      .select()
      .from(paymentConceptAssignments)
      .where(and(...conditions))
      .limit(1)

    return results.length > 0 ? this.mapToEntity(results[0]) : null
  }
}
