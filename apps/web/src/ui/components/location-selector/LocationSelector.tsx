'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Tooltip } from '@/ui/components/tooltip'
import { cn } from '@heroui/theme'
import { Info } from 'lucide-react'
import type { TLocation, TLocationType } from '@packages/domain'
import {
  useLocationsByType,
  useLocationsByParent,
  getLocationHierarchy,
} from '@packages/http-client'

import { useAuth } from '@/contexts'

type TInputVariant = 'flat' | 'bordered' | 'underlined' | 'faded'
type TInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
type TInputSize = 'sm' | 'md' | 'lg'

// Location types in hierarchical order
const LOCATION_TYPES: TLocationType[] = ['country', 'province', 'city']

interface ILocationSelectorProps {
  value?: string | null
  onChange?: (locationId: string | null) => void
  label?: string
  tooltip?: string
  countryLabel?: string
  provinceLabel?: string
  cityLabel?: string
  countryPlaceholder?: string
  provincePlaceholder?: string
  cityPlaceholder?: string
  errorMessage?: string
  variant?: TInputVariant
  radius?: TInputRadius
  size?: TInputSize
  isRequired?: boolean
  isDisabled?: boolean
  className?: string
}

interface ILocationLevel {
  type: TLocationType
  label: string
  placeholder: string
  selectedId: string | null
  locations: TLocation[]
  isLoading: boolean
}

export function LocationSelector({
  value,
  onChange,
  label,
  tooltip,
  countryLabel = 'Country',
  provinceLabel = 'State/Province',
  cityLabel = 'City',
  countryPlaceholder = 'Select a country',
  provincePlaceholder = 'Select a state/province',
  cityPlaceholder = 'Select a city',
  errorMessage,
  variant = 'bordered',
  radius = 'sm',
  size = 'md',
  isRequired = false,
  isDisabled = false,
  className,
}: ILocationSelectorProps) {
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  // State for each location level
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null)
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)

  // Track initialization state
  const [isInitializing, setIsInitializing] = useState(false)
  const lastInitializedValueRef = useRef<string | null>(null)

  // Get token
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Fetch countries (root level)
  const { data: countriesData, isLoading: countriesLoading } = useLocationsByType({
    token,
    locationType: 'country',
    enabled: !!token,
  })

  // Fetch provinces based on selected country
  const { data: provincesData, isLoading: provincesLoading } = useLocationsByParent({
    token,
    parentId: selectedCountryId,
    enabled: !!token && !!selectedCountryId,
  })

  // Fetch cities based on selected province
  const { data: citiesData, isLoading: citiesLoading } = useLocationsByParent({
    token,
    parentId: selectedProvinceId,
    enabled: !!token && !!selectedProvinceId,
  })

  const countries = countriesData?.data ?? []
  const provinces = provincesData?.data ?? []
  const cities = citiesData?.data ?? []

  const countryItems: ISelectItem[] = useMemo(
    () => countries.map((country: TLocation) => ({ key: country.id, label: country.name })),
    [countries]
  )

  const provinceItems: ISelectItem[] = useMemo(
    () => provinces.map((province: TLocation) => ({ key: province.id, label: province.name })),
    [provinces]
  )

  const cityItems: ISelectItem[] = useMemo(
    () => cities.map((city: TLocation) => ({ key: city.id, label: city.name })),
    [cities]
  )

  // Only return a location ID when all levels are selected (city is required)
  const getCompleteLocationId = useCallback((): string | null => {
    // Only return the city ID when all three levels are selected
    if (selectedCountryId && selectedProvinceId && selectedCityId) {
      return selectedCityId
    }
    return null
  }, [selectedCountryId, selectedProvinceId, selectedCityId])

  // Notify parent of changes - only when a complete location is selected
  // Skip during initialization to avoid resetting form values
  useEffect(() => {
    if (isInitializing) return
    const locationId = getCompleteLocationId()
    onChange?.(locationId)
  }, [getCompleteLocationId, onChange, isInitializing])

  // Handle country selection
  const handleCountryChange = (key: string | null) => {
    setSelectedCountryId(key)
    setSelectedProvinceId(null)
    setSelectedCityId(null)
  }

  // Handle province selection
  const handleProvinceChange = (key: string | null) => {
    setSelectedProvinceId(key)
    setSelectedCityId(null)
  }

  // Handle city selection
  const handleCityChange = (key: string | null) => {
    setSelectedCityId(key)
  }

  // Initialize from value prop by fetching location hierarchy
  useEffect(() => {
    // Skip if no value, no token, or already initialized this value
    if (!value || !token || lastInitializedValueRef.current === value) {
      return
    }

    const initializeFromValue = async () => {
      setIsInitializing(true)
      try {
        const hierarchy = await getLocationHierarchy(token, value)

        // Set all levels at once
        if (hierarchy.countryId) {
          setSelectedCountryId(hierarchy.countryId)
        }
        if (hierarchy.provinceId) {
          setSelectedProvinceId(hierarchy.provinceId)
        }
        if (hierarchy.cityId) {
          setSelectedCityId(hierarchy.cityId)
        }

        lastInitializedValueRef.current = value
      } catch (error) {
        console.error('Failed to initialize location hierarchy:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeFromValue()
  }, [value, token])

  const labelContent = label ? (
    <span className="flex items-center gap-1.5 text-small text-foreground-500 mb-2">
      {isRequired && <span className="text-danger">*</span>}
      {label}
      {tooltip && (
        <Tooltip
          content={tooltip}
          placement="right"
          showArrow
          classNames={{
            content: 'max-w-xs text-sm',
          }}
        >
          <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
        </Tooltip>
      )}
    </span>
  ) : null

  // Helper to render label with asterisk on the left
  const renderSelectLabel = (labelText: string) => (
    <span className="flex items-center gap-1">
      {isRequired && <span className="text-danger">*</span>}
      {labelText}
    </span>
  )

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {labelContent}

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Country Select */}
        <Select
          aria-label={countryLabel}
          placeholder={countryPlaceholder}
          items={countryItems}
          value={selectedCountryId}
          onChange={handleCountryChange}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || countriesLoading}
          label={renderSelectLabel(countryLabel)}
          labelPlacement="outside"
          isLoading={countriesLoading}
          isInvalid={isRequired && !!errorMessage && !selectedCountryId}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        />

        {/* Province Select */}
        <Select
          aria-label={provinceLabel}
          placeholder={provincePlaceholder}
          items={provinceItems}
          value={selectedProvinceId}
          onChange={handleProvinceChange}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || !selectedCountryId || provincesLoading}
          label={renderSelectLabel(provinceLabel)}
          labelPlacement="outside"
          isLoading={provincesLoading}
          isInvalid={isRequired && !!errorMessage && !!selectedCountryId && !selectedProvinceId}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        />

        {/* City Select */}
        <Select
          aria-label={cityLabel}
          placeholder={cityPlaceholder}
          items={cityItems}
          value={selectedCityId}
          onChange={handleCityChange}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || !selectedProvinceId || citiesLoading}
          label={renderSelectLabel(cityLabel)}
          labelPlacement="outside"
          isLoading={citiesLoading}
          isInvalid={isRequired && !!errorMessage && !!selectedProvinceId && !selectedCityId}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        />
      </div>

      {errorMessage && <p className="text-tiny text-danger mt-1">{errorMessage}</p>}
    </div>
  )
}

export type { ILocationSelectorProps }
