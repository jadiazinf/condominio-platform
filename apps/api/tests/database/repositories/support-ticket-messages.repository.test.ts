import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  SupportTicketMessagesRepository,
  SupportTicketsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  SupportTicketFactory,
  SupportTicketMessageFactory,
  UserFactory,
  ManagementCompanyFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('SupportTicketMessagesRepository', () => {
  let db: TTestDrizzleClient
  let repository: SupportTicketMessagesRepository
  let ticketsRepository: SupportTicketsRepository
  let ticketId: string
  let userId: string
  let supportUserId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new SupportTicketMessagesRepository(db)
    ticketsRepository = new SupportTicketsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Reset the ticket counter for test isolation
    SupportTicketFactory.resetCounter()

    const usersRepository = new UsersRepository(db)
    const managementCompaniesRepository = new ManagementCompaniesRepository(db)

    // Create test users
    const user = await usersRepository.create(UserFactory.create())
    const supportUser = await usersRepository.create(UserFactory.create())

    // Create test management company
    const company = await managementCompaniesRepository.create(
      ManagementCompanyFactory.create()
    )

    // Create test ticket
    const ticket = await ticketsRepository.create(
      SupportTicketFactory.open(company.id, user.id)
    )

    userId = user.id
    supportUserId = supportUser.id
    ticketId = ticket.id
  })

  describe('create', () => {
    it('should create a customer message', async () => {
      const data = SupportTicketMessageFactory.customerMessage(ticketId, userId, {
        message: 'I need help with my account',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.ticketId).toBe(ticketId)
      expect(result.userId).toBe(userId)
      expect(result.message).toBe('I need help with my account')
      expect(result.isInternal).toBe(false)
    })

    it('should create an internal message', async () => {
      const data = SupportTicketMessageFactory.internalMessage(ticketId, supportUserId, {
        message: 'Internal note: Customer needs follow-up',
      })

      const result = await repository.create(data)

      expect(result.isInternal).toBe(true)
    })

    it('should create a message with attachments', async () => {
      const data = SupportTicketMessageFactory.withAttachments(ticketId, userId)

      const result = await repository.create(data)

      expect(result.attachments).toBeDefined()
      expect(result.attachments).toHaveLength(2)
      expect(result.attachments?.[0]?.name).toBe('document.pdf')
    })
  })

  describe('getById', () => {
    it('should return message by id', async () => {
      const created = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId)
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('listByTicketId', () => {
    it('should return messages for a ticket with user info', async () => {
      await repository.create(SupportTicketMessageFactory.customerMessage(ticketId, userId))
      await repository.create(
        SupportTicketMessageFactory.supportResponse(ticketId, supportUserId)
      )

      const result = await repository.listByTicketId(ticketId)

      expect(result).toHaveLength(2)
      // Should include user information
      expect(result[0]?.user).toBeDefined()
    })

    it('should return messages ordered by createdAt descending', async () => {
      const msg1 = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId, {
          message: 'First message',
        })
      )

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      const msg2 = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId, {
          message: 'Second message',
        })
      )

      const result = await repository.listByTicketId(ticketId)

      // Most recent should be first
      expect(result[0]?.id).toBe(msg2.id)
      expect(result[1]?.id).toBe(msg1.id)
    })

    it('should return empty array for ticket with no messages', async () => {
      const result = await repository.listByTicketId(ticketId)
      expect(result).toHaveLength(0)
    })
  })

  describe('getLatestMessage', () => {
    it('should return the latest message', async () => {
      await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId, {
          message: 'First message',
        })
      )

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      const latestMsg = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId, {
          message: 'Latest message',
        })
      )

      const result = await repository.getLatestMessage(ticketId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(latestMsg.id)
      expect(result?.message).toBe('Latest message')
    })

    it('should return null for ticket with no messages', async () => {
      const result = await repository.getLatestMessage(ticketId)
      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update message content', async () => {
      const created = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId, {
          message: 'Original message',
        })
      )

      const result = await repository.update(created.id, {
        message: 'Updated message',
      })

      expect(result).toBeDefined()
      expect(result?.message).toBe('Updated message')
    })

    it('should update isInternal flag', async () => {
      const created = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId)
      )

      const result = await repository.update(created.id, {
        isInternal: true,
      })

      expect(result?.isInternal).toBe(true)
    })

    it('should return null for non-existent message', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        message: 'Updated',
      })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete message', async () => {
      const created = await repository.create(
        SupportTicketMessageFactory.customerMessage(ticketId, userId)
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent message', async () => {
      const result = await repository.delete('00000000-0000-0000-0000-000000000000')
      expect(result).toBe(false)
    })
  })
})
