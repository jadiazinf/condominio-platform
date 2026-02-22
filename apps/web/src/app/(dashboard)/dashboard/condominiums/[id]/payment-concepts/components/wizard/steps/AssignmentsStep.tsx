'use client'

import { useState, useMemo, useCallback } from 'react'
import { CurrencyInput } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import { useDisclosure } from '@/ui/components/modal'
import { Plus, Trash2, Users, Check, Building2, Home, Info, Calculator } from 'lucide-react'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { useTranslation } from '@/contexts'
import { useCondominiumBuildingsList, useCondominiumUnits } from '@packages/http-client'
import type { IWizardFormData, IWizardAssignment } from '../CreatePaymentConceptWizard'
import { UnitSelectionModal } from './UnitSelectionModal'
import { CurrencyCalculatorModal } from './CurrencyCalculatorModal'

export interface AssignmentsStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  buildings: Array<{ id: string; name: string }>
  showErrors: boolean
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  condominiumId: string
  managementCompanyId: string
}

export function AssignmentsStep({
  formData,
  onUpdate,
  buildings: propBuildings,
  showErrors,
  currencies,
  condominiumId,
  managementCompanyId,
}: AssignmentsStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.assignments'

  const [editScope, setEditScope] = useState<'condominium' | 'building' | 'unit'>('condominium')
  const [editBuildingIds, setEditBuildingIds] = useState<string[]>([])
  const [editMethod, setEditMethod] = useState<'by_aliquot' | 'equal_split' | 'fixed_per_unit'>('fixed_per_unit')
  const [editAmount, setEditAmount] = useState<string>('')
  const [editUnitIds, setEditUnitIds] = useState<string[]>([])

  const unitModal = useDisclosure()
  const calculatorModal = useDisclosure()

  // Client-side data fetching (always fetch both, with MC header for MC admins)
  const { data: buildingsResponse, isLoading: loadingBuildings } = useCondominiumBuildingsList({
    condominiumId,
    managementCompanyId,
    enabled: !!condominiumId,
  })
  const { data: unitsResponse, isLoading: loadingUnits } = useCondominiumUnits({
    condominiumId,
    managementCompanyId,
    enabled: !!condominiumId,
  })

  const buildings = useMemo(() => {
    const fetched = buildingsResponse?.data
    const list = (fetched && fetched.length > 0 ? fetched : propBuildings).map(b => ({ id: b.id, name: b.name }))
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [buildingsResponse, propBuildings])

  const units = useMemo(() => unitsResponse?.data ?? [], [unitsResponse])

  // Currency symbol for amount label
  const currencySymbol = useMemo(() => {
    if (!formData.currencyId) return ''
    const cur = currencies.find(c => c.id === formData.currencyId)
    return cur?.symbol || cur?.code || ''
  }, [formData.currencyId, currencies])

  const scopeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'condominium', label: t(`${w}.scopeCondominium`) },
      { key: 'building', label: t(`${w}.scopeBuilding`) },
      { key: 'unit', label: t(`${w}.scopeUnit`) },
    ],
    [t]
  )

  const methodItems: ISelectItem[] = useMemo(
    () => [
      { key: 'by_aliquot', label: t(`${w}.methodAliquot`) },
      { key: 'equal_split', label: t(`${w}.methodEqualSplit`) },
      { key: 'fixed_per_unit', label: t(`${w}.methodFixed`) },
    ],
    [t]
  )

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      by_aliquot: t(`${w}.methodAliquot`),
      equal_split: t(`${w}.methodEqualSplit`),
      fixed_per_unit: t(`${w}.methodFixed`),
    }
    return labels[method] || method
  }

  const getScopeLabel = (assignment: IWizardAssignment) => {
    if (assignment.scopeType === 'unit') {
      const count = assignment.unitIds?.length ?? 0
      return t(`${w}.unitsSelected`, { count: String(count) })
    }
    if (assignment.scopeType === 'building') {
      const building = buildings.find(b => b.id === assignment.buildingId)
      return building?.name || t(`${w}.scopeBuilding`)
    }
    return t(`${w}.scopeCondominium`)
  }

  const formatAmount = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`

  const getAssignmentDescription = (assignment: IWizardAssignment) => {
    const amount = formatAmount(assignment.amount)
    const key = `${w}.assignmentDescription_${assignment.scopeType}_${assignment.distributionMethod}`

    if (assignment.scopeType === 'building') {
      const building = buildings.find(b => b.id === assignment.buildingId)
      return t(key, { amount, target: building?.name || '' })
    }
    if (assignment.scopeType === 'unit') {
      return t(`${w}.assignmentDescription_unit_fixed_per_unit`, {
        amount,
        count: String(assignment.unitIds?.length ?? 0),
      })
    }
    return t(key, { amount })
  }

  const getScopeIcon = (scopeType: string) => {
    if (scopeType === 'building') return <Building2 size={18} className="shrink-0 text-primary" />
    if (scopeType === 'unit') return <Users size={18} className="shrink-0 text-warning" />
    return <Home size={18} className="shrink-0 text-success" />
  }

  const getScopeColor = (scopeType: string): 'success' | 'primary' | 'warning' => {
    if (scopeType === 'building') return 'primary'
    if (scopeType === 'unit') return 'warning'
    return 'success'
  }

  const handleScopeChange = (scope: 'condominium' | 'building' | 'unit') => {
    setEditScope(scope)
    setEditUnitIds([])
    setEditBuildingIds([])
    if (scope === 'unit') {
      setEditMethod('fixed_per_unit')
    }
  }

  // Toggle a building in the multi-select
  const toggleBuilding = useCallback((buildingId: string) => {
    setEditBuildingIds(prev =>
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    )
  }, [])

  // Toggle all buildings
  const allBuildingsSelected = buildings.length > 0 && editBuildingIds.length === buildings.length
  const toggleAllBuildings = useCallback(() => {
    if (allBuildingsSelected) {
      setEditBuildingIds([])
    } else {
      setEditBuildingIds(buildings.map(b => b.id))
    }
  }, [buildings, allBuildingsSelected])

  const handleAddAssignment = () => {
    const amount = Number(editAmount)
    if (!amount || amount <= 0) return
    if (editScope === 'building' && editBuildingIds.length === 0) return
    if (editScope === 'unit' && editUnitIds.length === 0) return

    if (editScope === 'building') {
      // Create one assignment per selected building
      const newAssignments: IWizardAssignment[] = editBuildingIds.map(buildingId => ({
        scopeType: 'building' as const,
        buildingId,
        distributionMethod: editMethod,
        amount,
      }))
      onUpdate({ assignments: [...formData.assignments, ...newAssignments] })
    } else {
      const newAssignment: IWizardAssignment = {
        scopeType: editScope,
        unitIds: editScope === 'unit' ? [...editUnitIds] : undefined,
        distributionMethod: editScope === 'unit' ? 'fixed_per_unit' : editMethod,
        amount,
      }
      onUpdate({ assignments: [...formData.assignments, newAssignment] })
    }

    setEditAmount('')
    setEditUnitIds([])
    setEditBuildingIds([])
  }

  const handleRemoveAssignment = (index: number) => {
    const updated = formData.assignments.filter((_, i) => i !== index)
    onUpdate({ assignments: updated })
  }

  const isDataLoading = loadingBuildings || loadingUnits

  return (
    <div className="flex flex-col gap-5">
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      {/* Add assignment form */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <Typography variant="body2" className="font-semibold">
          {t(`${w}.addAssignment`)}
        </Typography>

        {isDataLoading && (
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label={t(`${w}.scope`)}
            placeholder={t(`${w}.scopePlaceholder`)}
            tooltip={t(`${w}.tooltips.scope`)}
            items={scopeItems}
            value={editScope}
            onChange={(key) => key && handleScopeChange(key as 'condominium' | 'building' | 'unit')}
            variant="bordered"
          />
        </div>

        {/* Building multi-select button grid */}
        {editScope === 'building' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Typography variant="caption" color="muted">
                {t(`${w}.tooltips.building`)}
              </Typography>
            </div>

            {loadingBuildings ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : buildings.length === 0 ? (
              <Typography variant="body2" color="muted">
                {t(`${w}.noUnits`)}
              </Typography>
            ) : (
              <>
                {/* Select All toggle */}
                <div className="border-b border-default-100 pb-3">
                  <button
                    type="button"
                    onClick={toggleAllBuildings}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      allBuildingsSelected
                        ? 'border-success bg-success/10 text-success'
                        : 'border-default-300 text-default-600 hover:border-default-400 hover:bg-default-100'
                    )}
                  >
                    {allBuildingsSelected && <Check size={14} className="mr-1.5 inline" />}
                    {t(`${w}.selectAllBuildings`)} ({buildings.length})
                  </button>
                </div>

                {/* Building buttons grid */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {buildings.map(building => {
                    const isSelected = editBuildingIds.includes(building.id)
                    return (
                      <button
                        key={building.id}
                        type="button"
                        onClick={() => toggleBuilding(building.id)}
                        className={cn(
                          'flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          isSelected
                            ? 'border-success bg-success/10 font-semibold text-success'
                            : 'border-default-200 text-default-600 hover:border-default-400 hover:bg-default-50'
                        )}
                      >
                        {isSelected && <Check size={14} className="mr-1.5 shrink-0" />}
                        <span className="truncate">{building.name}</span>
                      </button>
                    )
                  })}
                </div>

                {editBuildingIds.length > 0 && (
                  <Typography variant="caption" color="muted">
                    {t(`${w}.buildingsSelected`, { count: String(editBuildingIds.length) })}
                  </Typography>
                )}
              </>
            )}

            {showErrors && editScope === 'building' && editBuildingIds.length === 0 && (
              <Typography variant="caption" color="danger">
                {t(`${w}.errors.buildingRequired`)}
              </Typography>
            )}
          </div>
        )}

        {/* Unit selection via modal */}
        {editScope === 'unit' && (
          <div className="flex flex-col gap-2">
            <Button
              variant="bordered"
              startContent={<Users size={16} />}
              onPress={unitModal.onOpen}
              className="w-full justify-start"
              isLoading={loadingUnits}
            >
              {editUnitIds.length > 0
                ? t(`${w}.unitsSelected`, { count: String(editUnitIds.length) })
                : t(`${w}.selectUnitsButton`)}
            </Button>

            {showErrors && editScope === 'unit' && editUnitIds.length === 0 && (
              <Typography variant="caption" color="danger">
                {t(`${w}.errors.unitsRequired`)}
              </Typography>
            )}

            <UnitSelectionModal
              isOpen={unitModal.isOpen}
              onClose={unitModal.onClose}
              onConfirm={(ids) => { setEditUnitIds(ids); unitModal.onClose() }}
              units={units}
              buildings={buildings}
              initialSelectedIds={editUnitIds}
            />
          </div>
        )}

        {/* Distribution method — hidden for unit scope */}
        {editScope !== 'unit' && (
          <>
            <Select
              label={t(`${w}.distributionMethod`)}
              placeholder={t(`${w}.distributionMethodPlaceholder`)}
              tooltip={t(`${w}.tooltips.distributionMethod`)}
              items={methodItems}
              value={editMethod}
              onChange={(key) => key && setEditMethod(key as 'by_aliquot' | 'equal_split' | 'fixed_per_unit')}
              variant="bordered"
            />

            <Typography variant="caption" color="muted">
              {editMethod === 'by_aliquot' && t(`${w}.methodAliquotHint`)}
              {editMethod === 'equal_split' && t(`${w}.methodEqualSplitHint`)}
              {editMethod === 'fixed_per_unit' && t(`${w}.methodFixedHint`)}
            </Typography>
          </>
        )}

        <div className="flex items-end gap-4">
          <div className="flex flex-1 items-end gap-2">
            <CurrencyInput
              label={t(`${w}.amount`)}
              placeholder={t(`${w}.amountPlaceholder`)}
              tooltip={t(`${w}.tooltips.amount`)}
              value={editAmount}
              onValueChange={setEditAmount}
              currencySymbol={currencySymbol ? <span className="text-default-400 text-sm">{currencySymbol}</span> : undefined}
              showCurrencySymbol={!!currencySymbol}
              className="flex-1"
              variant="bordered"
              isInvalid={showErrors && formData.assignments.length === 0 && (!editAmount || Number(editAmount) <= 0)}
              errorMessage={showErrors && formData.assignments.length === 0 && (!editAmount || Number(editAmount) <= 0) ? t(`${w}.errors.amountRequired`) : undefined}
            />
            <Tooltip content={t(`${w}.calculatorTooltip`)}>
              <Button
                isIconOnly
                variant="flat"
                color="secondary"
                onPress={calculatorModal.onOpen}
                className="mb-0.5"
              >
                <Calculator size={18} />
              </Button>
            </Tooltip>
          </div>
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus size={16} />}
            onPress={handleAddAssignment}
            isDisabled={
              !editAmount || Number(editAmount) <= 0 ||
              (editScope === 'building' && editBuildingIds.length === 0) ||
              (editScope === 'unit' && editUnitIds.length === 0)
            }
          >
            {t(`${w}.add`)}
          </Button>
        </div>

        <CurrencyCalculatorModal
          isOpen={calculatorModal.isOpen}
          onClose={calculatorModal.onClose}
          onConfirm={(amount) => { setEditAmount(amount); calculatorModal.onClose() }}
          targetCurrencyId={formData.currencyId}
          currencies={currencies}
        />
      </div>

      {/* Configured assignments list */}
      {formData.assignments.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Typography variant="body2" className="font-semibold">
              {t(`${w}.currentAssignments`)} ({formData.assignments.length})
            </Typography>
            <Tooltip
              content={t(`${w}.currentAssignmentsTooltip`)}
              placement="right"
              showArrow
              classNames={{ content: 'max-w-sm text-sm' }}
            >
              <Info className="h-4 w-4 cursor-help text-default-400" />
            </Tooltip>
          </div>

          <div className="flex flex-col gap-2">
            {formData.assignments.map((assignment, index) => (
              <div
                key={index}
                className="group flex items-start gap-3 rounded-lg border border-default-200 p-3 transition-colors hover:border-default-300"
              >
                {/* Scope icon */}
                <div className="mt-0.5">
                  {getScopeIcon(assignment.scopeType)}
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* Header: scope + method chips + amount */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip color={getScopeColor(assignment.scopeType)} variant="flat" size="sm">
                      {getScopeLabel(assignment)}
                    </Chip>
                    <Chip variant="flat" size="sm" className="bg-default-100 text-default-600">
                      {getMethodLabel(assignment.distributionMethod)}
                    </Chip>
                    <span className="ml-auto text-sm font-bold text-foreground">
                      {formatAmount(assignment.amount)}
                    </span>
                  </div>

                  {/* Human-readable description */}
                  <Typography variant="caption" color="muted">
                    {getAssignmentDescription(assignment)}
                  </Typography>
                </div>

                {/* Delete button */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onPress={() => handleRemoveAssignment(index)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showErrors && formData.assignments.length === 0 && (
        <Typography variant="caption" color="danger">
          {t(`${w}.required`)}
        </Typography>
      )}
    </div>
  )
}
