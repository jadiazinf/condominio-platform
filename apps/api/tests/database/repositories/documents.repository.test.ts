import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  DocumentsRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  DocumentFactory,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('DocumentsRepository', () => {
  let db: TTestDrizzleClient
  let repository: DocumentsRepository
  let condominiumId: string
  let buildingId: string
  let unitId: string
  let userId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new DocumentsRepository(db)
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
    const unitsRepository = new UnitsRepository(db)

    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(
      BuildingFactory.create(condominium.id)
    )
    const unit = await unitsRepository.create(UnitFactory.create(building.id))

    userId = user.id
    condominiumId = condominium.id
    buildingId = building.id
    unitId = unit.id
  })

  describe('create', () => {
    it('should create a receipt document', async () => {
      const data = DocumentFactory.receipt({
        condominiumId,
        userId,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.documentType).toBe('receipt')
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.userId).toBe(userId)
    })

    it('should create a statement document', async () => {
      const data = DocumentFactory.statement({ unitId })

      const result = await repository.create(data)

      expect(result.documentType).toBe('statement')
      expect(result.unitId).toBe(unitId)
    })

    it('should create a public document', async () => {
      const data = DocumentFactory.create({
        condominiumId,
        isPublic: true,
      })

      const result = await repository.create(data)

      expect(result.isPublic).toBe(true)
    })
  })

  describe('getById', () => {
    it('should return document by id', async () => {
      const created = await repository.create(DocumentFactory.receipt({ condominiumId }))

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
    it('should return all documents', async () => {
      await repository.create(DocumentFactory.receipt({ condominiumId }))
      await repository.create(DocumentFactory.invoice({ buildingId }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete document', async () => {
      const created = await repository.create(DocumentFactory.receipt({ condominiumId }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByCondominiumId', () => {
    it('should return documents for condominium', async () => {
      await repository.create(DocumentFactory.receipt({ condominiumId }))
      await repository.create(DocumentFactory.statement({ condominiumId }))

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every((d) => d.condominiumId === condominiumId)).toBe(true)
    })
  })

  describe('getByBuildingId', () => {
    it('should return documents for building', async () => {
      await repository.create(DocumentFactory.receipt({ buildingId }))

      const result = await repository.getByBuildingId(buildingId)

      expect(result).toHaveLength(1)
      expect(result[0]?.buildingId).toBe(buildingId)
    })
  })

  describe('getByUnitId', () => {
    it('should return documents for unit', async () => {
      await repository.create(DocumentFactory.receipt({ unitId }))
      await repository.create(DocumentFactory.statement({ unitId }))

      const result = await repository.getByUnitId(unitId)

      expect(result).toHaveLength(2)
      expect(result.every((d) => d.unitId === unitId)).toBe(true)
    })
  })

  describe('getByUserId', () => {
    it('should return documents for user', async () => {
      await repository.create(DocumentFactory.receipt({ userId }))

      const result = await repository.getByUserId(userId)

      expect(result).toHaveLength(1)
      expect(result[0]?.userId).toBe(userId)
    })
  })

  describe('getByType', () => {
    it('should return documents by type', async () => {
      await repository.create(DocumentFactory.receipt({ condominiumId }))
      await repository.create(DocumentFactory.invoice({ condominiumId }))
      await repository.create(DocumentFactory.receipt({ buildingId }))

      const result = await repository.getByType('receipt')

      expect(result).toHaveLength(2)
      expect(result.every((d) => d.documentType === 'receipt')).toBe(true)
    })
  })

  describe('getPublicDocuments', () => {
    it('should return only public documents', async () => {
      await repository.create(DocumentFactory.create({ condominiumId, isPublic: true }))
      await repository.create(DocumentFactory.create({ condominiumId, isPublic: false }))

      const result = await repository.getPublicDocuments()

      expect(result).toHaveLength(1)
      expect(result[0]?.isPublic).toBe(true)
    })
  })
})
