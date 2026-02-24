import type { TCondominiumService, TCondominiumServiceCreate } from '@packages/domain'
import type { CondominiumServicesRepository, CondominiumsRepository, CurrenciesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

type TCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

export interface ICreateCondominiumServiceInput extends TCondominiumServiceCreate {
  managementCompanyId: string
  createdBy: string
}

export class CreateCondominiumServiceService {
  constructor(
    private readonly servicesRepo: CondominiumServicesRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
    private readonly condominiumMCRepo: TCondominiumMCRepo
  ) {}

  async execute(input: ICreateCondominiumServiceInput): Promise<TServiceResult<TCondominiumService>> {
    if (!input.name || input.name.trim().length === 0) {
      return failure('Name is required', 'BAD_REQUEST')
    }

    if (!input.condominiumId) {
      return failure('Condominium ID is required', 'BAD_REQUEST')
    }

    // Validate condominium exists
    const condominium = await this.condominiumsRepo.getById(input.condominiumId)
    if (!condominium) {
      return failure('Condominium not found', 'NOT_FOUND')
    }

    // Validate condominium belongs to MC
    const condominiumMC = await this.condominiumMCRepo.getByCondominiumAndMC(
      input.condominiumId,
      input.managementCompanyId
    )
    if (!condominiumMC) {
      return failure('Condominium not found in your management company', 'NOT_FOUND')
    }

    // Validate currency exists
    const currency = await this.currenciesRepo.getById(input.currencyId)
    if (!currency) {
      return failure('Currency not found', 'NOT_FOUND')
    }

    try {
      const service = await this.servicesRepo.create({
        ...input,
        createdBy: input.createdBy,
      } as TCondominiumServiceCreate & { createdBy: string })
      return success(service)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create service'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
