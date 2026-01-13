import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  UnitsRepository,
  BuildingsRepository,
  CondominiumsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UnitFactory,
  BuildingFactory,
  CondominiumFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('UnitsRepository', () => {
  let db: TTestDrizzleClient
  let repository: UnitsRepository
  let buildingsRepository: BuildingsRepository
  let condominiumsRepository: CondominiumsRepository
  let defaultBuilding: { id: string }

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new UnitsRepository(db)
    buildingsRepository = new BuildingsRepository(db)
    condominiumsRepository = new CondominiumsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
    // Create default condominium and building
    const condo = await condominiumsRepository.create(
      CondominiumFactory.create({ name: 'Test Condo', code: 'TC' })
    )
    defaultBuilding = await buildingsRepository.create(
      BuildingFactory.create(condo.id, { name: 'Test Building', code: 'TB' })
    )
  })

  describe('create', () => {
    it('should create a new unit', async () => {
      const data = UnitFactory.create(defaultBuilding.id, {
        unitNumber: '101',
        floor: 1,
        areaM2: '85.50',
        bedrooms: 3,
        bathrooms: 2,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.unitNumber).toBe('101')
      expect(result.floor).toBe(1)
      expect(result.areaM2).toBe('85.50')
      expect(result.bedrooms).toBe(3)
      expect(result.bathrooms).toBe(2)
      expect(result.buildingId).toBe(defaultBuilding.id)
      expect(result.isActive).toBe(true)
    })

    it('should create unit with parking info', async () => {
      const data = UnitFactory.create(defaultBuilding.id, {
        unitNumber: '201',
        parkingSpaces: 2,
        parkingIdentifiers: ['P-201-A', 'P-201-B'],
        storageIdentifier: 'M-201',
      })

      const result = await repository.create(data)

      expect(result.parkingSpaces).toBe(2)
      expect(result.parkingIdentifiers).toEqual(['P-201-A', 'P-201-B'])
      expect(result.storageIdentifier).toBe('M-201')
    })

    it('should create unit with aliquot percentage', async () => {
      const data = UnitFactory.create(defaultBuilding.id, {
        unitNumber: '301',
        aliquotPercentage: '1.234567',
      })

      const result = await repository.create(data)

      expect(result.aliquotPercentage).toBe('1.234567')
    })
  })

  describe('getById', () => {
    it('should return unit by id', async () => {
      const created = await repository.create(
        UnitFactory.create(defaultBuilding.id, { unitNumber: 'FIND-ME' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.unitNumber).toBe('FIND-ME')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active units', async () => {
      await repository.create(UnitFactory.create(defaultBuilding.id, { unitNumber: '101' }))
      await repository.create(UnitFactory.create(defaultBuilding.id, { unitNumber: '102' }))
      await repository.create(
        UnitFactory.create(defaultBuilding.id, { unitNumber: '103', isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update unit fields', async () => {
      const created = await repository.create(
        UnitFactory.create(defaultBuilding.id, { unitNumber: 'OLD-101', floor: 1 })
      )

      const result = await repository.update(created.id, {
        unitNumber: 'NEW-101',
        floor: 2,
        bedrooms: 4,
      })

      expect(result?.unitNumber).toBe('NEW-101')
      expect(result?.floor).toBe(2)
      expect(result?.bedrooms).toBe(4)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete unit', async () => {
      const created = await repository.create(
        UnitFactory.create(defaultBuilding.id, { unitNumber: 'TO-DELETE' })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByBuildingId', () => {
    it('should return units by building', async () => {
      const condo = await condominiumsRepository.create(
        CondominiumFactory.create({ name: 'Other Condo', code: 'OC' })
      )
      const otherBuilding = await buildingsRepository.create(
        BuildingFactory.create(condo.id, { name: 'Other Building', code: 'OB' })
      )

      await repository.create(UnitFactory.create(defaultBuilding.id, { unitNumber: '101' }))
      await repository.create(UnitFactory.create(defaultBuilding.id, { unitNumber: '102' }))
      await repository.create(UnitFactory.create(otherBuilding.id, { unitNumber: '201' }))

      const result = await repository.getByBuildingId(defaultBuilding.id)

      expect(result).toHaveLength(2)
      expect(result.every((u: { buildingId: string }) => u.buildingId === defaultBuilding.id)).toBe(
        true
      )
    })
  })

  describe('getByBuildingAndNumber', () => {
    it('should return unit by building and unit number', async () => {
      await repository.create(UnitFactory.create(defaultBuilding.id, { unitNumber: 'UNIQUE-501' }))

      const result = await repository.getByBuildingAndNumber(defaultBuilding.id, 'UNIQUE-501')

      expect(result).toBeDefined()
      expect(result?.unitNumber).toBe('UNIQUE-501')
    })

    it('should return null for non-existent unit number', async () => {
      const result = await repository.getByBuildingAndNumber(defaultBuilding.id, 'NONEXISTENT')

      expect(result).toBeNull()
    })
  })
})
