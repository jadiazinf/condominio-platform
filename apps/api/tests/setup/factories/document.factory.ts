import { faker } from '@faker-js/faker'
import type { TDocumentCreate } from '@packages/domain'

/**
 * Factory for creating document test data.
 */
export class DocumentFactory {
  /**
   * Creates fake data for a document.
   */
  static create(overrides: Partial<TDocumentCreate> = {}): TDocumentCreate {
    return {
      condominiumId: null,
      buildingId: null,
      unitId: null,
      userId: null,
      paymentId: null,
      quotaId: null,
      expenseId: null,
      documentType: 'receipt',
      title: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      fileUrl: faker.internet.url(),
      fileName: faker.system.fileName(),
      fileSize: faker.number.int({ min: 1000, max: 10000000 }),
      fileType: 'application/pdf',
      documentDate: null,
      documentNumber: null,
      isPublic: false,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a receipt document.
   */
  static receipt(overrides: Partial<TDocumentCreate> = {}): TDocumentCreate {
    return this.create({
      documentType: 'receipt',
      title: 'Recibo de Pago',
      ...overrides,
    })
  }

  /**
   * Creates an invoice document.
   */
  static invoice(overrides: Partial<TDocumentCreate> = {}): TDocumentCreate {
    return this.create({
      documentType: 'invoice',
      title: 'Factura',
      ...overrides,
    })
  }

  /**
   * Creates a statement document.
   */
  static statement(overrides: Partial<TDocumentCreate> = {}): TDocumentCreate {
    return this.create({
      documentType: 'statement',
      title: 'Estado de Cuenta',
      ...overrides,
    })
  }

  /**
   * Creates a contract document.
   */
  static contract(overrides: Partial<TDocumentCreate> = {}): TDocumentCreate {
    return this.create({
      documentType: 'contract',
      title: 'Contrato',
      isPublic: false,
      ...overrides,
    })
  }
}
