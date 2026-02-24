import type { Hono } from 'hono'
import { CondominiumServicesRepository, CondominiumsRepository, CurrenciesRepository } from '@database/repositories'
import { McCondominiumServicesController } from '../controllers/condominium-services/mc-condominium-services.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class McCondominiumServicesEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: McCondominiumServicesController

  constructor(db: TDrizzleClient) {
    const servicesRepo = new CondominiumServicesRepository(db)
    const condominiumsRepo = new CondominiumsRepository(db)
    const currenciesRepo = new CurrenciesRepository(db)

    const condominiumMCRepo = {
      getByCondominiumAndMC: async (condominiumId: string, mcId: string) => {
        const condominium = await condominiumsRepo.getById(condominiumId)
        if (!condominium) return null
        if (condominium.managementCompanyIds?.includes(mcId)) {
          return { id: condominiumId }
        }
        return null
      },
    }

    this.controller = new McCondominiumServicesController({
      servicesRepo,
      condominiumsRepo,
      currenciesRepo,
      condominiumMCRepo,
    })
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
