import type { Hono } from 'hono'
import {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  PaymentConceptBankAccountsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
  BuildingsRepository,
  UnitsRepository,
  QuotasRepository,
  BankAccountsRepository,
  PaymentConceptServicesRepository,
  CondominiumServicesRepository,
} from '@database/repositories'
import { McPaymentConceptsController } from '../controllers/payment-concepts/mc-payment-concepts.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class McPaymentConceptsEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: McPaymentConceptsController

  constructor(db: TDrizzleClient) {
    const conceptsRepo = new PaymentConceptsRepository(db)
    const assignmentsRepo = new PaymentConceptAssignmentsRepository(db)
    const conceptBankAccountsRepo = new PaymentConceptBankAccountsRepository(db)
    const condominiumsRepo = new CondominiumsRepository(db)
    const currenciesRepo = new CurrenciesRepository(db)
    const buildingsRepo = new BuildingsRepository(db)
    const unitsRepo = new UnitsRepository(db)
    const quotasRepo = new QuotasRepository(db)
    const bankAccountsRepo = new BankAccountsRepository(db)
    const conceptServicesRepo = new PaymentConceptServicesRepository(db)
    const condominiumServicesRepo = new CondominiumServicesRepository(db)

    // For condominiumMCRepo, we use the condominiums repo's method
    // The CondominiumsRepository should have a way to check MC association
    // We'll use a simple adapter
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

    // For bankAccountCondominiumsRepo, adapter to check bank account-condominium association
    const bankAccountCondominiumsRepo = {
      getByBankAccountAndCondominium: async (bankAccountId: string, condominiumId: string) => {
        const bankAccount = await bankAccountsRepo.getByIdWithCondominiums(bankAccountId)
        if (!bankAccount) return null
        if (bankAccount.appliesToAllCondominiums) return { id: bankAccountId }
        if (bankAccount.condominiumIds?.includes(condominiumId)) return { id: bankAccountId }
        return null
      },
    }

    this.controller = new McPaymentConceptsController({
      db,
      conceptsRepo,
      assignmentsRepo,
      conceptBankAccountsRepo,
      condominiumsRepo,
      currenciesRepo,
      condominiumMCRepo,
      bankAccountsRepo,
      bankAccountCondominiumsRepo,
      buildingsRepo,
      unitsRepo,
      quotasRepo,
      conceptServicesRepo,
      condominiumServicesRepo,
    })
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
