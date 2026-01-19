import type { TUser, TGoogleRegisterSchema, TRegisterSchema } from '@packages/domain'

import { useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { ApiResponse } from '../types/http'
import { HttpError } from '../types/http'
import type { TApiDataResponse } from '../types/api-responses'

export interface UseRegisterWithGoogleOptions {
  token: string
  onSuccess?: (data: ApiResponse<TApiDataResponse<TUser>>) => void
  onError?: (error: HttpError) => void
}

export type TGoogleRegisterVariables = TGoogleRegisterSchema

/**
 * Hook to register a new user via Google Sign-In.
 * Sends the Firebase token and user preferences to create a new user.
 */
export function useRegisterWithGoogle(options: UseRegisterWithGoogleOptions) {
  const { token, onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUser>, TGoogleRegisterVariables>({
    path: '/auth/register/google',
    method: 'POST',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    onSuccess,
    onError,
  })
}

/**
 * Server-side function to register a user via Google Sign-In.
 * Use this for SSR or server actions.
 */
export async function registerWithGoogle(
  token: string,
  data: TGoogleRegisterSchema
): Promise<TUser> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TUser>>('/auth/register/google', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

export interface UseRegisterUserOptions {
  token: string
  onSuccess?: (data: ApiResponse<TApiDataResponse<TUser>>) => void
  onError?: (error: HttpError) => void
}

export type TRegisterVariables = TRegisterSchema

/**
 * Hook to register a new user after Firebase authentication.
 * Works for any Firebase auth method (email/password, Google, etc.).
 */
export function useRegisterUser(options: UseRegisterUserOptions) {
  const { token, onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUser>, TRegisterVariables>({
    path: '/auth/register',
    method: 'POST',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    onSuccess,
    onError,
  })
}

/**
 * Function to register a user after Firebase authentication.
 * Works for any Firebase auth method (email/password, Google, etc.).
 */
export async function registerUser(token: string, data: TRegisterSchema): Promise<TUser> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TUser>>('/auth/register', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}
