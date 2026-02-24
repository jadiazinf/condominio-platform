import type { TCondominiumService } from '@packages/domain'
import type { CondominiumServicesRepository, CurrenciesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export class CreateDefaultServicesService {
  constructor(
    private readonly servicesRepo: CondominiumServicesRepository,
    private readonly currenciesRepo: CurrenciesRepository
  ) {}

  /**
   * Creates default services (Gastos Comunes, Fondo de Reserva) for a condominium.
   * Skips creation if they already exist.
   */
  async execute(condominiumId: string, currencyId: string, createdBy: string): Promise<TServiceResult<TCondominiumService[]>> {
    // Validate currency
    const currency = await this.currenciesRepo.getById(currencyId)
    if (!currency) {
      return failure('Currency not found', 'NOT_FOUND')
    }

    // Check if defaults already exist
    const existing = await this.servicesRepo.getDefaultsByCondominiumId(condominiumId)
    if (existing.length > 0) {
      return success(existing)
    }

    try {
      const defaults = [
        {
          condominiumId,
          name: 'Gastos Comunes',
          description: 'Gastos comunes ordinarios del condominio',
          providerType: 'internal' as const,
          currencyId,
          isDefault: true,
          createdBy,
        },
        {
          condominiumId,
          name: 'Fondo de Reserva',
          description: 'Fondo de reserva del condominio para gastos extraordinarios',
          providerType: 'internal' as const,
          currencyId,
          isDefault: true,
          createdBy,
        },
      ]

      const created: TCondominiumService[] = []
      for (const data of defaults) {
        const service = await this.servicesRepo.create(data as any)
        created.push(service)
      }

      return success(created)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create default services'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
