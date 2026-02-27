import { describe, it, expect, beforeEach } from 'bun:test'
import type {
  TQuotaGenerationRule,
  TCondominium,
  TBuilding,
  TPaymentConcept,
  TQuotaFormula,
} from '@packages/domain'
import { CreateQuotaGenerationRuleService } from '@src/services/quota-generation-rules'

type TMockQuotaGenerationRulesRepository = {
  create: (data: unknown) => Promise<TQuotaGenerationRule>
  getByPaymentConceptId: (paymentConceptId: string) => Promise<TQuotaGenerationRule[]>
}

type TMockCondominiumsRepository = {
  getById: (id: string) => Promise<TCondominium | null>
}

type TMockBuildingsRepository = {
  getById: (id: string) => Promise<TBuilding | null>
}

type TMockPaymentConceptsRepository = {
  getById: (id: string) => Promise<TPaymentConcept | null>
}

type TMockQuotaFormulasRepository = {
  getById: (id: string) => Promise<TQuotaFormula | null>
}

describe('CreateQuotaGenerationRuleService', function () {
  let service: CreateQuotaGenerationRuleService
  let mockQuotaGenerationRulesRepository: TMockQuotaGenerationRulesRepository
  let mockCondominiumsRepository: TMockCondominiumsRepository
  let mockBuildingsRepository: TMockBuildingsRepository
  let mockPaymentConceptsRepository: TMockPaymentConceptsRepository
  let mockQuotaFormulasRepository: TMockQuotaFormulasRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const buildingId = '550e8400-e29b-41d4-a716-446655440002'
  const paymentConceptId = '550e8400-e29b-41d4-a716-446655440003'
  const quotaFormulaId = '550e8400-e29b-41d4-a716-446655440004'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440005'

  const mockCondominium: TCondominium = {
    id: condominiumId,
    code: 'CONDO-001',
    name: 'Test Condominium',
    managementCompanyIds: [],
    locationId: null,
    address: null,
    email: null,
    phone: null,
    phoneCountryCode: null,
    defaultCurrencyId: null,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockBuilding: TBuilding = {
    id: buildingId,
    condominiumId,
    code: 'BLD-001',
    name: 'Building A',
    address: null,
    floorsCount: 10,
    unitsCount: 50,
    bankAccountHolder: null,
    bankName: null,
    bankAccountNumber: null,
    bankAccountType: null,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPaymentConcept: TPaymentConcept = {
    id: paymentConceptId,
    condominiumId: null,
    buildingId: null,
    name: 'Monthly Fee',
    description: null,
    conceptType: 'condominium_fee',
    isRecurring: true,
    recurrencePeriod: null,
    currencyId: '550e8400-e29b-41d4-a716-446655440010',
    allowsPartialPayment: true,
    latePaymentType: 'none',
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none',
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: null,
    dueDay: null,
    effectiveFrom: null,
    effectiveUntil: null,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockQuotaFormula: TQuotaFormula = {
    id: quotaFormulaId,
    condominiumId,
    name: 'Fixed Formula',
    description: null,
    formulaType: 'fixed',
    fixedAmount: '100.00',
    expression: null,
    variables: null,
    unitAmounts: null,
    currencyId: '550e8400-e29b-41d4-a716-446655440010',
    isActive: true,
    createdBy: createdByUserId,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    updateReason: null,
  }

  const mockRule: TQuotaGenerationRule = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    condominiumId,
    buildingId: null,
    paymentConceptId,
    quotaFormulaId,
    name: 'Monthly Fee Rule',
    description: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isActive: true,
    createdBy: createdByUserId,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    updateReason: null,
  }

  beforeEach(function () {
    mockCondominiumsRepository = {
      getById: async function (id: string) {
        if (id === condominiumId) return mockCondominium
        return null
      },
    }

    mockBuildingsRepository = {
      getById: async function (id: string) {
        if (id === buildingId) return mockBuilding
        return null
      },
    }

    mockPaymentConceptsRepository = {
      getById: async function (id: string) {
        if (id === paymentConceptId) return mockPaymentConcept
        return null
      },
    }

    mockQuotaFormulasRepository = {
      getById: async function (id: string) {
        if (id === quotaFormulaId) return mockQuotaFormula
        return null
      },
    }

    mockQuotaGenerationRulesRepository = {
      create: async function () {
        return mockRule
      },
      getByPaymentConceptId: async function () {
        return []
      },
    }

    service = new CreateQuotaGenerationRuleService(
      mockQuotaGenerationRulesRepository as never,
      mockCondominiumsRepository as never,
      mockBuildingsRepository as never,
      mockPaymentConceptsRepository as never,
      mockQuotaFormulasRepository as never
    )
  })

  describe('execute', function () {
    it('should create a rule successfully', async function () {
      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Monthly Fee Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.condominiumId).toBe(condominiumId)
        expect(result.data.paymentConceptId).toBe(paymentConceptId)
        expect(result.data.quotaFormulaId).toBe(quotaFormulaId)
      }
    })

    it('should create a building-specific rule', async function () {
      const buildingRule: TQuotaGenerationRule = {
        ...mockRule,
        buildingId,
      }

      mockQuotaGenerationRulesRepository.create = async function () {
        return buildingRule
      }

      const result = await service.execute({
        condominiumId,
        buildingId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Building A Monthly Fee',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.buildingId).toBe(buildingId)
      }
    })

    it('should create a rule with end date', async function () {
      const timeRangedRule: TQuotaGenerationRule = {
        ...mockRule,
        effectiveTo: '2024-12-31',
      }

      mockQuotaGenerationRulesRepository.create = async function () {
        return timeRangedRule
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Monthly Fee Rule',
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        createdByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.effectiveTo).toBe('2024-12-31')
      }
    })

    it('should fail when condominium does not exist', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440999',
        paymentConceptId,
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Condominium not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when building does not exist', async function () {
      const result = await service.execute({
        condominiumId,
        buildingId: '550e8400-e29b-41d4-a716-446655440999',
        paymentConceptId,
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Building not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when building belongs to different condominium', async function () {
      const otherBuilding: TBuilding = {
        ...mockBuilding,
        condominiumId: '550e8400-e29b-41d4-a716-446655440888',
      }

      mockBuildingsRepository.getById = async function () {
        return otherBuilding
      }

      const result = await service.execute({
        condominiumId,
        buildingId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Building does not belong to the specified condominium')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when payment concept does not exist', async function () {
      mockPaymentConceptsRepository.getById = async function () {
        return null
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId: '550e8400-e29b-41d4-a716-446655440999',
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Payment concept not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when quota formula does not exist', async function () {
      mockQuotaFormulasRepository.getById = async function () {
        return null
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId: '550e8400-e29b-41d4-a716-446655440999',
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Quota formula not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when quota formula belongs to different condominium', async function () {
      const otherFormula: TQuotaFormula = {
        ...mockQuotaFormula,
        condominiumId: '550e8400-e29b-41d4-a716-446655440888',
      }

      mockQuotaFormulasRepository.getById = async function () {
        return otherFormula
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Quota formula does not belong to the specified condominium')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when quota formula is inactive', async function () {
      const inactiveFormula: TQuotaFormula = {
        ...mockQuotaFormula,
        isActive: false,
      }

      mockQuotaFormulasRepository.getById = async function () {
        return inactiveFormula
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Quota formula is not active')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when effective from is after effective to', async function () {
      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Test Rule',
        effectiveFrom: '2024-12-31',
        effectiveTo: '2024-01-01',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          'Effective from date must be before or equal to effective to date'
        )
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when overlapping rule exists', async function () {
      const existingRule: TQuotaGenerationRule = {
        ...mockRule,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-06-30',
      }

      mockQuotaGenerationRulesRepository.getByPaymentConceptId = async function () {
        return [existingRule]
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        quotaFormulaId,
        name: 'Overlapping Rule',
        effectiveFrom: '2024-03-01',
        effectiveTo: '2024-09-30',
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          'A rule already exists for this payment concept in the specified date range'
        )
        expect(result.code).toBe('CONFLICT')
      }
    })
  })
})
