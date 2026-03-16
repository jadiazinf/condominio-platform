'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Check } from 'lucide-react'
import { cn } from '@heroui/theme'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'

interface TUnitItem {
  id: string
  unitNumber: string
  buildingId: string
  floor?: number | null
}

export interface UnitSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedUnitIds: string[]) => void
  units: TUnitItem[]
  buildings: Array<{ id: string; name: string }>
  initialSelectedIds: string[]
}

export function UnitSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  units,
  buildings,
  initialSelectedIds,
}: UnitSelectionModalProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.assignments.unitModal'

  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(initialSelectedIds)
  const [searchQuery, setSearchQuery] = useState('')
  const [buildingFilter, setBuildingFilter] = useState<string>('')

  // Reset local state when modal opens
  const handleOpenChange = useCallback(() => {
    setLocalSelectedIds(initialSelectedIds)
    setSearchQuery('')
    setBuildingFilter('')
  }, [initialSelectedIds])

  // Sort buildings alphabetically
  const sortedBuildings = useMemo(
    () => [...buildings].sort((a, b) => a.name.localeCompare(b.name)),
    [buildings]
  )

  // Building filter items
  const buildingFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t(`${w}.allBuildings`) },
      ...sortedBuildings.map(b => ({ key: b.id, label: b.name })),
    ],
    [sortedBuildings, t]
  )

  // Group and filter units, sorted alphabetically by building name
  const filteredUnitsByBuilding = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const buildingMap = new Map<string, { buildingName: string; units: TUnitItem[] }>()

    for (const unit of units) {
      if (buildingFilter && unit.buildingId !== buildingFilter) continue

      const building = sortedBuildings.find(b => b.id === unit.buildingId)
      const buildingName = building?.name || unit.buildingId

      if (
        q &&
        !unit.unitNumber.toLowerCase().includes(q) &&
        !buildingName.toLowerCase().includes(q)
      )
        continue

      if (!buildingMap.has(unit.buildingId)) {
        buildingMap.set(unit.buildingId, { buildingName, units: [] })
      }
      buildingMap.get(unit.buildingId)!.units.push(unit)
    }

    const grouped: Array<{ buildingId: string; buildingName: string; units: TUnitItem[] }> = []

    buildingMap.forEach((data, buildingId) => {
      grouped.push({ buildingId, ...data })
    })
    grouped.sort((a, b) => a.buildingName.localeCompare(b.buildingName))

    return grouped
  }, [units, sortedBuildings, searchQuery, buildingFilter])

  // Toggle individual unit
  const toggleUnit = useCallback((unitId: string) => {
    setLocalSelectedIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    )
  }, [])

  // Toggle all units in a building
  const toggleBuilding = useCallback(
    (buildingId: string) => {
      const group = filteredUnitsByBuilding.find(g => g.buildingId === buildingId)

      if (!group) return
      const buildingUnitIds = group.units.map(u => u.id)
      const allSelected = buildingUnitIds.every(id => localSelectedIds.includes(id))

      if (allSelected) {
        setLocalSelectedIds(prev => prev.filter(id => !buildingUnitIds.includes(id)))
      } else {
        setLocalSelectedIds(prev => Array.from(new Set([...prev, ...buildingUnitIds])))
      }
    },
    [filteredUnitsByBuilding, localSelectedIds]
  )

  // Toggle all visible units
  const allVisibleIds = useMemo(
    () => filteredUnitsByBuilding.flatMap(g => g.units.map(u => u.id)),
    [filteredUnitsByBuilding]
  )
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every(id => localSelectedIds.includes(id))

  const toggleAll = useCallback(() => {
    if (allVisibleSelected) {
      setLocalSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)))
    } else {
      setLocalSelectedIds(prev => Array.from(new Set([...prev, ...allVisibleIds])))
    }
  }, [allVisibleIds, allVisibleSelected])

  const handleConfirm = useCallback(() => {
    onConfirm(localSelectedIds)
  }, [localSelectedIds, onConfirm])

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="3xl"
      onClose={onClose}
      onOpenChange={open => {
        if (open) handleOpenChange()
      }}
    >
      <ModalContent>
        <ModalHeader>
          <Typography variant="subtitle1">{t(`${w}.title`)}</Typography>
        </ModalHeader>

        <ModalBody>
          {/* Search + Building Filter */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              isClearable
              className="flex-1"
              placeholder={t(`${w}.search`)}
              size="sm"
              startContent={<Search className="text-default-400" size={16} />}
              value={searchQuery}
              variant="bordered"
              onValueChange={setSearchQuery}
            />
            <Select
              className="sm:w-48"
              items={buildingFilterItems}
              placeholder={t(`${w}.buildingFilter`)}
              size="sm"
              value={buildingFilter}
              variant="bordered"
              onChange={key => setBuildingFilter(key ?? '')}
            />
          </div>

          {/* Select All button */}
          {allVisibleIds.length > 0 && (
            <div className="mt-3 border-b border-default-100 pb-3">
              <button
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  allVisibleSelected
                    ? 'border-success bg-success/10 text-success'
                    : 'border-default-300 text-default-600 hover:border-default-400 hover:bg-default-100'
                )}
                type="button"
                onClick={toggleAll}
              >
                {allVisibleSelected && <Check className="mr-1.5 inline" size={14} />}
                {t(`${w}.selectAll`)} ({allVisibleIds.length})
              </button>
            </div>
          )}

          {/* Unit grid grouped by building */}
          <div className="mt-2 flex flex-col gap-4">
            {filteredUnitsByBuilding.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Typography color="muted" variant="body2">
                  {units.length === 0 ? t(`${w}.noUnits`) : t(`${w}.noResults`)}
                </Typography>
              </div>
            ) : (
              filteredUnitsByBuilding.map(group => {
                const buildingUnitIds = group.units.map(u => u.id)
                const allBuildingSelected = buildingUnitIds.every(id =>
                  localSelectedIds.includes(id)
                )
                const selectedCount = buildingUnitIds.filter(id =>
                  localSelectedIds.includes(id)
                ).length

                return (
                  <div key={group.buildingId} className="rounded-lg border border-default-200 p-3">
                    {/* Building header toggle */}
                    <button
                      className={cn(
                        'mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                        allBuildingSelected
                          ? 'bg-success/10 text-success'
                          : 'text-default-700 hover:bg-default-50'
                      )}
                      type="button"
                      onClick={() => toggleBuilding(group.buildingId)}
                    >
                      <span>
                        {allBuildingSelected && <Check className="mr-1.5 inline" size={14} />}
                        {group.buildingName} ({group.units.length})
                      </span>
                      {selectedCount > 0 && !allBuildingSelected && (
                        <span className="text-xs text-default-400">
                          {selectedCount}/{group.units.length}
                        </span>
                      )}
                    </button>

                    {/* Unit buttons grid */}
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {group.units.map(unit => {
                        const isSelected = localSelectedIds.includes(unit.id)

                        return (
                          <button
                            key={unit.id}
                            className={cn(
                              'flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-colors',
                              isSelected
                                ? 'border-success bg-success/10 text-success'
                                : 'border-default-200 text-default-600 hover:border-default-400 hover:bg-default-50'
                            )}
                            type="button"
                            onClick={() => toggleUnit(unit.id)}
                          >
                            <span className={cn('text-sm', isSelected && 'font-semibold')}>
                              {unit.unitNumber}
                            </span>
                            {unit.floor != null && (
                              <span className="text-[10px] text-default-400">
                                {t(`${w}.floor`)} {unit.floor}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ModalBody>

        <ModalFooter className="flex items-center justify-between">
          <Typography color="muted" variant="caption">
            {localSelectedIds.length > 0
              ? t(`${w}.selected`, { count: String(localSelectedIds.length) })
              : ''}
          </Typography>
          <div className="flex gap-2">
            <Button variant="flat" onPress={onClose}>
              {t(`${w}.cancel`)}
            </Button>
            <Button
              color="primary"
              isDisabled={localSelectedIds.length === 0}
              onPress={handleConfirm}
            >
              {t(`${w}.confirm`)} ({localSelectedIds.length})
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
