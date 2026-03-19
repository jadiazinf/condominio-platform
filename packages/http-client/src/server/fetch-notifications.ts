import type { TNotification, TPaginatedResponse } from '@packages/domain'

import { getEnvConfig } from '../config/env'

export interface IFetchNotificationsParams {
  token: string
  page?: number
  limit?: number
  category?: string
  isRead?: boolean
}

export async function fetchNotificationsPaginated(
  params: IFetchNotificationsParams
): Promise<TPaginatedResponse<TNotification>> {
  const { apiBaseUrl } = getEnvConfig()

  const searchParams = new URLSearchParams()
  searchParams.set('page', String(params.page ?? 1))
  searchParams.set('limit', String(params.limit ?? 20))
  if (params.category) searchParams.set('category', params.category)
  if (params.isRead !== undefined) searchParams.set('isRead', String(params.isRead))

  const response = await fetch(
    `${apiBaseUrl}/me/notifications/paginated?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.token}`,
      },
    }
  )

  if (!response.ok) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }

  return response.json() as Promise<TPaginatedResponse<TNotification>>
}
