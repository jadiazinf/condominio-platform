import { faker } from '@faker-js/faker'
import type { TSupportTicketMessageCreate } from '@packages/domain'

/**
 * Factory for creating support ticket message test data.
 */
export class SupportTicketMessageFactory {
  /**
   * Creates fake data for a support ticket message.
   */
  static create(overrides: Partial<TSupportTicketMessageCreate> = {}): TSupportTicketMessageCreate {
    return {
      ticketId: faker.string.uuid(),
      userId: faker.string.uuid(),
      message: faker.lorem.paragraphs(1),
      isInternal: false,
      attachments: null,
      ...overrides,
    }
  }

  /**
   * Creates a customer message (external, visible to everyone).
   */
  static customerMessage(
    ticketId: string,
    userId: string,
    overrides: Partial<TSupportTicketMessageCreate> = {}
  ): TSupportTicketMessageCreate {
    return this.create({
      ticketId,
      userId,
      isInternal: false,
      ...overrides,
    })
  }

  /**
   * Creates an internal message (only visible to support staff).
   */
  static internalMessage(
    ticketId: string,
    userId: string,
    overrides: Partial<TSupportTicketMessageCreate> = {}
  ): TSupportTicketMessageCreate {
    return this.create({
      ticketId,
      userId,
      isInternal: true,
      ...overrides,
    })
  }

  /**
   * Creates a message with attachments.
   */
  static withAttachments(
    ticketId: string,
    userId: string,
    overrides: Partial<TSupportTicketMessageCreate> = {}
  ): TSupportTicketMessageCreate {
    return this.create({
      ticketId,
      userId,
      attachments: [
        {
          name: 'document.pdf',
          url: faker.internet.url(),
          size: faker.number.int({ min: 1000, max: 5000000 }),
          mimeType: 'application/pdf',
        },
        {
          name: 'screenshot.png',
          url: faker.internet.url(),
          size: faker.number.int({ min: 1000, max: 2000000 }),
          mimeType: 'image/png',
        },
      ],
      ...overrides,
    })
  }

  /**
   * Creates a support staff response.
   */
  static supportResponse(
    ticketId: string,
    supportUserId: string,
    overrides: Partial<TSupportTicketMessageCreate> = {}
  ): TSupportTicketMessageCreate {
    return this.create({
      ticketId,
      userId: supportUserId,
      message: faker.lorem.paragraphs(2),
      isInternal: false,
      ...overrides,
    })
  }
}
