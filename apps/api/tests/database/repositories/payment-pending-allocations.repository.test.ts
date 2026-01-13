import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  PaymentPendingAllocationsRepository,
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
  PaymentPendingAllocationFactory,
  PaymentFactory,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('PaymentPendingAllocationsRepository', () => {
  let db: TTestDrizzleClient
  let repository: PaymentPendingAllocationsRepository
  let paymentId: string
  let paymentId2: string
  let currencyId: string
  let userId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new PaymentPendingAllocationsRepository(db)
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
    const paymentsRepository = new PaymentsRepository(db)

    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))
    const unit = await unitsRepository.create(UnitFactory.create(building.id))

    const payment1 = await paymentsRepository.create(
      PaymentFactory.completed({ userId: user.id, unitId: unit.id, currencyId: currency.id })
    )
    const payment2 = await paymentsRepository.create(
      PaymentFactory.completed({ userId: user.id, unitId: unit.id, currencyId: currency.id })
    )

    paymentId = payment1.id
    paymentId2 = payment2.id
    currencyId = currency.id
    userId = user.id
  })

  describe('create', () => {
    it('should create pending allocation', async () => {
      const data = PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.paymentId).toBe(paymentId)
      expect(result.pendingAmount).toBe('50.00')
      expect(result.currencyId).toBe(currencyId)
      expect(result.status).toBe('pending')
      expect(result.resolutionType).toBeNull()
    })
  })

  describe('getById', () => {
    it('should return allocation by id', async () => {
      const created = await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)
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
    it('should return all allocations', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)
      )
      await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId2, '25.00', currencyId)
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete allocation', async () => {
      const created = await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByPaymentId', () => {
    it('should return allocations for payment', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)
      )
      await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '25.00', currencyId)
      )
      await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId2, '30.00', currencyId)
      )

      const result = await repository.getByPaymentId(paymentId)

      expect(result).toHaveLength(2)
      expect(result.every(a => a.paymentId === paymentId)).toBe(true)
    })
  })

  describe('getByStatus', () => {
    it('should return allocations by status', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'pending' })
      )
      await repository.create(
        PaymentPendingAllocationFactory.create({
          paymentId: paymentId2,
          currencyId,
          status: 'allocated',
        })
      )

      const result = await repository.getByStatus('pending')

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('pending')
    })
  })

  describe('getPendingAllocations', () => {
    it('should return all pending allocations', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'pending' })
      )
      await repository.create(
        PaymentPendingAllocationFactory.create({
          paymentId: paymentId2,
          currencyId,
          status: 'allocated',
        })
      )
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'pending' })
      )

      const result = await repository.getPendingAllocations()

      expect(result).toHaveLength(2)
      expect(result.every(a => a.status === 'pending')).toBe(true)
    })
  })

  describe('getPendingByPaymentId', () => {
    it('should return pending allocations for payment', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'pending' })
      )
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'allocated' })
      )

      const result = await repository.getPendingByPaymentId(paymentId)

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('pending')
    })
  })

  describe('hasPendingAllocations', () => {
    it('should return true when payment has pending allocations', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'pending' })
      )

      const result = await repository.hasPendingAllocations(paymentId)

      expect(result).toBe(true)
    })

    it('should return false when no pending allocations', async () => {
      await repository.create(
        PaymentPendingAllocationFactory.create({ paymentId, currencyId, status: 'allocated' })
      )

      const result = await repository.hasPendingAllocations(paymentId)

      expect(result).toBe(false)
    })
  })

  describe('update with auto allocatedAt', () => {
    it('should auto-set allocatedAt when status changes to allocated', async () => {
      const created = await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)
      )

      const updated = await repository.update(created.id, {
        status: 'allocated',
        resolutionType: 'allocated_to_quota',
        allocatedBy: userId,
      })

      expect(updated?.status).toBe('allocated')
      expect(updated?.allocatedAt).toBeInstanceOf(Date)
    })

    it('should auto-set allocatedAt when status changes to refunded', async () => {
      const created = await repository.create(
        PaymentPendingAllocationFactory.pending(paymentId, '50.00', currencyId)
      )

      const updated = await repository.update(created.id, {
        status: 'refunded',
        resolutionType: 'refunded',
        resolutionNotes: 'Refund processed',
        allocatedBy: userId,
      })

      expect(updated?.status).toBe('refunded')
      expect(updated?.allocatedAt).toBeInstanceOf(Date)
    })
  })
})
