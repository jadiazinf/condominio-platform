import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  QuotaGenerationRulesRepository,
  QuotaFormulasRepository,
  PaymentConceptsRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UsersRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  QuotaGenerationRuleFactory,
  QuotaFormulaFactory,
  PaymentConceptFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UserFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('QuotaGenerationRulesRepository', () => {
  let db: TTestDrizzleClient
  let repository: QuotaGenerationRulesRepository
  let condominiumId: string
  let buildingId: string
  let paymentConceptId: string
  let quotaFormulaId: string
  let userId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new QuotaGenerationRulesRepository(db)
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
    const paymentConceptsRepository = new PaymentConceptsRepository(db)
    const quotaFormulasRepository = new QuotaFormulasRepository(db)

    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))
    const concept = await paymentConceptsRepository.create(
      PaymentConceptFactory.maintenance({ condominiumId: condominium.id, currencyId: currency.id })
    )
    const formula = await quotaFormulasRepository.create(
      QuotaFormulaFactory.fixed('100.00', {
        condominiumId: condominium.id,
        currencyId: currency.id,
        createdBy: user.id,
      })
    )

    userId = user.id
    condominiumId = condominium.id
    buildingId = building.id
    paymentConceptId = concept.id
    quotaFormulaId = formula.id
  })

  describe('create', () => {
    it('should create rule for condominium', async () => {
      const data = QuotaGenerationRuleFactory.forCondominium(
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        { effectiveFrom: '2025-01-01', createdBy: userId }
      )

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.buildingId).toBeNull()
      expect(result.paymentConceptId).toBe(paymentConceptId)
      expect(result.quotaFormulaId).toBe(quotaFormulaId)
      expect(result.isActive).toBe(true)
    })

    it('should create rule for specific building', async () => {
      const data = QuotaGenerationRuleFactory.forBuilding(
        condominiumId,
        buildingId,
        paymentConceptId,
        quotaFormulaId,
        { effectiveFrom: '2025-01-01', createdBy: userId }
      )

      const result = await repository.create(data)

      expect(result.buildingId).toBe(buildingId)
    })
  })

  describe('getById', () => {
    it('should return rule by id', async () => {
      const created = await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          createdBy: userId,
        })
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
    it('should return active rules only by default', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          isActive: true,
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaGenerationRuleFactory.forBuilding(
          condominiumId,
          buildingId,
          paymentConceptId,
          quotaFormulaId,
          {
            isActive: false,
            createdBy: userId,
          }
        )
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete rule', async () => {
      const created = await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          createdBy: userId,
        })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByCondominiumId', () => {
    it('should return rules for condominium', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaGenerationRuleFactory.forBuilding(
          condominiumId,
          buildingId,
          paymentConceptId,
          quotaFormulaId,
          { createdBy: userId }
        )
      )

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every(r => r.condominiumId === condominiumId)).toBe(true)
    })
  })

  describe('getByBuildingId', () => {
    it('should return rules for building', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaGenerationRuleFactory.forBuilding(
          condominiumId,
          buildingId,
          paymentConceptId,
          quotaFormulaId,
          { createdBy: userId }
        )
      )

      const result = await repository.getByBuildingId(buildingId)

      expect(result).toHaveLength(1)
      expect(result[0]?.buildingId).toBe(buildingId)
    })
  })

  describe('getByPaymentConceptId', () => {
    it('should return rules for payment concept', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          createdBy: userId,
        })
      )

      const result = await repository.getByPaymentConceptId(paymentConceptId)

      expect(result).toHaveLength(1)
      expect(result[0]?.paymentConceptId).toBe(paymentConceptId)
    })
  })

  describe('getEffectiveRulesForDate', () => {
    it('should return rules effective on date', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-06-30',
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          effectiveFrom: '2025-07-01',
          effectiveTo: null,
          createdBy: userId,
        })
      )

      const jan = await repository.getEffectiveRulesForDate(condominiumId, '2025-03-15')
      const aug = await repository.getEffectiveRulesForDate(condominiumId, '2025-08-01')

      expect(jan).toHaveLength(1)
      expect(jan[0]?.effectiveFrom).toBe('2025-01-01')

      expect(aug).toHaveLength(1)
      expect(aug[0]?.effectiveFrom).toBe('2025-07-01')
    })
  })

  describe('getApplicableRule', () => {
    it('should prioritize building rule over condominium rule', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          name: 'Condo Rule',
          effectiveFrom: '2025-01-01',
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaGenerationRuleFactory.forBuilding(
          condominiumId,
          buildingId,
          paymentConceptId,
          quotaFormulaId,
          {
            name: 'Building Rule',
            effectiveFrom: '2025-01-01',
            createdBy: userId,
          }
        )
      )

      const result = await repository.getApplicableRule(
        condominiumId,
        paymentConceptId,
        '2025-03-15',
        buildingId
      )

      expect(result).toBeDefined()
      expect(result?.name).toBe('Building Rule')
      expect(result?.buildingId).toBe(buildingId)
    })

    it('should fall back to condominium rule when no building rule', async () => {
      await repository.create(
        QuotaGenerationRuleFactory.forCondominium(condominiumId, paymentConceptId, quotaFormulaId, {
          name: 'Condo Rule',
          effectiveFrom: '2025-01-01',
          createdBy: userId,
        })
      )

      const result = await repository.getApplicableRule(
        condominiumId,
        paymentConceptId,
        '2025-03-15',
        buildingId
      )

      expect(result).toBeDefined()
      expect(result?.name).toBe('Condo Rule')
      expect(result?.buildingId).toBeNull()
    })

    it('should return null when no applicable rule', async () => {
      const result = await repository.getApplicableRule(
        condominiumId,
        paymentConceptId,
        '2025-03-15'
      )

      expect(result).toBeNull()
    })
  })
})
