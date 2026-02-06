import { eq, sql } from 'drizzle-orm'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { SubscriptionRatesRepository } from '@database/repositories'
import {
  condominiumManagementCompanies,
  buildings,
  units,
} from '@database/drizzle/schema'
import { type TServiceResult, success, failure } from '../base.service'
import type { TDiscountType } from '@packages/domain'

export interface IPricingCalculationInput {
  managementCompanyId: string
  condominiumRate?: number
  unitRate?: number
  discountType?: TDiscountType | null
  discountValue?: number | null
}

export interface IPricingCalculationResult {
  condominiumCount: number
  unitCount: number
  condominiumRate: number
  unitRate: number
  condominiumSubtotal: number
  unitSubtotal: number
  calculatedPrice: number
  discountType: TDiscountType | null
  discountValue: number | null
  discountAmount: number
  finalPrice: number
  // Rate info
  rateId: string | null
  rateName: string | null
  rateVersion: string | null
  rateDescription: string | null
  // Tier info
  minCondominiums: number | null
  maxCondominiums: number | null
}

/**
 * Service for calculating subscription pricing based on condominiums and units.
 * Supports tiered pricing based on condominium count.
 *
 * Formula: (condominiumRate × condominiums) + (unitRate × units) - discount
 */
export class CalculatePricingService {
  private readonly ratesRepository: SubscriptionRatesRepository

  constructor(private readonly db: TDrizzleClient) {
    this.ratesRepository = new SubscriptionRatesRepository(db)
  }

  async execute(input: IPricingCalculationInput): Promise<TServiceResult<IPricingCalculationResult>> {
    const {
      managementCompanyId,
      discountType = null,
      discountValue = null,
    } = input

    try {
      // Get condominium count for the management company FIRST (needed for tier selection)
      const condominiumCountResult = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(condominiumManagementCompanies)
        .where(eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId))

      const condominiumCount = condominiumCountResult[0]?.count ?? 0

      // Get the appropriate rate based on condominium count (tiered pricing)
      const tieredRate = await this.ratesRepository.getRateForCondominiumCount(condominiumCount)

      // If no rate in DB and no override provided, return error
      if (!tieredRate && input.condominiumRate === undefined && input.unitRate === undefined) {
        return failure(
          'No hay tarifas de suscripción configuradas. Por favor, configure una tarifa activa antes de continuar.',
          'BAD_REQUEST'
        )
      }

      // Use provided rates or DB rates (no fallback)
      const condominiumRate = input.condominiumRate ?? tieredRate?.condominiumRate ?? 0
      const unitRate = input.unitRate ?? tieredRate?.unitRate ?? 0

      // Get unit count for all condominiums managed by this company
      // Units are linked through: condominium_management_companies -> buildings -> units
      const unitCountResult = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .innerJoin(
          condominiumManagementCompanies,
          eq(buildings.condominiumId, condominiumManagementCompanies.condominiumId)
        )
        .where(eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId))

      const unitCount = unitCountResult[0]?.count ?? 0

      // Calculate subtotals
      const condominiumSubtotal = condominiumRate * condominiumCount
      const unitSubtotal = unitRate * unitCount
      const calculatedPrice = condominiumSubtotal + unitSubtotal

      // Validate discount
      if (discountType === 'percentage' && discountValue !== null && discountValue > 100) {
        return failure(
          'El descuento en porcentaje no puede ser mayor a 100%',
          'BAD_REQUEST'
        )
      }
      if (discountType === 'fixed' && discountValue !== null && discountValue > calculatedPrice) {
        return failure(
          'El descuento fijo no puede ser mayor al precio calculado',
          'BAD_REQUEST'
        )
      }

      // Calculate discount
      let discountAmount = 0
      if (discountType && discountValue && discountValue > 0) {
        if (discountType === 'percentage') {
          discountAmount = (calculatedPrice * discountValue) / 100
        } else if (discountType === 'fixed') {
          discountAmount = discountValue
        }
      }

      // Final price (cannot be negative)
      const finalPrice = Math.max(0, calculatedPrice - discountAmount)

      // Determine if we should show rate info (only when not using override rates)
      const usingDbRate = input.condominiumRate === undefined && input.unitRate === undefined && tieredRate

      return success({
        condominiumCount,
        unitCount,
        condominiumRate,
        unitRate,
        condominiumSubtotal,
        unitSubtotal,
        calculatedPrice,
        discountType,
        discountValue,
        discountAmount,
        finalPrice,
        // Rate info (null if using override or fallback)
        rateId: usingDbRate ? tieredRate.id : null,
        rateName: usingDbRate ? tieredRate.name : null,
        rateVersion: usingDbRate ? tieredRate.version : null,
        rateDescription: usingDbRate ? tieredRate.description : null,
        // Tier info
        minCondominiums: usingDbRate ? tieredRate.minCondominiums : null,
        maxCondominiums: usingDbRate ? tieredRate.maxCondominiums : null,
      })
    } catch (error) {
      return failure(
        `Failed to calculate pricing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INTERNAL_ERROR'
      )
    }
  }

  /**
   * Get active rate from database (for backwards compatibility)
   */
  async getActiveRate() {
    return this.ratesRepository.getActiveRate()
  }

  /**
   * Get rate for specific condominium count
   */
  async getRateForCondominiumCount(condominiumCount: number) {
    return this.ratesRepository.getRateForCondominiumCount(condominiumCount)
  }
}
