import type { TUserCondominiumsResponse } from '@packages/domain'

import { getEnvConfig } from '../config/env'
import type { TApiDataResponse } from '../types/api-responses'

export async function fetchUserCondominiums(
  token: string
): Promise<TUserCondominiumsResponse | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/platform/users/me/condominiums`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch user condominiums: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TUserCondominiumsResponse>

    return data.data
  } catch (error) {
    console.error('Error fetching user condominiums:', error)

    return null
  }
}
