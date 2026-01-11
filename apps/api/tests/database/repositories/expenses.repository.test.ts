import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  ExpensesRepository,
  ExpenseCategoriesRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UsersRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  ExpenseFactory,
  ExpenseCategoryFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UserFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('ExpensesRepository', () => {
  let db: TTestDrizzleClient
  let repository: ExpensesRepository
  let condominiumId: string
  let buildingId: string
  let currencyId: string
  let categoryId: string
  let userId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new ExpensesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const usersRepository = new UsersRepository(db)
    const expenseCategoriesRepository = new ExpenseCategoriesRepository(db)
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)

    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(
      BuildingFactory.create(condominium.id)
    )
    const category = await expenseCategoriesRepository.create(ExpenseCategoryFactory.create())

    userId = user.id
    condominiumId = condominium.id
    buildingId = building.id
    currencyId = currency.id
    categoryId = category.id
  })

  describe('create', () => {
    it('should create pending expense', async () => {
      const data = ExpenseFactory.pending({
        condominiumId,
        expenseCategoryId: categoryId,
        currencyId,
        amount: '500.00',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.amount).toBe('500.00')
      expect(result.status).toBe('pending')
    })

    it('should create expense for building', async () => {
      const data = ExpenseFactory.pending({
        buildingId,
        expenseCategoryId: categoryId,
        currencyId,
      })

      const result = await repository.create(data)

      expect(result.buildingId).toBe(buildingId)
    })

    it('should create approved expense', async () => {
      const data = ExpenseFactory.approved({
        condominiumId,
        expenseCategoryId: categoryId,
        currencyId,
        approvedBy: userId,
      })

      const result = await repository.create(data)

      expect(result.status).toBe('approved')
      expect(result.approvedBy).toBe(userId)
    })
  })

  describe('getById', () => {
    it('should return expense by id', async () => {
      const created = await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
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
    it('should return all expenses', async () => {
      await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
      )
      await repository.create(
        ExpenseFactory.approved({ buildingId, expenseCategoryId: categoryId, currencyId, approvedBy: userId })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete expense', async () => {
      const created = await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByCondominiumId', () => {
    it('should return expenses for condominium', async () => {
      await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
      )
      await repository.create(
        ExpenseFactory.approved({ condominiumId, expenseCategoryId: categoryId, currencyId, approvedBy: userId })
      )

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every((e) => e.condominiumId === condominiumId)).toBe(true)
    })
  })

  describe('getByBuildingId', () => {
    it('should return expenses for building', async () => {
      await repository.create(
        ExpenseFactory.pending({ buildingId, expenseCategoryId: categoryId, currencyId })
      )

      const result = await repository.getByBuildingId(buildingId)

      expect(result).toHaveLength(1)
      expect(result[0]?.buildingId).toBe(buildingId)
    })
  })

  describe('getByStatus', () => {
    it('should return expenses by status', async () => {
      await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
      )
      await repository.create(
        ExpenseFactory.approved({ condominiumId, expenseCategoryId: categoryId, currencyId, approvedBy: userId })
      )
      await repository.create(
        ExpenseFactory.pending({ buildingId, expenseCategoryId: categoryId, currencyId })
      )

      const result = await repository.getByStatus('pending')

      expect(result).toHaveLength(2)
      expect(result.every((e) => e.status === 'pending')).toBe(true)
    })
  })

  describe('getByCategoryId', () => {
    it('should return expenses by category', async () => {
      await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
      )
      await repository.create(
        ExpenseFactory.pending({ buildingId, expenseCategoryId: categoryId, currencyId })
      )

      const result = await repository.getByCategoryId(categoryId)

      expect(result).toHaveLength(2)
      expect(result.every((e) => e.expenseCategoryId === categoryId)).toBe(true)
    })
  })

  describe('getPendingApproval', () => {
    it('should return pending expenses', async () => {
      await repository.create(
        ExpenseFactory.pending({ condominiumId, expenseCategoryId: categoryId, currencyId })
      )
      await repository.create(
        ExpenseFactory.approved({ condominiumId, expenseCategoryId: categoryId, currencyId, approvedBy: userId })
      )

      const result = await repository.getPendingApproval()

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('pending')
    })
  })
})
