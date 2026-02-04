'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { Select, SelectItem } from '@heroui/select'
import { Chip } from '@heroui/chip'
import { Tooltip } from '@heroui/tooltip'
import { Building2, Info } from 'lucide-react'
import type { TManagementCompany } from '@packages/domain'

import { useAuth, useTranslation } from '@/contexts'
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
  // Store selected companies to ensure they're always in the items list
  const selectedCompaniesRef = useRef<Map<string, TManagementCompany>>(new Map())

  // Get token on mount
  useMemo(() => {
    if (firebaseUser && !token) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser, token])

  // Fetch management companies
  const { data: companiesData, isLoading: isLoadingCompanies } = useManagementCompaniesPaginated({
    token: token || '',
    query: {
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

  const items = useMemo(() => {
    const companies = companiesData?.data || []

    // Build items list from fetched companies
    const itemsMap = new Map<string, TManagementCompany>()

    // Add fetched companies
    companies.forEach((company) => {
      itemsMap.set(company.id, company)
    })

    // Ensure selected companies are always in the list
    selectedCompaniesRef.current.forEach((company) => {
      if (!itemsMap.has(company.id)) {
        itemsMap.set(company.id, company)
      }
    })

    return Array.from(itemsMap.values())
  }, [companiesData])

  const handleSelectionChange = useCallback(
    (keys: 'all' | Set<React.Key>) => {
      if (keys === 'all') return

      const selectedIds = Array.from(keys) as string[]

      // Update the ref to keep track of selected companies
      items.forEach((company) => {
        if (selectedIds.includes(company.id)) {
          selectedCompaniesRef.current.set(company.id, company)
        } else {
          selectedCompaniesRef.current.delete(company.id)
        }
      })

      onChange?.(selectedIds)
    },
    [onChange, items]
  )

  // Build label with required indicator and tooltip
  const labelContent = label ? (
    <span className="flex items-center gap-1.5">
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
  ) : undefined

  // Custom render for selected items (chips)
  const renderValue = (selectedItems: any) => {
    return (
      <div className="flex flex-wrap gap-1">
        {selectedItems.map((item: any) => (
          <Chip key={item.key} size="sm" variant="flat" color="primary">
            {item.textValue}
          </Chip>
        ))}
      </div>
    )
  }

  return (
    <Select
      aria-label={label || t('common.managementCompanies')}
      className={className}
      classNames={{
        trigger: 'min-h-12',
      }}
      description={tooltip ? undefined : description}
      errorMessage={errorMessage}
      isDisabled={isDisabled || isAuthLoading}
      isInvalid={!!errorMessage}
      isLoading={isLoadingCompanies}
      isRequired={false}
      items={items}
      label={labelContent}
      labelPlacement="outside"
      placeholder={placeholder || t('superadmin.condominiums.form.fields.managementCompanyPlaceholder')}
      radius="sm"
      renderValue={renderValue}
      selectedKeys={new Set(value)}
      selectionMode="multiple"
      variant="bordered"
      onSelectionChange={handleSelectionChange}
    >
      {(company) => (
        <SelectItem
          key={company.id}
          startContent={<Building2 className="text-default-400" size={16} />}
          textValue={company.name}
        >
          <div className="flex flex-col">
            <span className="text-sm">{company.name}</span>
            {company.email && (
              <span className="text-xs text-default-400">{company.email}</span>
            )}
          </div>
        </SelectItem>
      )}
    </Select>
  )
}
