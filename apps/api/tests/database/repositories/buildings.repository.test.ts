import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { BuildingsRepository, CondominiumsRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  BuildingFactory,
  CondominiumFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('BuildingsRepository', () => {
  let db: TTestDrizzleClient
  let repository: BuildingsRepository
  let condominiumsRepository: CondominiumsRepository
  let defaultCondominium: { id: string }

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new BuildingsRepository(db)
    condominiumsRepository = new CondominiumsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
    // Create a default condominium for building tests
    defaultCondominium = await condominiumsRepository.create(
      CondominiumFactory.create({ name: 'Default Condo', code: 'DEFAULT' })
    )
  })

  describe('create', () => {
    it('should create a new building', async () => {
      const data = BuildingFactory.create(defaultCondominium.id, {
        name: 'Torre A',
        code: 'TA',
        floorsCount: 20,
        unitsCount: 80,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Torre A')
      expect(result.code).toBe('TA')
      expect(result.floorsCount).toBe(20)
      expect(result.unitsCount).toBe(80)
      expect(result.condominiumId).toBe(defaultCondominium.id)
      expect(result.isActive).toBe(true)
    })

    it('should create building with bank account info', async () => {
      const data = BuildingFactory.create(defaultCondominium.id, {
        name: 'Torre B',
        bankAccountHolder: 'Junta de Condominio Torre B',
        bankName: 'Banco Nacional',
        bankAccountNumber: '0102-1234-5678-9012',
        bankAccountType: 'Corriente',
      })

      const result = await repository.create(data)

      expect(result.bankAccountHolder).toBe('Junta de Condominio Torre B')
      expect(result.bankName).toBe('Banco Nacional')
      expect(result.bankAccountNumber).toBe('0102-1234-5678-9012')
      expect(result.bankAccountType).toBe('Corriente')
    })
  })

  describe('getById', () => {
    it('should return building by id', async () => {
      const created = await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'Find Me Tower' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Find Me Tower')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active buildings', async () => {
      await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'Building 1', code: 'B1' })
      )
      await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'Building 2', code: 'B2' })
      )
      await repository.create(
        BuildingFactory.create(defaultCondominium.id, {
          name: 'Inactive',
          code: 'B3',
          isActive: false,
        })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update building fields', async () => {
      const created = await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'Old Name', floorsCount: 10 })
      )

      const result = await repository.update(created.id, {
        name: 'New Name',
        floorsCount: 15,
      })

      expect(result?.name).toBe('New Name')
      expect(result?.floorsCount).toBe(15)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete building', async () => {
      const created = await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'To Delete' })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByCondominiumId', () => {
    it('should return buildings by condominium', async () => {
      const otherCondo = await condominiumsRepository.create(
        CondominiumFactory.create({ name: 'Other Condo', code: 'OTHER' })
      )

      await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'Building 1', code: 'B1' })
      )
      await repository.create(
        BuildingFactory.create(defaultCondominium.id, { name: 'Building 2', code: 'B2' })
      )
      await repository.create(
        BuildingFactory.create(otherCondo.id, { name: 'Other Building', code: 'OB' })
      )

      const result = await repository.getByCondominiumId(defaultCondominium.id)

      expect(result).toHaveLength(2)
      expect(
        result.every((b: { condominiumId: string }) => b.condominiumId === defaultCondominium.id)
      ).toBe(true)
    })

    it('should return empty array for condominium without buildings', async () => {
      const emptyCondo = await condominiumsRepository.create(
        CondominiumFactory.create({ name: 'Empty Condo', code: 'EMPTY' })
      )

      const result = await repository.getByCondominiumId(emptyCondo.id)

      expect(result).toEqual([])
    })
  })
})
