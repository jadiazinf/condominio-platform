import { eq, and } from 'drizzle-orm'
import type { TBillingChannel } from '@packages/domain'
import { billingChannels } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TBillingChannelRecord = typeof billingChannels.$inferSelect
type TBillingChannelCreate = Omit<TBillingChannel, 'id' | 'createdAt' | 'updatedAt'>
type TBillingChannelUpdate = Partial<TBillingChannelCreate>

export class BillingChannelsRepository extends BaseRepository<
  typeof billingChannels,
  TBillingChannel,
  TBillingChannelCreate,
  TBillingChannelUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, billingChannels)
  }

  protected mapToEntity(record: unknown): TBillingChannel {
    const r = record as TBillingChannelRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      name: r.name,
      channelType: r.channelType,
      currencyId: r.currencyId,
      managedBy: r.managedBy,
      distributionMethod: r.distributionMethod,
      frequency: r.frequency,
      generationStrategy: r.generationStrategy,
      generationDay: r.generationDay ?? 1,
      dueDay: r.dueDay ?? 15,
      latePaymentType: r.latePaymentType ?? 'none',
      latePaymentValue: r.latePaymentValue,
      gracePeriodDays: r.gracePeriodDays ?? 0,
      earlyPaymentType: r.earlyPaymentType ?? 'none',
      earlyPaymentValue: r.earlyPaymentValue,
      earlyPaymentDaysBefore: r.earlyPaymentDaysBefore ?? 0,
      interestType: r.interestType ?? 'simple',
      interestRate: r.interestRate,
      interestCalculationPeriod: r.interestCalculationPeriod,
      interestGracePeriodDays: r.interestGracePeriodDays ?? 0,
      maxInterestCapType: r.maxInterestCapType ?? 'none',
      maxInterestCapValue: r.maxInterestCapValue,
      allocationStrategy: r.allocationStrategy ?? 'fifo',
      assemblyReference: r.assemblyReference,
      isActive: r.isActive ?? true,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      receiptNumberFormat: r.receiptNumberFormat,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async listByCondominium(condominiumId: string): Promise<TBillingChannel[]> {
    const results = await this.db
      .select()
      .from(billingChannels)
      .where(
        and(eq(billingChannels.condominiumId, condominiumId), eq(billingChannels.isActive, true))
      )

    return results.map(r => this.mapToEntity(r))
  }

  async listByBuilding(buildingId: string): Promise<TBillingChannel[]> {
    const results = await this.db
      .select()
      .from(billingChannels)
      .where(and(eq(billingChannels.buildingId, buildingId), eq(billingChannels.isActive, true)))

    return results.map(r => this.mapToEntity(r))
  }
}
