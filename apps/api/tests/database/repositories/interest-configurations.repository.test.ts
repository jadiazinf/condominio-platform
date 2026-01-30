import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  InterestConfigurationsRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  InterestConfigurationFactory,
  CurrencyFactory,
  CondominiumFactory,
  PaymentConceptFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('InterestConfigurationsRepository', () => {
  let db: TTestDrizzleClient
  let repository: InterestConfigurationsRepository
  let condominiumId: string
  let paymentConceptId: string
  let paymentConceptId2: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new InterestConfigurationsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const paymentConceptsRepository = new PaymentConceptsRepository(db)

    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const concept = await paymentConceptsRepository.create(
      PaymentConceptFactory.maintenance({ condominiumId: condominium.id, currencyId: currency.id })
    )
    const concept2 = await paymentConceptsRepository.create(
      PaymentConceptFactory.fine({ condominiumId: condominium.id, currencyId: currency.id })
    )

    condominiumId = condominium.id
    paymentConceptId = concept.id
    paymentConceptId2 = concept2.id
  })

  describe('create', () => {
    it('should create simple interest configuration', async () => {
      const data = InterestConfigurationFactory.simple({
        condominiumId,
        interestRate: '10.00',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.interestType).toBe('simple')
      expect(parseFloat(result.interestRate ?? '0')).toBe(10.0)
      expect(result.isActive).toBe(true)
    })

    it('should create compound interest configuration', async () => {
      const data = InterestConfigurationFactory.compound({
        condominiumId,
      })

      const result = await repository.create(data)

      expect(result.interestType).toBe('compound')
      expect(parseFloat(result.interestRate ?? '0')).toBe(12.0)
    })

    it('should create configuration for specific concept', async () => {
      const data = InterestConfigurationFactory.simple({
        condominiumId,
        paymentConceptId,
      })

      const result = await repository.create(data)

      expect(result.paymentConceptId).toBe(paymentConceptId)
    })
  })

  describe('getById', () => {
    it('should return configuration by id', async () => {
      const created = await repository.create(
        InterestConfigurationFactory.simple({ condominiumId })
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
    it('should return active configurations only by default', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, isActive: true })
      )
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete configuration', async () => {
      const created = await repository.create(
        InterestConfigurationFactory.simple({ condominiumId })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id, true)
      expect(found?.isActive).toBe(false)

      // Verify it's not returned without includeInactive flag
      const notFound = await repository.getById(created.id)
      expect(notFound).toBeNull()
    })
  })

  describe('getByCondominiumId', () => {
    it('should return configurations for condominium', async () => {
      await repository.create(InterestConfigurationFactory.simple({ condominiumId }))
      await repository.create(InterestConfigurationFactory.compound({ condominiumId }))

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every(c => c.condominiumId === condominiumId)).toBe(true)
    })

    it('should filter inactive by default', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, isActive: true })
      )
      await repository.create(
        InterestConfigurationFactory.compound({ condominiumId, isActive: false })
      )

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })

    it('should include inactive when requested', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, isActive: true })
      )
      await repository.create(
        InterestConfigurationFactory.compound({ condominiumId, isActive: false })
      )

      const result = await repository.getByCondominiumId(condominiumId, true)

      expect(result).toHaveLength(2)
    })
  })

  describe('getByPaymentConceptId', () => {
    it('should return configurations for payment concept', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, paymentConceptId })
      )

      const result = await repository.getByPaymentConceptId(paymentConceptId)

      expect(result).toHaveLength(1)
      expect(result[0]?.paymentConceptId).toBe(paymentConceptId)
    })

    it('should return empty array when no configuration for concept', async () => {
      const result = await repository.getByPaymentConceptId(paymentConceptId)
      expect(result).toHaveLength(0)
    })

    it('should filter inactive by default', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, paymentConceptId, isActive: true })
      )
      await repository.create(
        InterestConfigurationFactory.simple({ condominiumId, paymentConceptId, isActive: false })
      )

      const result = await repository.getByPaymentConceptId(paymentConceptId)

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('getActiveForDate', () => {
    it('should return configuration active on date', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({
          condominiumId,
          paymentConceptId,
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-06-30',
        })
      )

      const result = await repository.getActiveForDate(paymentConceptId, '2025-03-15')

      expect(result).toBeDefined()
      expect(result?.paymentConceptId).toBe(paymentConceptId)
    })

    it('should return null when no active configuration for date', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({
          condominiumId,
          paymentConceptId,
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-06-30',
        })
      )

      const result = await repository.getActiveForDate(paymentConceptId, '2025-12-01')

      expect(result).toBeNull()
    })

    it('should handle open-ended configurations', async () => {
      await repository.create(
        InterestConfigurationFactory.simple({
          condominiumId,
          paymentConceptId,
          effectiveFrom: '2025-01-01',
          effectiveTo: null,
        })
      )

      const result = await repository.getActiveForDate(paymentConceptId, '2030-12-31')

      expect(result).toBeDefined()
      expect(result?.paymentConceptId).toBe(paymentConceptId)
    })
  })
})
