import { useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'

export interface TConceptDelinquencyQuota {
  id: string
  periodYear: number
  periodMonth: number | null
  periodDescription: string | null
  baseAmount: string
  balance: string
  interestAmount: string
  dueDate: string
  daysOverdue: number
  status: string
}

export interface TConceptDelinquencyUnit {
  unitId: string
  unitNumber: string
  buildingId: string
  buildingName: string
  overdueCount: number
  totalBalance: number
  totalInterestAmount: number
  oldestDueDate: string
  quotas: TConceptDelinquencyQuota[]
}

export interface TConceptDelinquencyResponse {
  totalDelinquentUnits: number
  totalBalance: number
  totalInterestAmount: number
  units: TConceptDelinquencyUnit[]
}

export interface IUsePaymentConceptDelinquencyOptions {
  companyId: string
  conceptId: string
  enabled?: boolean
}

export function usePaymentConceptDelinquency(options: IUsePaymentConceptDelinquencyOptions) {
  const { companyId, conceptId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TConceptDelinquencyResponse>>({
    path: `/${companyId}/me/payment-concepts/${conceptId}/delinquency`,
    queryKey: ['payment-concepts', 'delinquency', companyId, conceptId],
    enabled: enabled && !!companyId && !!conceptId,
  })
}
