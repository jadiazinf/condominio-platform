import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { ManagementCompaniesRepository, LocationsRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  ManagementCompanyFactory,
  LocationFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('ManagementCompaniesRepository', () => {
  let db: TTestDrizzleClient
  let repository: ManagementCompaniesRepository
  let locationsRepository: LocationsRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new ManagementCompaniesRepository(db)
    locationsRepository = new LocationsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new management company', async () => {
      const data = ManagementCompanyFactory.create({
        name: 'Inmobiliaria ABC',
        legalName: 'Inmobiliaria ABC C.A.',
        taxId: 'J-12345678-9',
        email: 'contact@abc.com',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Inmobiliaria ABC')
      expect(result.legalName).toBe('Inmobiliaria ABC C.A.')
      expect(result.taxId).toBe('J-12345678-9')
      expect(result.isActive).toBe(true)
    })

    it('should create company with location', async () => {
      const location = await locationsRepository.create(LocationFactory.create({ name: 'Caracas' }))

      const data = ManagementCompanyFactory.create({
        name: 'Located Company',
        locationId: location.id,
      })

      const result = await repository.create(data)

      expect(result.locationId).toBe(location.id)
    })

    it('should throw error on duplicate tax id', async () => {
      await repository.create(
        ManagementCompanyFactory.create({ name: 'Company 1', taxId: 'DUPLICATE' })
      )

      await expect(
        repository.create(
          ManagementCompanyFactory.create({ name: 'Company 2', taxId: 'DUPLICATE' })
        )
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return company by id', async () => {
      const created = await repository.create(
        ManagementCompanyFactory.create({ name: 'FindMe Inc' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('FindMe Inc')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active companies', async () => {
      await repository.create(ManagementCompanyFactory.create({ name: 'Company 1' }))
      await repository.create(ManagementCompanyFactory.create({ name: 'Company 2' }))
      await repository.create(
        ManagementCompanyFactory.create({ name: 'Inactive', isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })

    it('should include inactive when specified', async () => {
      await repository.create(ManagementCompanyFactory.create({ name: 'Active' }))
      await repository.create(
        ManagementCompanyFactory.create({ name: 'Inactive', isActive: false })
      )

      const result = await repository.listAll(true)

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update company fields', async () => {
      const created = await repository.create(
        ManagementCompanyFactory.create({ name: 'Old Name', email: 'old@email.com' })
      )

      const result = await repository.update(created.id, {
        name: 'New Name',
        email: 'new@email.com',
      })

      expect(result?.name).toBe('New Name')
      expect(result?.email).toBe('new@email.com')
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete company', async () => {
      const created = await repository.create(
        ManagementCompanyFactory.create({ name: 'To Delete' })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByTaxId', () => {
    it('should return company by tax id', async () => {
      await repository.create(
        ManagementCompanyFactory.create({ name: 'Tax Company', taxId: 'J-99999999-0' })
      )

      const result = await repository.getByTaxId('J-99999999-0')

      expect(result).toBeDefined()
      expect(result?.taxId).toBe('J-99999999-0')
    })

    it('should return null for non-existent tax id', async () => {
      const result = await repository.getByTaxId('NONEXISTENT')

      expect(result).toBeNull()
    })
  })
})
