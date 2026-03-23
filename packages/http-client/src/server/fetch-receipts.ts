import type { TCondominiumReceipt } from '@packages/domain'
import type { TApiPaginatedResponse } from '../types/api-responses'
import { getHttpClient } from '../client/http-client'

export type TReceiptListItem = TCondominiumReceipt & {
  conceptNames: string[]
  conceptTypes: string[]
  currencySymbol: string | null
}

export async function getReceiptsPaginated(
  token: string,
  query: {
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
    conceptId?: string
  } = {},
  condominiumId?: string,
  managementCompanyId?: string
): Promise<TApiPaginatedResponse<TReceiptListItem>> {
  const client = getHttpClient()

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.startDate) params.set('startDate', query.startDate)
  if (query.endDate) params.set('endDate', query.endDate)
  if (query.conceptId) params.set('conceptId', query.conceptId)

  const queryString = params.toString()
  const path = `/condominium/receipts/paginated${queryString ? `?${queryString}` : ''}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (condominiumId) {
    headers['x-condominium-id'] = condominiumId
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiPaginatedResponse<TReceiptListItem>>(path, { headers })
  return response.data
}
