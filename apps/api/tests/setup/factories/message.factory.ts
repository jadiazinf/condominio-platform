import { faker } from '@faker-js/faker'
import type { TMessageCreate } from '@packages/domain'

/**
 * Factory for creating message test data.
 */
export class MessageFactory {
  /**
   * Creates fake data for a message.
   */
  static create(overrides: Partial<TMessageCreate> = {}): TMessageCreate {
    return {
      senderId: faker.string.uuid(),
      recipientType: 'user',
      recipientUserId: faker.string.uuid(),
      recipientCondominiumId: null,
      recipientBuildingId: null,
      recipientUnitId: null,
      subject: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(2),
      messageType: 'message',
      priority: 'normal',
      isRead: false,
      readAt: null,
      metadata: null,
      registeredBy: null,
      attachments: null,
      ...overrides,
    }
  }

  /**
   * Creates a message to a user.
   */
  static toUser(
    senderId: string,
    recipientUserId: string,
    overrides: Partial<TMessageCreate> = {}
  ): TMessageCreate {
    return this.create({
      senderId,
      recipientType: 'user',
      recipientUserId,
      ...overrides,
    })
  }

  /**
   * Creates a notification.
   */
  static notification(overrides: Partial<TMessageCreate> = {}): TMessageCreate {
    return this.create({
      messageType: 'notification',
      ...overrides,
    })
  }

  /**
   * Creates an announcement.
   */
  static announcement(
    senderId: string,
    condominiumId: string,
    overrides: Partial<TMessageCreate> = {}
  ): TMessageCreate {
    return this.create({
      senderId,
      recipientType: 'condominium',
      recipientCondominiumId: condominiumId,
      recipientUserId: null,
      messageType: 'announcement',
      priority: 'high',
      ...overrides,
    })
  }

  /**
   * Creates an urgent message.
   */
  static urgent(overrides: Partial<TMessageCreate> = {}): TMessageCreate {
    return this.create({
      priority: 'urgent',
      ...overrides,
    })
  }
}
