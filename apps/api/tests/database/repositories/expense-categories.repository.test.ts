import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { ExpenseCategoriesRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  ExpenseCategoryFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('ExpenseCategoriesRepository', () => {
  let db: TTestDrizzleClient
  let repository: ExpenseCategoriesRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new ExpenseCategoriesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new expense category', async () => {
      const data = ExpenseCategoryFactory.create({
        name: 'Maintenance',
        description: 'General maintenance expenses',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Maintenance')
      expect(result.description).toBe('General maintenance expenses')
      expect(result.isActive).toBe(true)
    })

    it('should create category with parent', async () => {
      const parent = await repository.create(ExpenseCategoryFactory.create({ name: 'Services' }))

      const child = await repository.create(
        ExpenseCategoryFactory.create({
          name: 'Electricity',
          parentCategoryId: parent.id,
        })
      )

      expect(child.parentCategoryId).toBe(parent.id)
    })
  })

  describe('getById', () => {
    it('should return category by id', async () => {
      const created = await repository.create(
        ExpenseCategoryFactory.create({ name: 'Find Me Category' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Find Me Category')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active categories', async () => {
      await repository.create(ExpenseCategoryFactory.create({ name: 'Category 1' }))
      await repository.create(ExpenseCategoryFactory.create({ name: 'Category 2' }))
      await repository.create(ExpenseCategoryFactory.create({ name: 'Inactive', isActive: false }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update category fields', async () => {
      const created = await repository.create(
        ExpenseCategoryFactory.create({ name: 'Old Name', description: 'Old desc' })
      )

      const result = await repository.update(created.id, {
        name: 'New Name',
        description: 'New desc',
      })

      expect(result?.name).toBe('New Name')
      expect(result?.description).toBe('New desc')
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete category', async () => {
      const created = await repository.create(ExpenseCategoryFactory.create({ name: 'To Delete' }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id, true)
      expect(found?.isActive).toBe(false)

      // Verify it's not returned without includeInactive flag
      const notFound = await repository.getById(created.id)
      expect(notFound).toBeNull()
    })
  })

  describe('getByParentId', () => {
    it('should return child categories', async () => {
      const parent = await repository.create(
        ExpenseCategoryFactory.create({ name: 'Parent Category' })
      )

      await repository.create(
        ExpenseCategoryFactory.create({ name: 'Child 1', parentCategoryId: parent.id })
      )
      await repository.create(
        ExpenseCategoryFactory.create({ name: 'Child 2', parentCategoryId: parent.id })
      )

      const children = await repository.getByParentId(parent.id)

      expect(children).toHaveLength(2)
    })

    it('should return empty array for category without children', async () => {
      const category = await repository.create(
        ExpenseCategoryFactory.create({ name: 'No Children' })
      )

      const children = await repository.getByParentId(category.id)

      expect(children).toEqual([])
    })
  })

  describe('getRootCategories', () => {
    it('should return only root categories (no parent)', async () => {
      const root1 = await repository.create(ExpenseCategoryFactory.create({ name: 'Root 1' }))
      await repository.create(ExpenseCategoryFactory.create({ name: 'Root 2' }))
      await repository.create(
        ExpenseCategoryFactory.create({ name: 'Child', parentCategoryId: root1.id })
      )

      const rootCategories = await repository.getRootCategories()

      expect(rootCategories).toHaveLength(2)
      expect(rootCategories.every(c => c.parentCategoryId === null)).toBe(true)
    })
  })
})
