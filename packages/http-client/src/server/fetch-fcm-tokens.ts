import { getEnvConfig } from '../config/env'

export interface IFcmTokenSummary {
  id: string
  platform: string
  deviceName: string | null
  isActive: boolean
  lastUsedAt: string | null
}

export async function fetchUserFcmTokens(
  token: string,
  userId: string
): Promise<IFcmTokenSummary[]> {
  const { apiBaseUrl } = getEnvConfig()

  const response = await fetch(`${apiBaseUrl}/me/fcm-tokens/user/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return []
  }

  const body = (await response.json()) as { data: IFcmTokenSummary[] }

  return body.data ?? []
}
