import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  PaymentsRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  PaymentFactory,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('PaymentsRepository', () => {
  let db: TTestDrizzleClient
  let repository: PaymentsRepository
  let usersRepository: UsersRepository
  let currenciesRepository: CurrenciesRepository
  let condominiumsRepository: CondominiumsRepository
  let buildingsRepository: BuildingsRepository
  let unitsRepository: UnitsRepository
  let userId: string
  let unitId: string
  let currencyId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new PaymentsRepository(db)
    usersRepository = new UsersRepository(db)
    currenciesRepository = new CurrenciesRepository(db)
    condominiumsRepository = new CondominiumsRepository(db)
    buildingsRepository = new BuildingsRepository(db)
    unitsRepository = new UnitsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create dependencies
    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))
    const unit = await unitsRepository.create(UnitFactory.create(building.id))

    userId = user.id
    unitId = unit.id
    currencyId = currency.id
  })

  describe('create', () => {
    it('should create a new payment', async () => {
      const data = PaymentFactory.create({
        userId,
        unitId,
        currencyId,
        amount: '150.00',
        status: 'completed',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.userId).toBe(userId)
      expect(result.unitId).toBe(unitId)
      expect(result.amount).toBe('150.00')
      expect(result.status).toBe('completed')
    })

    it('should create payment pending verification', async () => {
      const data = PaymentFactory.pendingVerification({
        userId,
        unitId,
        currencyId,
      })

      const result = await repository.create(data)

      expect(result.status).toBe('pending_verification')
    })
  })

  describe('getById', () => {
    it('should return payment by id', async () => {
      const created = await repository.create(PaymentFactory.create({ userId, unitId, currencyId }))

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
    it('should return all payments ordered by date desc', async () => {
      await repository.create(
        PaymentFactory.create({
          userId,
          unitId,
          currencyId,
          paymentDate: '2025-01-10',
        })
      )
      await repository.create(
        PaymentFactory.create({
          userId,
          unitId,
          currencyId,
          paymentDate: '2025-01-15',
        })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
      expect(result[0]?.paymentDate).toBe('2025-01-15')
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete payment', async () => {
      const created = await repository.create(PaymentFactory.create({ userId, unitId, currencyId }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByPaymentNumber', () => {
    it('should return payment by payment number', async () => {
      const created = await repository.create(
        PaymentFactory.create({
          userId,
          unitId,
          currencyId,
          paymentNumber: 'PAY-12345678',
        })
      )

      const result = await repository.getByPaymentNumber('PAY-12345678')

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent payment number', async () => {
      const result = await repository.getByPaymentNumber('PAY-NOTFOUND')
      expect(result).toBeNull()
    })
  })

  describe('getByUserId', () => {
    it('should return payments for user', async () => {
      await repository.create(PaymentFactory.create({ userId, unitId, currencyId }))
      await repository.create(PaymentFactory.create({ userId, unitId, currencyId }))

      const result = await repository.getByUserId(userId)

      expect(result).toHaveLength(2)
      expect(result.every(p => p.userId === userId)).toBe(true)
    })
  })

  describe('getByUnitId', () => {
    it('should return payments for unit', async () => {
      await repository.create(PaymentFactory.create({ userId, unitId, currencyId }))
      await repository.create(PaymentFactory.create({ userId, unitId, currencyId }))

      const result = await repository.getByUnitId(unitId)

      expect(result).toHaveLength(2)
      expect(result.every(p => p.unitId === unitId)).toBe(true)
    })
  })

  describe('getByStatus', () => {
    it('should return payments by status', async () => {
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, status: 'completed' })
      )
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, status: 'pending_verification' })
      )
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, status: 'completed' })
      )

      const result = await repository.getByStatus('completed')

      expect(result).toHaveLength(2)
      expect(result.every(p => p.status === 'completed')).toBe(true)
    })
  })

  describe('getByDateRange', () => {
    it('should return payments within date range', async () => {
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, paymentDate: '2025-01-05' })
      )
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, paymentDate: '2025-01-15' })
      )
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, paymentDate: '2025-01-25' })
      )

      const result = await repository.getByDateRange('2025-01-10', '2025-01-20')

      expect(result).toHaveLength(1)
      expect(result[0]?.paymentDate).toBe('2025-01-15')
    })
  })

  describe('getPendingVerification', () => {
    it('should return payments pending verification', async () => {
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, status: 'completed' })
      )
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, status: 'pending_verification' })
      )
      await repository.create(
        PaymentFactory.create({ userId, unitId, currencyId, status: 'pending_verification' })
      )

      const result = await repository.getPendingVerification()

      expect(result).toHaveLength(2)
      expect(result.every(p => p.status === 'pending_verification')).toBe(true)
    })
  })

  describe('verifyPayment', () => {
    it('should verify payment and update status to completed', async () => {
      const created = await repository.create(
        PaymentFactory.pendingVerification({ userId, unitId, currencyId })
      )

      const verifierId = userId
      const result = await repository.verifyPayment(created.id, verifierId, 'Verified OK')

      expect(result).toBeDefined()
      expect(result?.status).toBe('completed')
      expect(result?.verifiedBy).toBe(verifierId)
      expect(result?.verifiedAt).toBeInstanceOf(Date)
      expect(result?.verificationNotes).toBe('Verified OK')
    })

    it('should return null for non-existent payment', async () => {
      const result = await repository.verifyPayment(
        '00000000-0000-0000-0000-000000000000',
        userId,
        'notes'
      )
      expect(result).toBeNull()
    })
  })

  describe('rejectPayment', () => {
    it('should reject payment and update status', async () => {
      const created = await repository.create(
        PaymentFactory.pendingVerification({ userId, unitId, currencyId })
      )

      const result = await repository.rejectPayment(created.id, userId, 'Invalid receipt')

      expect(result).toBeDefined()
      expect(result?.status).toBe('rejected')
      expect(result?.verifiedBy).toBe(userId)
      expect(result?.verificationNotes).toBe('Invalid receipt')
    })
  })
})
