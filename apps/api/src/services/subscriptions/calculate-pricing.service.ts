import { eq, sql, and } from 'drizzle-orm'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { SubscriptionRatesRepository } from '@database/repositories'
import {
  condominiumManagementCompanies,
  buildings,
  units,
  managementCompanyMembers,
} from '@database/drizzle/schema'
import { type TServiceResult, success, failure } from '../base.service'
import type { TDiscountType, TBillingCycle } from '@packages/domain'

export interface IPricingCalculationInput {
  managementCompanyId: string
  rateId?: string // Optional specific rate to use instead of tiered pricing
  condominiumRate?: number
  unitRate?: number
  userRate?: number
  billingCycle?: TBillingCycle
  discountType?: TDiscountType | null
  discountValue?: number | null
  // Override counts (for subscription limits instead of actual counts)
  condominiumCount?: number
  unitCount?: number
  userCount?: number
}

export interface IPricingCalculationResult {
  condominiumCount: number
  unitCount: number
  userCount: number
  condominiumRate: number
  unitRate: number
  userRate: number
  condominiumSubtotal: number
  unitSubtotal: number
  userSubtotal: number
  monthlyBasePrice: number // Price for 1 month (before multiplying by billing months)
  billingMonths: number // 1 for monthly, 12 for annual
  calculatedPrice: number // monthlyBasePrice × billingMonths
  discountType: TDiscountType | null
  discountValue: number | null
  discountAmount: number
  annualDiscountPercentage: number
  annualDiscountAmount: number
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
 * Service for calculating subscription pricing based on condominiums, units, and users.
 * Supports tiered pricing based on condominium count and automatic annual discounts.
 *
 * Formula: (condominiumRate × condominiums) + (unitRate × units) + (userRate × users) - manualDiscount - annualDiscount
 *
 * Annual discount is automatically applied when billingCycle is 'annual' (default 15%)
 */
export class CalculatePricingService {
  private readonly ratesRepository: SubscriptionRatesRepository

  constructor(private readonly db: TDrizzleClient) {
    this.ratesRepository = new SubscriptionRatesRepository(db)
  }

  async execute(input: IPricingCalculationInput): Promise<TServiceResult<IPricingCalculationResult>> {
    const {
      managementCompanyId,
      billingCycle = 'monthly',
      discountType = null,
      discountValue = null,
    } = input

    try {
      // Use provided counts or get from database
      let condominiumCount: number
      let unitCount: number
      let userCount: number

      if (input.condominiumCount !== undefined || input.unitCount !== undefined || input.userCount !== undefined) {
        // Using subscription limits (maxCondominiums, maxUnits, maxUsers from form)
        condominiumCount = input.condominiumCount ?? 0
        unitCount = input.unitCount ?? 0
        userCount = input.userCount ?? 0
      } else {
        // Get actual counts from database (for existing subscriptions or when limits not provided)
        const condominiumCountResult = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(condominiumManagementCompanies)
          .where(eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId))

        condominiumCount = condominiumCountResult[0]?.count ?? 0

        const unitCountResult = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(units)
          .innerJoin(buildings, eq(units.buildingId, buildings.id))
          .innerJoin(
            condominiumManagementCompanies,
            eq(buildings.condominiumId, condominiumManagementCompanies.condominiumId)
          )
          .where(eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId))

        unitCount = unitCountResult[0]?.count ?? 0

        const userCountResult = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(managementCompanyMembers)
          .where(
            and(
              eq(managementCompanyMembers.managementCompanyId, managementCompanyId),
              eq(managementCompanyMembers.isActive, true)
            )
          )

        userCount = userCountResult[0]?.count ?? 0
      }

      // Get the appropriate rate - use specific rateId if provided, otherwise use tiered pricing
      let tieredRate = null
      if (input.rateId) {
        // Fetch specific rate by ID
        tieredRate = await this.ratesRepository.getById(input.rateId)
        if (!tieredRate) {
          return failure(
            `No se encontró la tarifa con ID: ${input.rateId}`,
            'BAD_REQUEST'
          )
        }
      } else {
        // Use tiered pricing based on condominium count
        tieredRate = await this.ratesRepository.getRateForCondominiumCount(condominiumCount)
      }

      // If no rate in DB and no override provided, return error
      if (!tieredRate && input.condominiumRate === undefined && input.unitRate === undefined && input.userRate === undefined) {
        return failure(
          'No hay tarifas de suscripción configuradas. Por favor, configure una tarifa activa antes de continuar.',
          'BAD_REQUEST'
        )
      }

      // Use provided rates or DB rates (no fallback)
      const condominiumRate = input.condominiumRate ?? tieredRate?.condominiumRate ?? 0
      const unitRate = input.unitRate ?? tieredRate?.unitRate ?? 0
      const userRate = input.userRate ?? tieredRate?.userRate ?? 0
      const annualDiscountPercentage = tieredRate?.annualDiscountPercentage ?? 15

      // Calculate subtotals (monthly rates)
      const condominiumSubtotal = condominiumRate * condominiumCount
      const unitSubtotal = unitRate * unitCount
      const userSubtotal = userRate * userCount
      const monthlyBasePrice = condominiumSubtotal + unitSubtotal + userSubtotal

      // Determine billing months based on billing cycle
      let billingMonths = 1
      switch (billingCycle) {
        case 'monthly':
          billingMonths = 1
          break
        case 'quarterly':
          billingMonths = 3
          break
        case 'semi_annual':
          billingMonths = 6
          break
        case 'annual':
          billingMonths = 12
          break
        case 'custom':
          // For custom, default to 1 month (can be overridden in the future)
          billingMonths = 1
          break
        default:
          billingMonths = 1
      }

      // Calculate price for the billing period (monthly × months)
      const calculatedPrice = monthlyBasePrice * billingMonths

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

      // Calculate manual discount
      let discountAmount = 0
      if (discountType && discountValue && discountValue > 0) {
        if (discountType === 'percentage') {
          discountAmount = (calculatedPrice * discountValue) / 100
        } else if (discountType === 'fixed') {
          discountAmount = discountValue
        }
      }

      // Calculate annual discount (applied automatically for annual subscriptions)
      let annualDiscountAmount = 0
      if (billingCycle === 'annual' && annualDiscountPercentage > 0) {
        annualDiscountAmount = (calculatedPrice * annualDiscountPercentage) / 100
      }

      // Final price (cannot be negative)
      const finalPrice = Math.max(0, calculatedPrice - discountAmount - annualDiscountAmount)

      // Determine if we should show rate info (only when not using override rates)
      const usingDbRate = input.condominiumRate === undefined && input.unitRate === undefined && input.userRate === undefined && tieredRate

      return success({
        condominiumCount,
        unitCount,
        userCount,
        condominiumRate,
        unitRate,
        userRate,
        condominiumSubtotal,
        unitSubtotal,
        userSubtotal,
        monthlyBasePrice,
        billingMonths,
        calculatedPrice,
        discountType,
        discountValue,
        discountAmount,
        annualDiscountPercentage,
        annualDiscountAmount,
        finalPrice,
        // Rate info (null if using override or fallback)
        rateId: usingDbRate && tieredRate ? tieredRate.id : null,
        rateName: usingDbRate && tieredRate ? tieredRate.name : null,
        rateVersion: usingDbRate && tieredRate ? tieredRate.version : null,
        rateDescription: usingDbRate && tieredRate ? tieredRate.description : null,
        // Tier info
        minCondominiums: usingDbRate && tieredRate ? tieredRate.minCondominiums : null,
        maxCondominiums: usingDbRate && tieredRate ? tieredRate.maxCondominiums : null,
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
