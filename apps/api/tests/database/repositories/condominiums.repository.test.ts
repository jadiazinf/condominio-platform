import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  CondominiumsRepository,
  ManagementCompaniesRepository,
  CurrenciesRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  CondominiumFactory,
  ManagementCompanyFactory,
  CurrencyFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('CondominiumsRepository', () => {
  let db: TTestDrizzleClient
  let repository: CondominiumsRepository
  let managementCompaniesRepository: ManagementCompaniesRepository
  let currenciesRepository: CurrenciesRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new CondominiumsRepository(db)
    managementCompaniesRepository = new ManagementCompaniesRepository(db)
    currenciesRepository = new CurrenciesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new condominium', async () => {
      const data = CondominiumFactory.create({
        name: 'Residencias Los Robles',
        code: 'ROBLES001',
        address: 'Av. Principal, Caracas',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Residencias Los Robles')
      expect(result.code).toBe('ROBLES001')
      expect(result.isActive).toBe(true)
    })

    it('should create condominium with management company', async () => {
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ name: 'Admin Co' })
      )

      const data = CondominiumFactory.create({
        name: 'Managed Condo',
        managementCompanyId: company.id,
      })

      const result = await repository.create(data)

      expect(result.managementCompanyId).toBe(company.id)
    })

    it('should create condominium with default currency', async () => {
      const currency = await currenciesRepository.create(CurrencyFactory.create({ code: 'USD' }))

      const data = CondominiumFactory.create({
        name: 'USD Condo',
        defaultCurrencyId: currency.id,
      })

      const result = await repository.create(data)

      expect(result.defaultCurrencyId).toBe(currency.id)
    })

    it('should throw error on duplicate code', async () => {
      await repository.create(CondominiumFactory.create({ name: 'Condo 1', code: 'DUPLICATE' }))

      await expect(
        repository.create(CondominiumFactory.create({ name: 'Condo 2', code: 'DUPLICATE' }))
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return condominium by id', async () => {
      const created = await repository.create(CondominiumFactory.create({ name: 'Find Me Condo' }))

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Find Me Condo')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active condominiums', async () => {
      await repository.create(CondominiumFactory.create({ name: 'Condo 1', code: 'C1' }))
      await repository.create(CondominiumFactory.create({ name: 'Condo 2', code: 'C2' }))
      await repository.create(
        CondominiumFactory.create({ name: 'Inactive', code: 'C3', isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update condominium fields', async () => {
      const created = await repository.create(
        CondominiumFactory.create({ name: 'Old Condo Name', email: 'old@condo.com' })
      )

      const result = await repository.update(created.id, {
        name: 'New Condo Name',
        email: 'new@condo.com',
      })

      expect(result?.name).toBe('New Condo Name')
      expect(result?.email).toBe('new@condo.com')
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete condominium', async () => {
      const created = await repository.create(CondominiumFactory.create({ name: 'To Delete' }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id, true)
      expect(found?.isActive).toBe(false)

      // Verify it's not returned without includeInactive flag
      const notFound = await repository.getById(created.id)
      expect(notFound).toBeNull()
    })
  })

  describe('getByCode', () => {
    it('should return condominium by code', async () => {
      await repository.create(CondominiumFactory.create({ name: 'Coded Condo', code: 'FINDME' }))

      const result = await repository.getByCode('FINDME')

      expect(result).toBeDefined()
      expect(result?.code).toBe('FINDME')
    })

    it('should return null for non-existent code', async () => {
      const result = await repository.getByCode('NONEXISTENT')

      expect(result).toBeNull()
    })
  })

  describe('getByManagementCompanyId', () => {
    it('should return condominiums by management company', async () => {
      const company = await managementCompaniesRepository.create(
        ManagementCompanyFactory.create({ name: 'Admin Co' })
      )

      await repository.create(
        CondominiumFactory.create({ name: 'Condo 1', code: 'C1', managementCompanyId: company.id })
      )
      await repository.create(
        CondominiumFactory.create({ name: 'Condo 2', code: 'C2', managementCompanyId: company.id })
      )
      await repository.create(CondominiumFactory.create({ name: 'Other Condo', code: 'C3' }))

      const result = await repository.getByManagementCompanyId(company.id)

      expect(result).toHaveLength(2)
      expect(
        result.every(
          (c: { managementCompanyId: string | null }) => c.managementCompanyId === company.id
        )
      ).toBe(true)
    })
  })
})
