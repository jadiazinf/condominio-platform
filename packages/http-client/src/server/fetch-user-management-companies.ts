import { StatusCodes } from 'http-status-codes'
import type { TUserManagementCompaniesResponse } from '@packages/domain'

import { getEnvConfig } from '../config/env'
import type { TApiDataResponse } from '../types/api-responses'

export async function fetchUserManagementCompanies(
  token: string
): Promise<TUserManagementCompaniesResponse | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/platform/users/me/management-companies`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === StatusCodes.NOT_FOUND) {
        return null
      }
      throw new Error(`Failed to fetch user management companies: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TUserManagementCompaniesResponse>

    return data.data
  } catch (error) {
    console.error('Error fetching user management companies:', error)

    return null
  }
}
