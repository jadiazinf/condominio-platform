'use client'

import { useMemo, useState, useCallback, useRef, Key } from 'react'
import { Building2 } from 'lucide-react'
import type { TManagementCompany } from '@packages/domain'

import { useAuth, useTranslation } from '@/contexts'
import { Autocomplete, type IAutocompleteItem } from '@/ui/components/autocomplete'
import { useManagementCompaniesPaginated } from '@packages/http-client'

interface IManagementCompanyAutocompleteProps {
  value?: string | null
  onChange?: (companyId: string | null) => void
  label?: string
  placeholder?: string
  tooltip?: string
  description?: string
  errorMessage?: string
  isRequired?: boolean
  isDisabled?: boolean
  className?: string
}

export function ManagementCompanyAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  tooltip,
  description,
  errorMessage,
  isRequired = false,
  isDisabled = false,
  className,
}: IManagementCompanyAutocompleteProps) {
  const { t } = useTranslation()
  const { user: firebaseUser, loading: isAuthLoading } = useAuth()
  const [searchValue, setSearchValue] = useState('')
  const [token, setToken] = useState<string | null>(null)
  // Store the selected company to ensure it's always in the items list
  const selectedCompanyRef = useRef<TManagementCompany | null>(null)

  // Get token on mount
  useMemo(() => {
    if (firebaseUser && !token) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser, token])

  // Fetch management companies with search filter
  const { data: companiesData, isLoading: isLoadingCompanies } = useManagementCompaniesPaginated({
    token: token || '',
    query: {
      search: searchValue || undefined,
      limit: 20,
      isActive: true,
    },
    enabled: !!token && !isAuthLoading,
  })

  // Update selected company ref when data changes and we have a selected value
  useMemo(() => {
    if (value && companiesData?.data) {
      const company = companiesData.data.find((c) => c.id === value)
      if (company) {
        selectedCompanyRef.current = company
      }
    }
  }, [value, companiesData])

  const items: IAutocompleteItem[] = useMemo(() => {
    const companies = companiesData?.data || []

    // Build items list from fetched companies
    const itemsMap = new Map<string, IAutocompleteItem>()

    // Add fetched companies
    companies.forEach((company) => {
      itemsMap.set(company.id, {
        key: company.id,
        label: company.name,
        description: company.email || undefined,
        startContent: <Building2 className="text-default-400" size={16} />,
      })
    })

    // Ensure selected company is always in the list
    if (selectedCompanyRef.current && !itemsMap.has(selectedCompanyRef.current.id)) {
      itemsMap.set(selectedCompanyRef.current.id, {
        key: selectedCompanyRef.current.id,
        label: selectedCompanyRef.current.name,
        description: selectedCompanyRef.current.email || undefined,
        startContent: <Building2 className="text-default-400" size={16} />,
      })
    }

    return Array.from(itemsMap.values())
  }, [companiesData])

  const handleInputChange = useCallback((inputValue: string) => {
    setSearchValue(inputValue)
  }, [])

  const handleSelectionChange = useCallback(
    (key: Key | null) => {
      // Ensure we pass a valid string or null, never empty string
      const selectedKey = key != null ? String(key) : null

      // If clearing selection, clear the ref too
      if (!selectedKey) {
        selectedCompanyRef.current = null
      }

      onChange?.(selectedKey)
    },
    [onChange]
  )

  // Convert empty string to null for the autocomplete selectedKey
  const selectedValue = value && value.trim() !== '' ? value : null

  return (
    <Autocomplete
      aria-label={label || t('common.managementCompany')}
      className={className}
      description={description}
      emptyContent={t('superadmin.condominiums.form.fields.noCompaniesFound') || 'No se encontraron administradoras'}
      errorMessage={errorMessage}
      isDisabled={isDisabled || isAuthLoading}
      isInvalid={!!errorMessage}
      isLoading={isLoadingCompanies}
      isRequired={isRequired}
      items={items}
      label={label}
      placeholder={placeholder || t('superadmin.condominiums.form.fields.managementCompanyPlaceholder')}
      tooltip={tooltip}
      value={selectedValue}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelectionChange}
    />
  )
}
