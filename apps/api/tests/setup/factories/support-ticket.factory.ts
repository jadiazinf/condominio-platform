import { faker } from '@faker-js/faker'
import type { TSupportTicketCreate } from '@packages/domain'

/**
 * Factory for creating support ticket test data.
 */
export class SupportTicketFactory {
  private static ticketCounter = 0

  /**
   * Generates a unique ticket number in format TICKET-YYYY-XXXXX
   */
  private static generateTicketNumber(): string {
    this.ticketCounter++
    const year = new Date().getFullYear()
    const number = String(this.ticketCounter).padStart(5, '0')
    return `TICKET-${year}-${number}`
  }

  /**
   * Resets the ticket counter (useful for test isolation)
   */
  static resetCounter(): void {
    this.ticketCounter = 0
  }

  /**
   * Creates fake data for a support ticket.
   */
  static create(overrides: Partial<TSupportTicketCreate> = {}): TSupportTicketCreate {
    return {
      ticketNumber: this.generateTicketNumber(),
      managementCompanyId: faker.string.uuid(),
      createdByUserId: faker.string.uuid(),
      createdByMemberId: null,
      subject: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      priority: 'medium',
      status: 'open',
      category: null,
      resolvedAt: null,
      resolvedBy: null,
      solution: null,
      closedAt: null,
      closedBy: null,
      metadata: null,
      tags: null,
      ...overrides,
    }
  }

  /**
   * Creates an open ticket.
   */
  static open(
    managementCompanyId: string,
    createdByUserId: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      status: 'open',
      ...overrides,
    })
  }

  /**
   * Creates an in-progress ticket.
   * Note: Assignment is now handled via the assignment history table.
   */
  static inProgress(
    managementCompanyId: string,
    createdByUserId: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      status: 'in_progress',
      ...overrides,
    })
  }

  /**
   * Creates a resolved ticket.
   */
  static resolved(
    managementCompanyId: string,
    createdByUserId: string,
    resolvedBy: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      status: 'resolved',
      resolvedBy,
      resolvedAt: new Date(),
      ...overrides,
    })
  }

  /**
   * Creates a closed ticket.
   */
  static closed(
    managementCompanyId: string,
    createdByUserId: string,
    closedBy: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      status: 'closed',
      closedBy,
      closedAt: new Date(),
      ...overrides,
    })
  }

  /**
   * Creates an urgent ticket.
   */
  static urgent(
    managementCompanyId: string,
    createdByUserId: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      priority: 'urgent',
      ...overrides,
    })
  }

  /**
   * Creates a high priority ticket.
   */
  static highPriority(
    managementCompanyId: string,
    createdByUserId: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      priority: 'high',
      ...overrides,
    })
  }

  /**
   * Creates a technical support ticket.
   */
  static technical(
    managementCompanyId: string,
    createdByUserId: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      category: 'technical',
      subject: 'Technical Issue: ' + faker.lorem.words(3),
      ...overrides,
    })
  }

  /**
   * Creates a billing support ticket.
   */
  static billing(
    managementCompanyId: string,
    createdByUserId: string,
    overrides: Partial<TSupportTicketCreate> = {}
  ): TSupportTicketCreate {
    return this.create({
      managementCompanyId,
      createdByUserId,
      category: 'billing',
      subject: 'Billing Issue: ' + faker.lorem.words(3),
      ...overrides,
    })
  }
}
