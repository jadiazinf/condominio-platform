'use client'

import { useMemo } from 'react'
import { Switch } from '@/ui/components/switch'
import { Checkbox } from '@/ui/components/checkbox'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { useCompanyCondominiumsPaginated } from '@packages/http-client'
import type { IWizardFormData } from '../CreateBankAccountWizard'

interface CondominiumAssignmentStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  managementCompanyId: string
}

export function CondominiumAssignmentStep({
  formData,
  onUpdate,
  managementCompanyId,
}: CondominiumAssignmentStepProps) {
  const { t } = useTranslation()

  const { data: condominiumsData, isLoading } = useCompanyCondominiumsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100 },
    enabled: !!managementCompanyId,
  })

  const condominiums = condominiumsData?.data ?? []

  const handleToggleAll = (checked: boolean) => {
    onUpdate({
      appliesToAllCondominiums: checked,
      condominiumIds: checked ? [] : formData.condominiumIds,
    })
  }

  const handleCondominiumToggle = (condominiumId: string, checked: boolean) => {
    const current = formData.condominiumIds
    if (checked) {
      onUpdate({ condominiumIds: [...current, condominiumId] })
    } else {
      onUpdate({ condominiumIds: current.filter(id => id !== condominiumId) })
    }
  }

  return (
    <div className="space-y-5 py-1">
      <div className="flex items-center justify-between p-4 rounded-lg bg-default-50 border border-default-200">
        <div>
          <Typography variant="body1" className="font-medium">
            {t('admin.company.myCompany.bankAccounts.wizard.applyToAll')}
          </Typography>
        </div>
        <Switch
          color="success"
          isSelected={formData.appliesToAllCondominiums}
          onValueChange={handleToggleAll}
        />
      </div>

      {!formData.appliesToAllCondominiums && (
        <div>
          <Typography variant="body2" className="font-medium mb-3">
            {t('admin.company.myCompany.bankAccounts.wizard.selectCondominiums')}
          </Typography>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : condominiums.length === 0 ? (
            <Typography color="muted" variant="body2">
              {t('admin.company.myCompany.bankAccounts.allCondominiums')}
            </Typography>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {condominiums.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-default-200 hover:bg-default-50 transition-colors"
                >
                  <Checkbox
                    color="success"
                    isSelected={formData.condominiumIds.includes(c.id)}
                    onValueChange={checked => handleCondominiumToggle(c.id, checked)}
                  >
                    {c.name}
                  </Checkbox>
                </div>
              ))}
            </div>
          )}

          {/* Selected chips */}
          {formData.condominiumIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.condominiumIds.map(id => {
                const condo = condominiums.find(c => c.id === id)
                return (
                  <Chip key={id} color="primary" variant="flat" size="sm">
                    {condo?.name ?? id}
                  </Chip>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
