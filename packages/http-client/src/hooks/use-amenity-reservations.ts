import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TAmenityReservation, TAmenityReservationCreate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const amenityReservationKeys = {
  all: ['amenity-reservations'] as const,
  lists: () => [...amenityReservationKeys.all, 'list'] as const,
  byAmenity: (amenityId: string) => [...amenityReservationKeys.all, 'amenity', amenityId] as const,
  byUser: (userId: string) => [...amenityReservationKeys.all, 'user', userId] as const,
  details: () => [...amenityReservationKeys.all, 'detail'] as const,
  detail: (id: string) => [...amenityReservationKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseAmenityReservationsOptions {
  enabled?: boolean
}

export interface IUseReservationDetailOptions {
  enabled?: boolean
}

export interface ICreateReservationOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenityReservation>>) => void
  onError?: (error: Error) => void
}

export interface IApproveReservationOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenityReservation>>) => void
  onError?: (error: Error) => void
}

export interface IRejectReservationOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenityReservation>>) => void
  onError?: (error: Error) => void
}

export interface ICancelReservationOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAmenityReservation>>) => void
  onError?: (error: Error) => void
}

export interface IRejectReservationData {
  rejectionReason?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Reservations
// ─────────────────────────────────────────────────────────────────────────────

export function useAmenityReservations(options?: IUseAmenityReservationsOptions) {
  return useApiQuery<TApiDataResponse<TAmenityReservation[]>>({
    path: '/condominium/amenity-reservations',
    queryKey: amenityReservationKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Reservations by Amenity
// ─────────────────────────────────────────────────────────────────────────────

export function useReservationsByAmenity(amenityId: string, options?: IUseAmenityReservationsOptions) {
  return useApiQuery<TApiDataResponse<TAmenityReservation[]>>({
    path: `/condominium/amenity-reservations/amenity/${amenityId}`,
    queryKey: amenityReservationKeys.byAmenity(amenityId),
    config: {},
    enabled: options?.enabled !== false && !!amenityId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Reservations by User
// ─────────────────────────────────────────────────────────────────────────────

export function useReservationsByUser(userId: string, options?: IUseAmenityReservationsOptions) {
  return useApiQuery<TApiDataResponse<TAmenityReservation[]>>({
    path: `/condominium/amenity-reservations/user/${userId}`,
    queryKey: amenityReservationKeys.byUser(userId),
    config: {},
    enabled: options?.enabled !== false && !!userId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Reservation by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useReservationDetail(id: string, options?: IUseReservationDetailOptions) {
  return useApiQuery<TApiDataResponse<TAmenityReservation>>({
    path: `/condominium/amenity-reservations/${id}`,
    queryKey: amenityReservationKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Reservation
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateReservation(options?: ICreateReservationOptions) {
  return useApiMutation<TApiDataResponse<TAmenityReservation>, TAmenityReservationCreate>({
    path: '/condominium/amenity-reservations',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityReservationKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Approve Reservation
// ─────────────────────────────────────────────────────────────────────────────

export function useApproveReservation(id: string, options?: IApproveReservationOptions) {
  return useApiMutation<TApiDataResponse<TAmenityReservation>, Record<string, never>>({
    path: `/condominium/amenity-reservations/${id}/approve`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityReservationKeys.all, amenityReservationKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Reject Reservation
// ─────────────────────────────────────────────────────────────────────────────

export function useRejectReservation(id: string, options?: IRejectReservationOptions) {
  return useApiMutation<TApiDataResponse<TAmenityReservation>, IRejectReservationData>({
    path: `/condominium/amenity-reservations/${id}/reject`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityReservationKeys.all, amenityReservationKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Cancel Reservation
// ─────────────────────────────────────────────────────────────────────────────

export function useCancelReservation(id: string, options?: ICancelReservationOptions) {
  return useApiMutation<TApiDataResponse<TAmenityReservation>, Record<string, never>>({
    path: `/condominium/amenity-reservations/${id}/cancel`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [amenityReservationKeys.all, amenityReservationKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getAmenityReservations(): Promise<TAmenityReservation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenityReservation[]>>('/condominium/amenity-reservations')
  return response.data.data
}

export async function getReservationsByAmenity(amenityId: string): Promise<TAmenityReservation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenityReservation[]>>(
    `/condominium/amenity-reservations/amenity/${amenityId}`
  )
  return response.data.data
}

export async function getReservationsByUser(userId: string): Promise<TAmenityReservation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenityReservation[]>>(
    `/condominium/amenity-reservations/user/${userId}`
  )
  return response.data.data
}

export async function getReservationDetail(id: string): Promise<TAmenityReservation> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAmenityReservation>>(
    `/condominium/amenity-reservations/${id}`
  )
  return response.data.data
}

export async function createReservation(data: TAmenityReservationCreate): Promise<TAmenityReservation> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TAmenityReservation>>(
    '/condominium/amenity-reservations',
    data
  )
  return response.data.data
}

export async function approveReservation(id: string): Promise<TAmenityReservation> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TAmenityReservation>>(
    `/condominium/amenity-reservations/${id}/approve`,
    {}
  )
  return response.data.data
}

export async function rejectReservation(
  id: string,
  data?: IRejectReservationData
): Promise<TAmenityReservation> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TAmenityReservation>>(
    `/condominium/amenity-reservations/${id}/reject`,
    data ?? {}
  )
  return response.data.data
}

export async function cancelReservation(id: string): Promise<TAmenityReservation> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TAmenityReservation>>(
    `/condominium/amenity-reservations/${id}/cancel`,
    {}
  )
  return response.data.data
}
