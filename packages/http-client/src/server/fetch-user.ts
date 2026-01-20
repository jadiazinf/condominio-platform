import type { TUser } from '@packages/domain'

import { getEnvConfig } from '../config/env'
import type { TApiDataResponse } from '../types/api-responses'

export async function fetchUserByFirebaseUid(
  firebaseUid: string,
  token: string
): Promise<TUser | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/users/firebase/${firebaseUid}`, {
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
      throw new Error(`Failed to fetch user: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TUser>
    return data.data
  } catch (error) {
    console.error('Error fetching user by Firebase UID:', error)
    return null
  }
}
