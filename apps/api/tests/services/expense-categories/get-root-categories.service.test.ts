import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpenseCategory } from '@packages/domain'
import { GetRootCategoriesService } from '@src/services/expense-categories'

type TMockRepository = {
  getRootCategories: (includeInactive?: boolean) => Promise<TExpenseCategory[]>
}

describe('GetRootCategoriesService', function () {
  let service: GetRootCategoriesService
  let mockRepository: TMockRepository

  const mockCategories: TExpenseCategory[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Maintenance',
      description: 'General maintenance expenses',
      parentCategoryId: null,
      isActive: true,
      registeredBy: null,
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Utilities',
      description: 'Utility expenses',
      parentCategoryId: null,
      isActive: true,
      registeredBy: null,
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Archived Category',
      description: 'An inactive category',
      parentCategoryId: null,
      isActive: false,
      registeredBy: null,
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getRootCategories: async function (includeInactive?: boolean) {
        if (includeInactive) {
          return mockCategories.filter(function (c) {
            return c.parentCategoryId === null
          })
        }
        return mockCategories.filter(function (c) {
          return c.parentCategoryId === null && c.isActive
        })
      },
    }
    service = new GetRootCategoriesService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only active root categories by default', async function () {
      const result = await service.execute({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(c => c.isActive)).toBe(true)
        expect(result.data.every(c => c.parentCategoryId === null)).toBe(true)
      }
    })

    it('should return all root categories when includeInactive is true', async function () {
      const result = await service.execute({ includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every(c => c.parentCategoryId === null)).toBe(true)
      }
    })

    it('should return empty array when no root categories exist', async function () {
      mockRepository.getRootCategories = async function () {
        return []
      }

      const result = await service.execute({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
