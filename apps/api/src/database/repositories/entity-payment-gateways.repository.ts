import { and, eq } from 'drizzle-orm'
import type {
  TEntityPaymentGateway,
  TEntityPaymentGatewayCreate,
  TEntityPaymentGatewayUpdate,
} from '@packages/domain'
import { entityPaymentGateways } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TEntityPaymentGatewayRecord = typeof entityPaymentGateways.$inferSelect

/**
 * Repository for managing entity-payment gateway association entities.
 * Implements soft delete pattern via isActive flag.
 */
export class EntityPaymentGatewaysRepository
  extends BaseRepository<
    typeof entityPaymentGateways,
    TEntityPaymentGateway,
    TEntityPaymentGatewayCreate,
    TEntityPaymentGatewayUpdate
  >
  implements
    IRepository<TEntityPaymentGateway, TEntityPaymentGatewayCreate, TEntityPaymentGatewayUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, entityPaymentGateways)
  }

  protected mapToEntity(record: unknown): TEntityPaymentGateway {
    const r = record as TEntityPaymentGatewayRecord
    return {
      id: r.id,
      paymentGatewayId: r.paymentGatewayId,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      entityConfiguration: r.entityConfiguration as Record<string, unknown> | null,
      isActive: r.isActive ?? true,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TEntityPaymentGatewayCreate): Record<string, unknown> {
    return {
      paymentGatewayId: dto.paymentGatewayId,
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      entityConfiguration: dto.entityConfiguration,
      isActive: dto.isActive,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TEntityPaymentGatewayUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.paymentGatewayId !== undefined) values.paymentGatewayId = dto.paymentGatewayId
    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.entityConfiguration !== undefined) values.entityConfiguration = dto.entityConfiguration
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Retrieves entity payment gateways by condominium.
   */
  async getByCondominiumId(
    condominiumId: string,
    includeInactive = false
  ): Promise<TEntityPaymentGateway[]> {
    const results = await this.db
      .select()
      .from(entityPaymentGateways)
      .where(eq(entityPaymentGateways.condominiumId, condominiumId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(e => e.isActive)
  }

  /**
   * Retrieves entity payment gateways by building.
   */
  async getByBuildingId(
    buildingId: string,
    includeInactive = false
  ): Promise<TEntityPaymentGateway[]> {
    const results = await this.db
      .select()
      .from(entityPaymentGateways)
      .where(eq(entityPaymentGateways.buildingId, buildingId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(e => e.isActive)
  }

  /**
   * Retrieves entity payment gateways by gateway.
   */
  async getByPaymentGatewayId(
    paymentGatewayId: string,
    includeInactive = false
  ): Promise<TEntityPaymentGateway[]> {
    const results = await this.db
      .select()
      .from(entityPaymentGateways)
      .where(eq(entityPaymentGateways.paymentGatewayId, paymentGatewayId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(e => e.isActive)
  }
}
