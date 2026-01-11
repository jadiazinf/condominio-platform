import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  QuotaAdjustmentsRepository,
  QuotasRepository,
  UnitsRepository,
  BuildingsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
  PaymentConceptsRepository,
  UsersRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UnitFactory,
  BuildingFactory,
  CondominiumFactory,
  CurrencyFactory,
  UserFactory,
  QuotaAdjustmentFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'
import type { TQuota, TPaymentConceptCreate, TQuotaCreate } from '@packages/domain'

describe('QuotaAdjustmentsRepository', () => {
  let db: TTestDrizzleClient
  let repository: QuotaAdjustmentsRepository
  let quotasRepository: QuotasRepository
  let unitsRepository: UnitsRepository
  let buildingsRepository: BuildingsRepository
  let condominiumsRepository: CondominiumsRepository
  let currenciesRepository: CurrenciesRepository
  let paymentConceptsRepository: PaymentConceptsRepository
  let usersRepository: UsersRepository

  let testQuota: TQuota
  let testUser: { id: string }
  let testCurrency: { id: string }

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new QuotaAdjustmentsRepository(db)
    quotasRepository = new QuotasRepository(db)
    unitsRepository = new UnitsRepository(db)
    buildingsRepository = new BuildingsRepository(db)
    condominiumsRepository = new CondominiumsRepository(db)
    currenciesRepository = new CurrenciesRepository(db)
    paymentConceptsRepository = new PaymentConceptsRepository(db)
    usersRepository = new UsersRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create test user
    testUser = await usersRepository.create(
      UserFactory.create({ email: 'admin@test.com' })
    )

    // Create currency
    testCurrency = await currenciesRepository.create(
      CurrencyFactory.create({ code: 'USD', name: 'US Dollar', symbol: '$' })
    )

    // Create condominium → building → unit hierarchy
    const condo = await condominiumsRepository.create(
      CondominiumFactory.create({ name: 'Test Condo', code: 'TC' })
    )
    const building = await buildingsRepository.create(
      BuildingFactory.create(condo.id, { name: 'Test Building', code: 'TB' })
    )
    const unit = await unitsRepository.create(
      UnitFactory.create(building.id, { unitNumber: '101' })
    )

    // Create payment concept
    const paymentConceptData: TPaymentConceptCreate = {
      condominiumId: condo.id,
      buildingId: null,
      name: 'Monthly Maintenance',
      description: 'Regular monthly fee',
      conceptType: 'maintenance',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      currencyId: testCurrency.id,
      isActive: true,
      metadata: null,
      createdBy: testUser.id,
    }
    const paymentConcept = await paymentConceptsRepository.create(paymentConceptData)

    // Create test quota
    const quotaData: TQuotaCreate = {
      unitId: unit.id,
      paymentConceptId: paymentConcept.id,
      periodYear: 2025,
      periodMonth: 1,
      periodDescription: 'January 2025',
      baseAmount: '100.00',
      currencyId: testCurrency.id,
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2025-01-01',
      dueDate: '2025-01-15',
      status: 'pending',
      paidAmount: '0',
      balance: '100.00',
      notes: null,
      metadata: null,
      createdBy: testUser.id,
    }
    testQuota = await quotasRepository.create(quotaData)
  })

  describe('create', () => {
    it('should create a discount adjustment', async () => {
      const data = QuotaAdjustmentFactory.discount(
        testQuota.id,
        testUser.id,
        testQuota.baseAmount,
        10
      )

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.quotaId).toBe(testQuota.id)
      expect(result.previousAmount).toBe('100.00')
      expect(result.newAmount).toBe('90.00')
      expect(result.adjustmentType).toBe('discount')
      expect(result.createdBy).toBe(testUser.id)
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should create an increase adjustment', async () => {
      const data = QuotaAdjustmentFactory.increase(
        testQuota.id,
        testUser.id,
        testQuota.baseAmount,
        15
      )

      const result = await repository.create(data)

      expect(result.adjustmentType).toBe('increase')
      expect(result.newAmount).toBe('115.00')
    })

    it('should create a correction adjustment', async () => {
      const data = QuotaAdjustmentFactory.correction(
        testQuota.id,
        testUser.id,
        '100.00',
        '95.50'
      )

      const result = await repository.create(data)

      expect(result.adjustmentType).toBe('correction')
      expect(result.previousAmount).toBe('100.00')
      expect(result.newAmount).toBe('95.50')
    })

    it('should create a waiver adjustment', async () => {
      const data = QuotaAdjustmentFactory.waiver(
        testQuota.id,
        testUser.id,
        testQuota.baseAmount
      )

      const result = await repository.create(data)

      expect(result.adjustmentType).toBe('waiver')
      expect(result.newAmount).toBe('0.00')
    })

    it('should store the reason for the adjustment', async () => {
      const data = QuotaAdjustmentFactory.create({
        quotaId: testQuota.id,
        createdBy: testUser.id,
        reason: 'Special discount for early payment',
      })

      const result = await repository.create(data)

      expect(result.reason).toBe('Special discount for early payment')
    })
  })

  describe('getById', () => {
    it('should return adjustment by id', async () => {
      const created = await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.adjustmentType).toBe('discount')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('getByQuotaId', () => {
    it('should return all adjustments for a quota', async () => {
      await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.increase(testQuota.id, testUser.id, '90.00')
      )

      const result = await repository.getByQuotaId(testQuota.id)

      expect(result).toHaveLength(2)
      expect(result.every(a => a.quotaId === testQuota.id)).toBe(true)
    })

    it('should return empty array for quota with no adjustments', async () => {
      const result = await repository.getByQuotaId('00000000-0000-0000-0000-000000000000')

      expect(result).toHaveLength(0)
    })

    it('should order adjustments by createdAt descending', async () => {
      const first = await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )
      const second = await repository.create(
        QuotaAdjustmentFactory.increase(testQuota.id, testUser.id, '90.00')
      )

      const result = await repository.getByQuotaId(testQuota.id)

      // Most recent first
      expect(result[0]?.id).toBe(second.id)
      expect(result[1]?.id).toBe(first.id)
    })
  })

  describe('getByCreatedBy', () => {
    it('should return all adjustments made by a user', async () => {
      const otherUser = await usersRepository.create(
        UserFactory.create({ email: 'other@test.com' })
      )

      await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.increase(testQuota.id, testUser.id, '90.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.correction(testQuota.id, otherUser.id, '100.00', '95.00')
      )

      const result = await repository.getByCreatedBy(testUser.id)

      expect(result).toHaveLength(2)
      expect(result.every(a => a.createdBy === testUser.id)).toBe(true)
    })
  })

  describe('getByType', () => {
    it('should return all adjustments of a specific type', async () => {
      await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '90.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.increase(testQuota.id, testUser.id, '80.00')
      )

      const result = await repository.getByType('discount')

      expect(result).toHaveLength(2)
      expect(result.every(a => a.adjustmentType === 'discount')).toBe(true)
    })

    it('should return empty array when no adjustments of type exist', async () => {
      await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )

      const result = await repository.getByType('waiver')

      expect(result).toHaveLength(0)
    })
  })

  describe('listAll', () => {
    it('should return all adjustments', async () => {
      await repository.create(
        QuotaAdjustmentFactory.discount(testQuota.id, testUser.id, '100.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.increase(testQuota.id, testUser.id, '90.00')
      )
      await repository.create(
        QuotaAdjustmentFactory.waiver(testQuota.id, testUser.id, '100.00')
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(3)
    })

    it('should return empty array when no adjustments exist', async () => {
      const result = await repository.listAll()

      expect(result).toHaveLength(0)
    })
  })
})
