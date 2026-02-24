import type { TPaymentConceptService } from '@packages/domain'
import type { PaymentConceptServicesRepository, PaymentConceptsRepository, CondominiumServicesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ILinkServiceToConceptInput {
  paymentConceptId: string
  serviceId: string
  amount: number
  useDefaultAmount?: boolean
}

export class LinkServiceToConceptService {
  constructor(
    private readonly conceptServicesRepo: PaymentConceptServicesRepository,
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly servicesRepo: CondominiumServicesRepository
  ) {}

  async execute(input: ILinkServiceToConceptInput): Promise<TServiceResult<TPaymentConceptService>> {
    // Validate concept exists
    const concept = await this.conceptsRepo.getById(input.paymentConceptId)
    if (!concept) {
      return failure('Payment concept not found', 'NOT_FOUND')
    }

    // Validate service exists
    const service = await this.servicesRepo.getById(input.serviceId)
    if (!service) {
      return failure('Service not found', 'NOT_FOUND')
    }

    // Check if already linked
    const existingLinks = await this.conceptServicesRepo.listByConceptId(input.paymentConceptId)
    const alreadyLinked = existingLinks.some(link => link.serviceId === input.serviceId)
    if (alreadyLinked) {
      return failure('Service is already linked to this concept', 'CONFLICT')
    }

    try {
      const link = await this.conceptServicesRepo.linkService(
        input.paymentConceptId,
        input.serviceId,
        input.amount,
        input.useDefaultAmount ?? true
      )
      return success(link)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link service'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  /**
   * List all services linked to a concept.
   */
  async listByConceptId(conceptId: string) {
    return this.conceptServicesRepo.listByConceptId(conceptId)
  }

  /**
   * Unlink a service by link ID.
   */
  async unlinkById(linkId: string): Promise<TServiceResult<{ success: boolean }>> {
    const removed = await this.conceptServicesRepo.unlinkById(linkId)
    if (!removed) {
      return failure('Service link not found', 'NOT_FOUND')
    }
    return success({ success: true })
  }
}
