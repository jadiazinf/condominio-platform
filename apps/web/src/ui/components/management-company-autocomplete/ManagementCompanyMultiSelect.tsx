'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { Building2 } from 'lucide-react'
import type { TManagementCompany } from '@packages/domain'

import { useAuth, useTranslation } from '@/contexts'
import { AutocompleteMulti, type IAutocompleteMultiItem } from '@/ui/components/autocomplete'
import { useManagementCompaniesPaginated } from '@packages/http-client'

interface IManagementCompanyMultiSelectProps {
  value?: string[]
  onChange?: (companyIds: string[]) => void
  label?: string
  placeholder?: string
  tooltip?: string
  description?: string
  errorMessage?: string
  isRequired?: boolean
  isDisabled?: boolean
  className?: string
}

export function ManagementCompanyMultiSelect({
  value = [],
  onChange,
  label,
  placeholder,
  tooltip,
  description,
  errorMessage,
  isRequired = false,
  isDisabled = false,
  className,
}: IManagementCompanyMultiSelectProps) {
  const { t } = useTranslation()
  const { user: firebaseUser, loading: isAuthLoading } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  // Store selected companies to ensure they're always in the items list
  const selectedCompaniesRef = useRef<Map<string, TManagementCompany>>(new Map())

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
      search: searchInput || undefined,
      limit: 50,
      isActive: true,
    },
    enabled: !!token && !isAuthLoading,
  })

  // Update selected companies ref when data changes and we have selected values
  useMemo(() => {
    if (value.length > 0 && companiesData?.data) {
      value.forEach((id) => {
        const company = companiesData.data.find((c) => c.id === id)
        if (company) {
          selectedCompaniesRef.current.set(company.id, company)
        }
      })
    }
  }, [value, companiesData])

  const items: IAutocompleteMultiItem[] = useMemo(() => {
    const companies = companiesData?.data || []
    const itemsMap = new Map<string, IAutocompleteMultiItem>()

    // Add fetched companies
    companies.forEach((company) => {
      itemsMap.set(company.id, {
        key: company.id,
        label: company.name,
        description: company.email || undefined,
        startContent: <Building2 className="text-default-400" size={16} />,
      })
    })

    // Ensure selected companies are always in the list
    selectedCompaniesRef.current.forEach((company) => {
      if (!itemsMap.has(company.id)) {
        itemsMap.set(company.id, {
          key: company.id,
          label: company.name,
          description: company.email || undefined,
          startContent: <Building2 className="text-default-400" size={16} />,
        })
      }
    })

    return Array.from(itemsMap.values())
  }, [companiesData])

  const handleSelectionChange = useCallback(
    (selectedIds: string[]) => {
      // Update the ref to keep track of selected companies
      const selectedSet = new Set(selectedIds)
      items.forEach((item) => {
        const company = companiesData?.data?.find((c) => c.id === item.key)
        if (company && selectedSet.has(company.id)) {
          selectedCompaniesRef.current.set(company.id, company)
        }
      })
      // Remove deselected
      Array.from(selectedCompaniesRef.current.keys()).forEach((key) => {
        if (!selectedSet.has(key)) {
          selectedCompaniesRef.current.delete(key)
        }
      })

      onChange?.(selectedIds)
    },
    [onChange, items, companiesData]
  )

  const handleInputChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  return (
    <AutocompleteMulti
      aria-label={label || t('common.managementCompanies')}
      className={className}
      description={description}
      emptyContent={t('superadmin.condominiums.form.fields.noCompaniesFound') || 'No se encontraron administradoras'}
      errorMessage={errorMessage}
      isDisabled={isDisabled || isAuthLoading}
      isLoading={isLoadingCompanies}
      isRequired={isRequired}
      items={items}
      label={label}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelectionChange}
      placeholder={placeholder || t('superadmin.condominiums.form.fields.managementCompanyPlaceholder')}
      selectedKeys={value}
      tooltip={tooltip}
    />
  )
}
