import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UserFactory,
  ManagementCompanyFactory,
  AdminInvitationFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'
import { hashToken } from '@src/utils/token'

describe('AdminInvitationsRepository', () => {
  let db: TTestDrizzleClient
  let repository: AdminInvitationsRepository
  let usersRepository: UsersRepository
  let managementCompaniesRepository: ManagementCompaniesRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new AdminInvitationsRepository(db)
    usersRepository = new UsersRepository(db)
    managementCompaniesRepository = new ManagementCompaniesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new admin invitation', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const token = 'test-token-123'
      const data = AdminInvitationFactory.withToken(token, {
        userId: user.id,
        managementCompanyId: company.id,
        email: user.email,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.userId).toBe(user.id)
      expect(result.managementCompanyId).toBe(company.id)
      expect(result.token).toBe(token)
      expect(result.tokenHash).toBe(hashToken(token))
      expect(result.status).toBe('pending')
      expect(result.email).toBe(user.email)
    })

    it('should create invitation with expiration date', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const data = AdminInvitationFactory.create({
        userId: user.id,
        managementCompanyId: company.id,
        expiresAt: futureDate,
      })

      const result = await repository.create(data)

      expect(result.expiresAt.getTime()).toBeCloseTo(futureDate.getTime(), -3)
    })
  })

  describe('getById', () => {
    it('should return invitation by id', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const data = AdminInvitationFactory.create({
        userId: user.id,
        managementCompanyId: company.id,
      })
      const created = await repository.create(data)

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('getByToken', () => {
    it('should return invitation by token', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const token = 'unique-token-456'
      const data = AdminInvitationFactory.withToken(token, {
        userId: user.id,
        managementCompanyId: company.id,
      })
      await repository.create(data)

      const result = await repository.getByToken(token)

      expect(result).toBeDefined()
      expect(result?.token).toBe(token)
    })

    it('should return null for non-existent token', async () => {
      const result = await repository.getByToken('nonexistent-token')

      expect(result).toBeNull()
    })
  })

  describe('getByTokenHash', () => {
    it('should return invitation by token hash', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const token = 'hash-test-token'
      const tokenHash = hashToken(token)
      const data = AdminInvitationFactory.withToken(token, {
        userId: user.id,
        managementCompanyId: company.id,
      })
      await repository.create(data)

      const result = await repository.getByTokenHash(tokenHash)

      expect(result).toBeDefined()
      expect(result?.tokenHash).toBe(tokenHash)
    })
  })

  describe('getByUserId', () => {
    it('should return all invitations for a user', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company1 = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ name: 'Company 1', createdBy: user.id })
      )
      const company2 = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ name: 'Company 2', createdBy: user.id })
      )

      await repository.create(
        AdminInvitationFactory.create({ userId: user.id, managementCompanyId: company1.id })
      )
      await repository.create(
        AdminInvitationFactory.create({ userId: user.id, managementCompanyId: company2.id })
      )

      const results = await repository.getByUserId(user.id)

      expect(results).toHaveLength(2)
    })
  })

  describe('getPendingByEmail', () => {
    it('should return only pending invitations for email', async () => {
      const user = await usersRepository.create(UserFactory.create({ email: 'test@example.com' }))
      const company1 = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ name: 'Company 1', createdBy: user.id })
      )
      const company2 = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ name: 'Company 2', createdBy: user.id })
      )

      await repository.create(
        AdminInvitationFactory.pending({
          userId: user.id,
          managementCompanyId: company1.id,
          email: 'test@example.com',
        })
      )
      await repository.create(
        AdminInvitationFactory.accepted({
          userId: user.id,
          managementCompanyId: company2.id,
          email: 'test@example.com',
        })
      )

      const results = await repository.getPendingByEmail('test@example.com')

      expect(results).toHaveLength(1)
      expect(results[0]?.status).toBe('pending')
    })
  })

  describe('getByManagementCompanyId', () => {
    it('should return all invitations for a company', async () => {
      const user1 = await usersRepository.create(UserFactory.create({ email: 'user1@example.com' }))
      const user2 = await usersRepository.create(UserFactory.create({ email: 'user2@example.com' }))
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user1.id })
      )

      await repository.create(
        AdminInvitationFactory.create({
          userId: user1.id,
          managementCompanyId: company.id,
          email: 'user1@example.com',
        })
      )
      await repository.create(
        AdminInvitationFactory.create({
          userId: user2.id,
          managementCompanyId: company.id,
          email: 'user2@example.com',
        })
      )

      const results = await repository.getByManagementCompanyId(company.id)

      expect(results).toHaveLength(2)
    })
  })

  describe('markAsAccepted', () => {
    it('should mark invitation as accepted', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const created = await repository.create(
        AdminInvitationFactory.pending({ userId: user.id, managementCompanyId: company.id })
      )

      const result = await repository.markAsAccepted(created.id)

      expect(result?.status).toBe('accepted')
      expect(result?.acceptedAt).toBeDefined()
    })
  })

  describe('markAsCancelled', () => {
    it('should mark invitation as cancelled', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const created = await repository.create(
        AdminInvitationFactory.pending({ userId: user.id, managementCompanyId: company.id })
      )

      const result = await repository.markAsCancelled(created.id)

      expect(result?.status).toBe('cancelled')
    })
  })

  describe('hasPendingInvitation', () => {
    it('should return true for valid pending invitation', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      await repository.create(
        AdminInvitationFactory.pending({ userId: user.id, managementCompanyId: company.id })
      )

      const result = await repository.hasPendingInvitation(user.id, company.id)

      expect(result).toBe(true)
    })

    it('should return false when no invitation exists', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const result = await repository.hasPendingInvitation(user.id, company.id)

      expect(result).toBe(false)
    })

    it('should return false for expired invitation', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      await repository.create(
        AdminInvitationFactory.pending({
          userId: user.id,
          managementCompanyId: company.id,
          expiresAt: pastDate,
        })
      )

      const result = await repository.hasPendingInvitation(user.id, company.id)

      expect(result).toBe(false)
    })

    it('should return false for accepted invitation', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      await repository.create(
        AdminInvitationFactory.accepted({ userId: user.id, managementCompanyId: company.id })
      )

      const result = await repository.hasPendingInvitation(user.id, company.id)

      expect(result).toBe(false)
    })
  })

  describe('recordEmailError', () => {
    it('should record email error', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const created = await repository.create(
        AdminInvitationFactory.create({ userId: user.id, managementCompanyId: company.id })
      )

      const errorMessage = 'SMTP connection failed'
      const result = await repository.recordEmailError(created.id, errorMessage)

      expect(result?.emailError).toBe(errorMessage)
    })
  })

  describe('update', () => {
    it('should update invitation status', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const created = await repository.create(
        AdminInvitationFactory.pending({ userId: user.id, managementCompanyId: company.id })
      )

      const result = await repository.update(created.id, { status: 'expired' })

      expect(result?.status).toBe('expired')
    })
  })

  describe('hardDelete', () => {
    it('should permanently delete invitation', async () => {
      const user = await usersRepository.create(UserFactory.create())
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ createdBy: user.id })
      )

      const created = await repository.create(
        AdminInvitationFactory.create({ userId: user.id, managementCompanyId: company.id })
      )

      const deleted = await repository.hardDelete(created.id)

      expect(deleted).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })
})
