import { useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { TChargeCategory } from '@packages/domain'

// ─── Query Keys ───

export const chargeCategoryKeys = {
  all: ['charge-categories'] as const,
  lists: () => [...chargeCategoryKeys.all, 'list'] as const,
  allCategories: () => [...chargeCategoryKeys.all, 'all'] as const,
}

// ─── Hooks ───

/** Returns user-visible categories (non-system, active) */
export function useChargeCategories(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TChargeCategory[]>>({
    queryKey: chargeCategoryKeys.lists(),
    path: '/condominium/charge-categories',
    config: {},
    enabled: options?.enabled !== false,
  })
}

/** Returns all categories including system ones (admin only) */
export function useAllChargeCategories(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TChargeCategory[]>>({
    queryKey: chargeCategoryKeys.allCategories(),
    path: '/condominium/charge-categories/all',
    config: {},
    enabled: options?.enabled !== false,
  })
}
