import { eq } from 'drizzle-orm'
import type {
  TPaymentGateway,
  TPaymentGatewayCreate,
  TPaymentGatewayUpdate,
} from '@packages/domain'
import { paymentGateways } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TPaymentGatewayRecord = typeof paymentGateways.$inferSelect

/**
 * Repository for managing payment gateway entities.
 * Implements soft delete pattern via isActive flag.
 */
export class PaymentGatewaysRepository
  extends BaseRepository<
    typeof paymentGateways,
    TPaymentGateway,
    TPaymentGatewayCreate,
    TPaymentGatewayUpdate
  >
  implements IRepository<TPaymentGateway, TPaymentGatewayCreate, TPaymentGatewayUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, paymentGateways)
  }

  protected mapToEntity(record: unknown): TPaymentGateway {
    const r = record as TPaymentGatewayRecord
    return {
      id: r.id,
      name: r.name,
      gatewayType: r.gatewayType as TPaymentGateway['gatewayType'],
      configuration: r.configuration as Record<string, unknown> | null,
      supportedCurrencies: r.supportedCurrencies,
      isActive: r.isActive ?? true,
      isSandbox: r.isSandbox ?? false,
      metadata: r.metadata as Record<string, unknown> | null,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TPaymentGatewayCreate): Record<string, unknown> {
    return {
      name: dto.name,
      gatewayType: dto.gatewayType,
      configuration: dto.configuration,
      supportedCurrencies: dto.supportedCurrencies,
      isActive: dto.isActive,
      isSandbox: dto.isSandbox,
      metadata: dto.metadata,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TPaymentGatewayUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.gatewayType !== undefined) values.gatewayType = dto.gatewayType
    if (dto.configuration !== undefined) values.configuration = dto.configuration
    if (dto.supportedCurrencies !== undefined) values.supportedCurrencies = dto.supportedCurrencies
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.isSandbox !== undefined) values.isSandbox = dto.isSandbox
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Retrieves a payment gateway by name.
   */
  async getByName(name: string): Promise<TPaymentGateway | null> {
    const results = await this.db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.name, name))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves payment gateways by type.
   */
  async getByType(
    gatewayType: TPaymentGateway['gatewayType'],
    includeInactive = false
  ): Promise<TPaymentGateway[]> {
    const results = await this.db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.gatewayType, gatewayType))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(g => g.isActive)
  }

  /**
   * Retrieves production (non-sandbox) gateways.
   */
  async getProductionGateways(): Promise<TPaymentGateway[]> {
    const results = await this.db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.isSandbox, false))

    return results.map(record => this.mapToEntity(record)).filter(g => g.isActive)
  }
}
