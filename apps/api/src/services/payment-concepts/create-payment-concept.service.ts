import type { TPaymentConcept, TPaymentConceptCreate } from '@packages/domain'
import type { PaymentConceptsRepository, CondominiumsRepository, CurrenciesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

type TCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

export interface ICreatePaymentConceptInput extends TPaymentConceptCreate {
  managementCompanyId: string
  createdBy: string
}

export class CreatePaymentConceptService {
  constructor(
    private readonly paymentConceptsRepo: PaymentConceptsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
    private readonly condominiumMCRepo: TCondominiumMCRepo
  ) {}

  async execute(input: ICreatePaymentConceptInput): Promise<TServiceResult<TPaymentConcept>> {
    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      return failure('Name is required', 'BAD_REQUEST')
    }

    if (!input.condominiumId) {
      return failure('Condominium ID is required', 'BAD_REQUEST')
    }

    // Validate scheduling for recurring concepts
    if (input.isRecurring) {
      if (!input.recurrencePeriod) {
        return failure('Recurrence period is required for recurring concepts', 'BAD_REQUEST')
      }
      if (input.issueDay == null) {
        return failure('Issue day is required for recurring concepts', 'BAD_REQUEST')
      }
      if (input.dueDay == null) {
        return failure('Due day is required for recurring concepts', 'BAD_REQUEST')
      }
    }

    // Validate day ranges
    if (input.issueDay != null && (input.issueDay < 1 || input.issueDay > 28)) {
      return failure('Issue day must be between 1 and 28', 'BAD_REQUEST')
    }
    if (input.dueDay != null && (input.dueDay < 1 || input.dueDay > 28)) {
      return failure('Due day must be between 1 and 28', 'BAD_REQUEST')
    }

    // Validate late payment config
    if (input.latePaymentType !== 'none') {
      if (input.latePaymentValue == null || input.latePaymentValue <= 0) {
        return failure('Late payment value must be greater than 0', 'BAD_REQUEST')
      }
      if (input.latePaymentType === 'percentage' && input.latePaymentValue > 100) {
        return failure('Late payment percentage cannot exceed 100%', 'BAD_REQUEST')
      }
    }

    // Validate early payment config
    if (input.earlyPaymentType !== 'none') {
      if (input.earlyPaymentValue == null || input.earlyPaymentValue <= 0) {
        return failure('Early payment value must be greater than 0', 'BAD_REQUEST')
      }
      if (input.earlyPaymentDaysBeforeDue <= 0) {
        return failure('Days before due must be greater than 0 for early payment discounts', 'BAD_REQUEST')
      }
      if (input.earlyPaymentType === 'percentage' && input.earlyPaymentValue > 100) {
        return failure('Early payment percentage cannot exceed 100%', 'BAD_REQUEST')
      }
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
      const concept = await this.paymentConceptsRepo.create(input)
      return success(concept)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create payment concept'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
