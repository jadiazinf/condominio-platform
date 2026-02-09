import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TAmenity, TAmenityCreate, TAmenityUpdate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const amenityKeys = {
  all: ['amenities'] as const,
  lists: () => [...amenityKeys.all, 'list'] as const,
  byCondominium: (condominiumId: string) => [...amenityKeys.all, 'condominium', condominiumId] as const,
  details: () => [...amenityKeys.all, 'detail'] as const,
  detail: (id: string) => [...amenityKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseAmenitiesOptions {
  enabled?: boolean
}

export interface IUseAmenityDetailOptions {
  enabled?: boolean
}

export interface ICreateAmenityOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenity>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateAmenityOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenity>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteAmenityOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenity>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Amenities
// ─────────────────────────────────────────────────────────────────────────────

export function useAmenities(options?: IUseAmenitiesOptions) {
  return useApiQuery<TApiDataResponse<TAmenity[]>>({
    path: '/condominium/amenities',
    queryKey: amenityKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Amenities by Condominium
// ─────────────────────────────────────────────────────────────────────────────

export function useAmenitiesByCondominium(condominiumId: string, options?: IUseAmenitiesOptions) {
  return useApiQuery<TApiDataResponse<TAmenity[]>>({
    path: `/condominium/amenities/condominium/${condominiumId}`,
    queryKey: amenityKeys.byCondominium(condominiumId),
    config: {},
    enabled: options?.enabled !== false && !!condominiumId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Amenity by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useAmenityDetail(id: string, options?: IUseAmenityDetailOptions) {
  return useApiQuery<TApiDataResponse<TAmenity>>({
    path: `/condominium/amenities/${id}`,
    queryKey: amenityKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Amenity
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateAmenity(options?: ICreateAmenityOptions) {
  return useApiMutation<TApiDataResponse<TAmenity>, TAmenityCreate>({
    path: '/condominium/amenities',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Amenity
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateAmenity(id: string, options?: IUpdateAmenityOptions) {
  return useApiMutation<TApiDataResponse<TAmenity>, TAmenityUpdate>({
    path: `/condominium/amenities/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityKeys.all, amenityKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Amenity
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteAmenity(options?: IDeleteAmenityOptions) {
  return useApiMutation<TApiDataResponse<TAmenity>, { id: string }>({
    path: (data) => `/condominium/amenities/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getAmenities(): Promise<TAmenity[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenity[]>>('/condominium/amenities')
  return response.data.data
}

export async function getAmenitiesByCondominium(condominiumId: string): Promise<TAmenity[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenity[]>>(
    `/condominium/amenities/condominium/${condominiumId}`
  )
  return response.data.data
}

export async function getAmenityDetail(id: string): Promise<TAmenity> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenity>>(`/condominium/amenities/${id}`)
  return response.data.data
}

export async function createAmenity(data: TAmenityCreate): Promise<TAmenity> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TAmenity>>('/condominium/amenities', data)
  return response.data.data
}

export async function updateAmenity(id: string, data: TAmenityUpdate): Promise<TAmenity> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TAmenity>>(`/condominium/amenities/${id}`, data)
  return response.data.data
}

export async function deleteAmenity(id: string): Promise<TAmenity> {
  const client = getHttpClient()
  const response = await client.delete<TApiDataResponse<TAmenity>>(`/condominium/amenities/${id}`)
  return response.data.data
}
