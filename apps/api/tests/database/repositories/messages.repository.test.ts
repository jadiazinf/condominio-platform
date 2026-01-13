import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  MessagesRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  MessageFactory,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('MessagesRepository', () => {
  let db: TTestDrizzleClient
  let repository: MessagesRepository
  let senderId: string
  let recipientId: string
  let condominiumId: string
  let buildingId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new MessagesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const usersRepository = new UsersRepository(db)
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)

    const sender = await usersRepository.create(UserFactory.create())
    const recipient = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))

    senderId = sender.id
    recipientId = recipient.id
    condominiumId = condominium.id
    buildingId = building.id
  })

  describe('create', () => {
    it('should create message to user', async () => {
      const data = MessageFactory.toUser(senderId, recipientId, {
        subject: 'Test Message',
        body: 'This is a test message',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.senderId).toBe(senderId)
      expect(result.recipientUserId).toBe(recipientId)
      expect(result.recipientType).toBe('user')
      expect(result.subject).toBe('Test Message')
      expect(result.isRead).toBe(false)
    })

    it('should create notification', async () => {
      const data = MessageFactory.notification({
        senderId,
        recipientUserId: recipientId,
      })

      const result = await repository.create(data)

      expect(result.messageType).toBe('notification')
    })

    it('should create announcement', async () => {
      const data = MessageFactory.announcement(senderId, condominiumId)

      const result = await repository.create(data)

      expect(result.messageType).toBe('announcement')
      expect(result.recipientType).toBe('condominium')
      expect(result.recipientCondominiumId).toBe(condominiumId)
    })

    it('should create urgent message', async () => {
      const data = MessageFactory.urgent({
        senderId,
        recipientUserId: recipientId,
      })

      const result = await repository.create(data)

      expect(result.priority).toBe('urgent')
    })
  })

  describe('getById', () => {
    it('should return message by id', async () => {
      const created = await repository.create(MessageFactory.toUser(senderId, recipientId))

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all messages', async () => {
      await repository.create(MessageFactory.toUser(senderId, recipientId))
      await repository.create(MessageFactory.announcement(senderId, condominiumId))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete message', async () => {
      const created = await repository.create(MessageFactory.toUser(senderId, recipientId))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getBySenderId', () => {
    it('should return messages from sender', async () => {
      await repository.create(MessageFactory.toUser(senderId, recipientId))
      await repository.create(MessageFactory.announcement(senderId, condominiumId))

      const result = await repository.getBySenderId(senderId)

      expect(result).toHaveLength(2)
      expect(result.every(m => m.senderId === senderId)).toBe(true)
    })
  })

  describe('getByRecipientUserId', () => {
    it('should return messages for recipient', async () => {
      await repository.create(MessageFactory.toUser(senderId, recipientId))
      await repository.create(
        MessageFactory.notification({ senderId, recipientUserId: recipientId })
      )

      const result = await repository.getByRecipientUserId(recipientId)

      expect(result).toHaveLength(2)
      expect(result.every(m => m.recipientUserId === recipientId)).toBe(true)
    })
  })

  describe('getByCondominiumId', () => {
    it('should return messages for condominium', async () => {
      await repository.create(MessageFactory.announcement(senderId, condominiumId))

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(1)
      expect(result[0]?.recipientCondominiumId).toBe(condominiumId)
    })
  })

  describe('getUnreadByUserId', () => {
    it('should return unread messages for user', async () => {
      await repository.create(MessageFactory.toUser(senderId, recipientId, { isRead: false }))
      await repository.create(MessageFactory.toUser(senderId, recipientId, { isRead: true }))

      const result = await repository.getUnreadByUserId(recipientId)

      expect(result).toHaveLength(1)
      expect(result[0]?.isRead).toBe(false)
    })
  })

  // NOTE: Method getByMessageType does not exist in MessagesRepository
  // describe('getByMessageType', () => {
  //   it('should return messages by type', async () => {
  //     await repository.create(MessageFactory.toUser(senderId, recipientId))
  //     await repository.create(MessageFactory.notification({ senderId, recipientUserId: recipientId }))
  //     await repository.create(MessageFactory.announcement(senderId, condominiumId))

  //     const result = await repository.getByMessageType('notification')

  //     expect(result).toHaveLength(1)
  //     expect(result[0]?.messageType).toBe('notification')
  //   })
  // })

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const created = await repository.create(
        MessageFactory.toUser(senderId, recipientId, { isRead: false })
      )

      const result = await repository.markAsRead(created.id)

      expect(result).toBeDefined()
      expect(result?.isRead).toBe(true)
      expect(result?.readAt).toBeInstanceOf(Date)
    })
  })
})
