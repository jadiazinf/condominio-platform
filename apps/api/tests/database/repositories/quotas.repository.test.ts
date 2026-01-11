import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  QuotasRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  QuotaFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  PaymentConceptFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('QuotasRepository', () => {
  let db: TTestDrizzleClient
  let repository: QuotasRepository
  let unitId: string
  let unitId2: string
  let currencyId: string
  let paymentConceptId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new QuotasRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create dependencies
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)
    const unitsRepository = new UnitsRepository(db)
    const paymentConceptsRepository = new PaymentConceptsRepository(db)

    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))
    const unit1 = await unitsRepository.create(UnitFactory.create(building.id))
    const unit2 = await unitsRepository.create(UnitFactory.create(building.id))
    const concept = await paymentConceptsRepository.create(
      PaymentConceptFactory.maintenance({ condominiumId: condominium.id, currencyId: currency.id })
    )

    unitId = unit1.id
    unitId2 = unit2.id
    currencyId = currency.id
    paymentConceptId = concept.id
  })

  describe('create', () => {
    it('should create a pending quota', async () => {
      const data = QuotaFactory.pending({
        unitId,
        paymentConceptId,
        currencyId,
        baseAmount: '100.00',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.unitId).toBe(unitId)
      expect(result.baseAmount).toBe('100.00')
      expect(result.status).toBe('pending')
    })

    it('should create an overdue quota', async () => {
      const data = QuotaFactory.overdue({
        unitId,
        paymentConceptId,
        currencyId,
      })

      const result = await repository.create(data)

      expect(result.status).toBe('overdue')
    })
  })

  describe('getById', () => {
    it('should return quota by id', async () => {
      const created = await repository.create(
        QuotaFactory.pending({ unitId, paymentConceptId, currencyId })
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

  describe('listAll', () => {
    it('should return all quotas', async () => {
      await repository.create(QuotaFactory.pending({ unitId, paymentConceptId, currencyId }))
      await repository.create(QuotaFactory.pending({ unitId: unitId2, paymentConceptId, currencyId }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (cancels quota)', () => {
    it('should cancel quota instead of deleting', async () => {
      const created = await repository.create(
        QuotaFactory.pending({ unitId, paymentConceptId, currencyId })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeDefined()
      expect(found?.status).toBe('cancelled')
    })
  })

  describe('getByUnitId', () => {
    it('should return quotas for unit', async () => {
      await repository.create(QuotaFactory.pending({ unitId, paymentConceptId, currencyId }))
      await repository.create(QuotaFactory.pending({ unitId, paymentConceptId, currencyId }))
      await repository.create(QuotaFactory.pending({ unitId: unitId2, paymentConceptId, currencyId }))

      const result = await repository.getByUnitId(unitId)

      expect(result).toHaveLength(2)
      expect(result.every((q) => q.unitId === unitId)).toBe(true)
    })
  })

  describe('getByStatus', () => {
    it('should return quotas by status', async () => {
      await repository.create(
        QuotaFactory.create({ unitId, paymentConceptId, currencyId, status: 'pending' })
      )
      await repository.create(
        QuotaFactory.create({ unitId, paymentConceptId, currencyId, status: 'paid' })
      )
      await repository.create(
        QuotaFactory.create({ unitId, paymentConceptId, currencyId, status: 'pending' })
      )

      const result = await repository.getByStatus('pending')

      expect(result).toHaveLength(2)
      expect(result.every((q) => q.status === 'pending')).toBe(true)
    })
  })

  describe('getPendingByUnit', () => {
    it('should return pending quotas for unit', async () => {
      await repository.create(
        QuotaFactory.create({ unitId, paymentConceptId, currencyId, status: 'pending' })
      )
      await repository.create(
        QuotaFactory.create({ unitId, paymentConceptId, currencyId, status: 'paid' })
      )
      await repository.create(
        QuotaFactory.create({ unitId, paymentConceptId, currencyId, status: 'overdue' })
      )

      const result = await repository.getPendingByUnit(unitId)

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('pending')
    })
  })

  describe('getOverdue', () => {
    it('should return quotas overdue as of date', async () => {
      const pastDate = '2024-01-01'
      const futureDate = '2025-12-31'
      const checkDate = '2025-06-15'

      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          status: 'pending',
          dueDate: pastDate,
        })
      )
      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          status: 'pending',
          dueDate: futureDate,
        })
      )

      const result = await repository.getOverdue(checkDate)

      expect(result).toHaveLength(1)
      expect(result[0]?.dueDate).toBe(pastDate)
    })
  })

  describe('getByPeriod', () => {
    it('should return quotas for specific year and month', async () => {
      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          periodYear: 2025,
          periodMonth: 1,
        })
      )
      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          periodYear: 2025,
          periodMonth: 2,
        })
      )
      await repository.create(
        QuotaFactory.create({
          unitId: unitId2,
          paymentConceptId,
          currencyId,
          periodYear: 2025,
          periodMonth: 1,
        })
      )

      const result = await repository.getByPeriod(2025, 1)

      expect(result).toHaveLength(2)
      expect(result.every((q) => q.periodYear === 2025 && q.periodMonth === 1)).toBe(true)
    })

    it('should return quotas for year only', async () => {
      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          periodYear: 2025,
          periodMonth: 1,
        })
      )
      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          periodYear: 2025,
          periodMonth: 6,
        })
      )
      await repository.create(
        QuotaFactory.create({
          unitId,
          paymentConceptId,
          currencyId,
          periodYear: 2024,
          periodMonth: 12,
        })
      )

      const result = await repository.getByPeriod(2025)

      expect(result).toHaveLength(2)
      expect(result.every((q) => q.periodYear === 2025)).toBe(true)
    })
  })
})
