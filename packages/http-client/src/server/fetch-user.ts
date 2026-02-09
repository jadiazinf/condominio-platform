import type { TUser } from '@packages/domain'

import { getEnvConfig } from '../config/env'
import type { TApiDataResponse } from '../types/api-responses'

export class FetchUserError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isRetryable: boolean
  ) {
    super(message)
    this.name = 'FetchUserError'
  }
}

export async function fetchUserByFirebaseUid(
  firebaseUid: string,
  token: string
): Promise<TUser | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/platform/users/firebase/${firebaseUid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // User not found - return null to allow sync attempt
      if (response.status === 404) {
        return null
      }
      // Rate limiting or server errors - throw retryable error
      if (response.status === 429 || response.status >= 500) {
        throw new FetchUserError(
          `Failed to fetch user: ${response.status}`,
          response.status,
          true
        )
      }
      // Other errors - throw non-retryable error
      throw new FetchUserError(
        `Failed to fetch user: ${response.status}`,
        response.status,
        false
      )
    }

    const data = (await response.json()) as TApiDataResponse<TUser>
    return data.data
  } catch (error) {
    // Re-throw FetchUserError to be handled upstream
    if (error instanceof FetchUserError) {
      throw error
    }
    console.error('Error fetching user by Firebase UID:', error)
    return null
  }
}

/**
 * Syncs the Firebase UID for an existing user by email.
 * This handles cases where a user exists in the database with a different Firebase UID
 * (e.g., when testing across different environments or Firebase projects).
 */
export async function syncUserFirebaseUid(
  email: string,
  firebaseUid: string,
  token: string
): Promise<TUser | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/platform/users/sync-firebase-uid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, firebaseUid }),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      // Rate limiting or server errors - throw retryable error
      if (response.status === 429 || response.status >= 500) {
        throw new FetchUserError(
          `Failed to sync Firebase UID: ${response.status}`,
          response.status,
          true
        )
      }
      throw new FetchUserError(
        `Failed to sync Firebase UID: ${response.status}`,
        response.status,
        false
      )
    }

    const data = (await response.json()) as TApiDataResponse<TUser>
    return data.data
  } catch (error) {
    // Re-throw FetchUserError to be handled upstream
    if (error instanceof FetchUserError) {
      throw error
    }
    console.error('Error syncing Firebase UID:', error)
    return null
  }
}
