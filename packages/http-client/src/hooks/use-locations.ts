import type { TLocation, TLocationType } from '@packages/domain'

import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'

// =============================================================================
// Types
// =============================================================================

export interface UseLocationsByTypeOptions {
  token: string
  locationType: TLocationType
  enabled?: boolean
}

export interface UseLocationsByParentOptions {
  token: string
  parentId: string | null
  enabled?: boolean
}

export interface UseLocationByIdOptions {
  token: string
  locationId: string | null
  enabled?: boolean
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch locations by type (country, province, city).
 */
export function useLocationsByType(options: UseLocationsByTypeOptions) {
  const { token, locationType, enabled = true } = options

  return useApiQuery<TApiDataResponse<TLocation[]>>({
    path: `/platform/locations/type/${locationType}`,
    queryKey: ['locations', 'type', locationType],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!locationType,
  })
}

/**
 * Hook to fetch locations by parent ID.
 */
export function useLocationsByParent(options: UseLocationsByParentOptions) {
  const { token, parentId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TLocation[]>>({
    path: `/platform/locations/parent/${parentId}`,
    queryKey: ['locations', 'parent', parentId],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!parentId,
  })
}

/**
 * Hook to fetch a single location by ID.
 */
export function useLocationById(options: UseLocationByIdOptions) {
  const { token, locationId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TLocation>>({
    path: `/platform/locations/${locationId}`,
    queryKey: ['locations', 'byId', locationId],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!locationId,
  })
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Function to fetch locations by type.
 */
export async function getLocationsByType(
  token: string,
  locationType: TLocationType
): Promise<TLocation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TLocation[]>>(
    `/platform/locations/type/${locationType}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to fetch locations by parent ID.
 */
export async function getLocationsByParent(
  token: string,
  parentId: string
): Promise<TLocation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TLocation[]>>(
    `/platform/locations/parent/${parentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to fetch a single location by ID.
 */
export async function getLocationById(
  token: string,
  locationId: string
): Promise<TLocation> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TLocation>>(
    `/platform/locations/${locationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to fetch the complete location hierarchy (city -> province -> country).
 * Returns an object with countryId, provinceId, and cityId.
 */
export async function getLocationHierarchy(
  token: string,
  locationId: string
): Promise<{ countryId: string | null; provinceId: string | null; cityId: string | null }> {
  const client = getHttpClient()

  // Fetch the initial location
  const cityResponse = await client.get<TApiDataResponse<TLocation>>(
    `/platform/locations/${locationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  const city = cityResponse.data.data

  // If it's a city, get its parent (province)
  if (city.locationType === 'city' && city.parentId) {
    const provinceResponse = await client.get<TApiDataResponse<TLocation>>(
      `/platform/locations/${city.parentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    const province = provinceResponse.data.data

    // Get the country (parent of province)
    if (province.parentId) {
      return {
        countryId: province.parentId,
        provinceId: province.id,
        cityId: city.id,
      }
    }
  }

  // If it's a province, get its parent (country)
  if (city.locationType === 'province' && city.parentId) {
    return {
      countryId: city.parentId,
      provinceId: city.id,
      cityId: null,
    }
  }

  // If it's a country
  if (city.locationType === 'country') {
    return {
      countryId: city.id,
      provinceId: null,
      cityId: null,
    }
  }

  return {
    countryId: null,
    provinceId: null,
    cityId: null,
  }
}
