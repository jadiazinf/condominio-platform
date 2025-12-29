import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpenseCategory } from '@packages/domain'
import { GetCategoriesByParentService } from '@src/services/expense-categories'

type TMockRepository = {
  getByParentId: (parentCategoryId: string, includeInactive?: boolean) => Promise<TExpenseCategory[]>
}

describe('GetCategoriesByParentService', function () {
  let service: GetCategoriesByParentService
  let mockRepository: TMockRepository

  const parentCategoryId = '550e8400-e29b-41d4-a716-446655440001'

  const mockCategories: TExpenseCategory[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Plumbing',
      description: 'Plumbing maintenance',
      parentCategoryId,
      isActive: true,
      registeredBy: null,
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      name: 'Electrical',
      description: 'Electrical maintenance',
      parentCategoryId,
      isActive: true,
      registeredBy: null,
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      name: 'Inactive Subcategory',
      description: 'An inactive subcategory',
      parentCategoryId,
      isActive: false,
      registeredBy: null,
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByParentId: async function (parent: string, includeInactive?: boolean) {
        const filtered = mockCategories.filter(function (c) {
          return c.parentCategoryId === parent
        })
        if (includeInactive) {
          return filtered
        }
        return filtered.filter(function (c) {
          return c.isActive
        })
      },
    }
    service = new GetCategoriesByParentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only active child categories by default', async function () {
      const result = await service.execute({ parentCategoryId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((c) => c.isActive)).toBe(true)
        expect(result.data.every((c) => c.parentCategoryId === parentCategoryId)).toBe(true)
      }
    })

    it('should return all child categories when includeInactive is true', async function () {
      const result = await service.execute({ parentCategoryId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every((c) => c.parentCategoryId === parentCategoryId)).toBe(true)
      }
    })

    it('should return empty array when parent has no children', async function () {
      const result = await service.execute({ parentCategoryId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
