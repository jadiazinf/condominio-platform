import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  PaymentApplicationsRepository,
  PaymentsRepository,
  QuotasRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  PaymentApplicationFactory,
  PaymentFactory,
  QuotaFactory,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  PaymentConceptFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('PaymentApplicationsRepository', () => {
  let db: TTestDrizzleClient
  let repository: PaymentApplicationsRepository
  let paymentId: string
  let paymentId2: string
  let quotaId: string
  let quotaId2: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new PaymentApplicationsRepository(db)
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
    const paymentConceptsRepository = new PaymentConceptsRepository(db)
    const paymentsRepository = new PaymentsRepository(db)
    const quotasRepository = new QuotasRepository(db)

    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))
    const unit = await unitsRepository.create(UnitFactory.create(building.id))
    const concept = await paymentConceptsRepository.create(
      PaymentConceptFactory.maintenance({ condominiumId: condominium.id, currencyId: currency.id })
    )

    const payment1 = await paymentsRepository.create(
      PaymentFactory.completed({ userId: user.id, unitId: unit.id, currencyId: currency.id })
    )
    const payment2 = await paymentsRepository.create(
      PaymentFactory.completed({ userId: user.id, unitId: unit.id, currencyId: currency.id })
    )

    const quota1 = await quotasRepository.create(
      QuotaFactory.pending({
        unitId: unit.id,
        paymentConceptId: concept.id,
        currencyId: currency.id,
      })
    )
    const quota2 = await quotasRepository.create(
      QuotaFactory.pending({
        unitId: unit.id,
        paymentConceptId: concept.id,
        currencyId: currency.id,
      })
    )

    paymentId = payment1.id
    paymentId2 = payment2.id
    quotaId = quota1.id
    quotaId2 = quota2.id
  })

  describe('create', () => {
    it('should create payment application to principal', async () => {
      const data = PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '100.00')

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.paymentId).toBe(paymentId)
      expect(result.quotaId).toBe(quotaId)
      expect(result.appliedAmount).toBe('100.00')
      expect(result.appliedToPrincipal).toBe('100.00')
      expect(result.appliedToInterest).toBe('0.00')
    })

    it('should create payment application with interest', async () => {
      const data = PaymentApplicationFactory.withInterest(paymentId, quotaId, '90.00', '10.00')

      const result = await repository.create(data)

      expect(result.appliedAmount).toBe('100.00')
      expect(result.appliedToPrincipal).toBe('90.00')
      expect(result.appliedToInterest).toBe('10.00')
    })
  })

  describe('getById', () => {
    it('should return application by id', async () => {
      const created = await repository.create(
        PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '50.00')
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
    it('should return all applications', async () => {
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '50.00'))
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId2, '50.00'))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete application', async () => {
      const created = await repository.create(
        PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '50.00')
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByPaymentId', () => {
    it('should return applications for payment', async () => {
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '50.00'))
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId2, '50.00'))
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId2, quotaId, '25.00'))

      const result = await repository.getByPaymentId(paymentId)

      expect(result).toHaveLength(2)
      expect(result.every(a => a.paymentId === paymentId)).toBe(true)
    })
  })

  describe('getByQuotaId', () => {
    it('should return applications for quota', async () => {
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '50.00'))
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId2, quotaId, '25.00'))
      await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId2, '30.00'))

      const result = await repository.getByQuotaId(quotaId)

      expect(result).toHaveLength(2)
      expect(result.every(a => a.quotaId === quotaId)).toBe(true)
    })
  })

  // NOTE: Methods getTotalAppliedToQuota and getTotalAppliedFromPayment do not exist in PaymentApplicationsRepository
  // describe('getTotalAppliedToQuota', () => {
  //   it('should return sum of all applications to quota', async () => {
  //     await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '50.00'))
  //     await repository.create(PaymentApplicationFactory.toPrincipal(paymentId2, quotaId, '25.00'))

  //     const result = await repository.getTotalAppliedToQuota(quotaId)

  //     expect(result).toBe('75.00')
  //   })

  //   it('should return 0 for quota with no applications', async () => {
  //     const result = await repository.getTotalAppliedToQuota(quotaId)
  //     expect(result).toBe('0.00')
  //   })
  // })

  // describe('getTotalAppliedFromPayment', () => {
  //   it('should return sum of all applications from payment', async () => {
  //     await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId, '60.00'))
  //     await repository.create(PaymentApplicationFactory.toPrincipal(paymentId, quotaId2, '40.00'))

  //     const result = await repository.getTotalAppliedFromPayment(paymentId)

  //     expect(result).toBe('100.00')
  //   })
  // })
})
