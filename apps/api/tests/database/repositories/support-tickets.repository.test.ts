import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  SupportTicketsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  SupportTicketFactory,
  UserFactory,
  ManagementCompanyFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('SupportTicketsRepository', () => {
  let db: TTestDrizzleClient
  let repository: SupportTicketsRepository
  let managementCompanyId: string
  let createdByUserId: string
  let assignedUserId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new SupportTicketsRepository(db)
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
    const createdByUser = await usersRepository.create(UserFactory.create())
    const assignedUser = await usersRepository.create(UserFactory.create())

    // Create test management company
    const company = await managementCompaniesRepository.create(
      ManagementCompanyFactory.create()
    )

    createdByUserId = createdByUser.id
    assignedUserId = assignedUser.id
    managementCompanyId = company.id
  })

  describe('create', () => {
    it('should create a support ticket', async () => {
      const data = SupportTicketFactory.open(managementCompanyId, createdByUserId, {
        subject: 'Test Support Ticket',
        description: 'This is a test ticket',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.ticketNumber).toMatch(/^TICKET-\d{4}-\d{5}$/)
      expect(result.managementCompanyId).toBe(managementCompanyId)
      expect(result.createdByUserId).toBe(createdByUserId)
      expect(result.subject).toBe('Test Support Ticket')
      expect(result.status).toBe('open')
    })

    it('should create an urgent ticket', async () => {
      const data = SupportTicketFactory.urgent(managementCompanyId, createdByUserId)

      const result = await repository.create(data)

      expect(result.priority).toBe('urgent')
    })

    it('should create a technical support ticket', async () => {
      const data = SupportTicketFactory.technical(managementCompanyId, createdByUserId)

      const result = await repository.create(data)

      expect(result.category).toBe('technical')
    })
  })

  describe('getById', () => {
    it('should return ticket by id', async () => {
      const created = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.ticketNumber).toBe(created.ticketNumber)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('getByTicketNumber', () => {
    it('should return ticket by ticket number', async () => {
      const created = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.getByTicketNumber(created.ticketNumber)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent ticket number', async () => {
      const result = await repository.getByTicketNumber('TICKET-9999-99999')
      expect(result).toBeNull()
    })
  })

  describe('listByCompanyId', () => {
    it('should return tickets for a company', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))

      const result = await repository.listByCompanyId(managementCompanyId)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('should filter by status', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(
        SupportTicketFactory.inProgress(managementCompanyId, createdByUserId, assignedUserId)
      )

      const result = await repository.listByCompanyId(managementCompanyId, { status: 'open' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.status).toBe('open')
    })

    it('should filter by priority', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(SupportTicketFactory.urgent(managementCompanyId, createdByUserId))

      const result = await repository.listByCompanyId(managementCompanyId, { priority: 'urgent' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.priority).toBe('urgent')
    })

    it('should filter by assignedTo', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(
        SupportTicketFactory.inProgress(managementCompanyId, createdByUserId, assignedUserId)
      )

      const result = await repository.listByCompanyId(managementCompanyId, {
        assignedTo: assignedUserId,
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.assignedTo).toBe(assignedUserId)
    })

    it('should search by ticket number', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))

      const result = await repository.listByCompanyId(managementCompanyId, {
        search: ticket.ticketNumber,
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.ticketNumber).toBe(ticket.ticketNumber)
    })

    it('should paginate results', async () => {
      // Create 5 tickets
      for (let i = 0; i < 5; i++) {
        await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      }

      const result = await repository.listByCompanyId(managementCompanyId, { page: 1, limit: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(2)
      expect(result.pagination.total).toBe(5)
      expect(result.pagination.totalPages).toBe(3)
    })
  })

  describe('findAll', () => {
    it('should return all tickets', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))

      const result = await repository.findAll()

      expect(result.data).toHaveLength(2)
    })

    it('should filter by status', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(
        SupportTicketFactory.resolved(managementCompanyId, createdByUserId, assignedUserId)
      )

      const result = await repository.findAll({ status: 'resolved' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.status).toBe('resolved')
    })
  })

  describe('assignTicket', () => {
    it('should assign ticket to a user', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.assignTicket(ticket.id, assignedUserId)

      expect(result).toBeDefined()
      expect(result?.assignedTo).toBe(assignedUserId)
      expect(result?.assignedAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent ticket', async () => {
      const result = await repository.assignTicket(
        '00000000-0000-0000-0000-000000000000',
        assignedUserId
      )
      expect(result).toBeNull()
    })
  })

  describe('updateStatus', () => {
    it('should update ticket status', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.updateStatus(ticket.id, 'in_progress')

      expect(result).toBeDefined()
      expect(result?.status).toBe('in_progress')
    })
  })

  describe('markAsResolved', () => {
    it('should mark ticket as resolved', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.markAsResolved(ticket.id, assignedUserId)

      expect(result).toBeDefined()
      expect(result?.status).toBe('resolved')
      expect(result?.resolvedBy).toBe(assignedUserId)
      expect(result?.resolvedAt).toBeInstanceOf(Date)
    })
  })

  describe('closeTicket', () => {
    it('should close ticket', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.closeTicket(ticket.id, assignedUserId)

      expect(result).toBeDefined()
      expect(result?.status).toBe('closed')
      expect(result?.closedBy).toBe(assignedUserId)
      expect(result?.closedAt).toBeInstanceOf(Date)
    })
  })

  describe('getOpenTicketsCount', () => {
    it('should return count of open tickets', async () => {
      await repository.create(SupportTicketFactory.open(managementCompanyId, createdByUserId))
      await repository.create(
        SupportTicketFactory.inProgress(managementCompanyId, createdByUserId, assignedUserId)
      )
      await repository.create(
        SupportTicketFactory.closed(managementCompanyId, createdByUserId, assignedUserId)
      )

      const count = await repository.getOpenTicketsCount(managementCompanyId)

      // open and in_progress count as "open" tickets
      expect(count).toBe(2)
    })
  })

  describe('update', () => {
    it('should update ticket fields', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.update(ticket.id, {
        subject: 'Updated Subject',
        priority: 'high',
      })

      expect(result).toBeDefined()
      expect(result?.subject).toBe('Updated Subject')
      expect(result?.priority).toBe('high')
    })

    it('should return null for non-existent ticket', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        subject: 'Updated',
      })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete ticket', async () => {
      const ticket = await repository.create(
        SupportTicketFactory.open(managementCompanyId, createdByUserId)
      )

      const result = await repository.delete(ticket.id)

      expect(result).toBe(true)

      const found = await repository.getById(ticket.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent ticket', async () => {
      const result = await repository.delete('00000000-0000-0000-0000-000000000000')
      expect(result).toBe(false)
    })
  })
})
