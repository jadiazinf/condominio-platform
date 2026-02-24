import type { TPaymentConceptAssignment } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TUnitInfo = {
  id: string
  buildingId: string
  unitNumber: string
  aliquotPercentage: string | null
  isActive: boolean
}

export type TUnitChargeResult = {
  unitId: string
  unitNumber: string
  buildingId: string
  aliquotPercentage: number | null
  baseAmount: number
}

export type TPeriodDetail = {
  year: number
  month: number
  amount: number
}

export type TElapsedPeriodsResult = {
  periodsCount: number
  accumulatedAmount: number
  periods: TPeriodDetail[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Distribution calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates per-unit charges from concept assignments.
 * Handles override hierarchy: condominium → building → unit.
 * Same algorithm as GenerateChargesService but pure (no DB, no side effects).
 */
export function calculateUnitCharges(
  assignments: TPaymentConceptAssignment[],
  allUnits: TUnitInfo[],
  unitsByBuilding: Map<string, TUnitInfo[]>
): TUnitChargeResult[] {
  const unitAmountMap = new Map<string, number>()
  const activeUnits = allUnits.filter(u => u.isActive)

  // 1. Condominium-wide (base layer)
  const condoAssignments = assignments.filter(a => a.scopeType === 'condominium' && a.isActive)
  for (const assignment of condoAssignments) {
    const amounts = calculateDistribution(assignment, activeUnits)
    for (const [unitId, amount] of amounts) {
      unitAmountMap.set(unitId, amount)
    }
  }

  // 2. Building-wide (overrides condominium for those units)
  const buildingAssignments = assignments.filter(a => a.scopeType === 'building' && a.isActive)
  for (const assignment of buildingAssignments) {
    if (!assignment.buildingId) continue
    const buildingUnits = (unitsByBuilding.get(assignment.buildingId) ?? []).filter(u => u.isActive)
    const amounts = calculateDistribution(assignment, buildingUnits)
    for (const [unitId, amount] of amounts) {
      unitAmountMap.set(unitId, amount)
    }
  }

  // 3. Unit-specific (final override)
  const unitAssignments = assignments.filter(a => a.scopeType === 'unit' && a.isActive)
  for (const assignment of unitAssignments) {
    if (!assignment.unitId) continue
    unitAmountMap.set(assignment.unitId, Number(assignment.amount))
  }

  // Build result array
  return Array.from(unitAmountMap.entries()).map(([unitId, baseAmount]) => {
    const unit = allUnits.find(u => u.id === unitId)
    return {
      unitId,
      unitNumber: unit?.unitNumber ?? '',
      buildingId: unit?.buildingId ?? '',
      aliquotPercentage: unit?.aliquotPercentage ? Number(unit.aliquotPercentage) : null,
      baseAmount,
    }
  })
}

/**
 * Distributes an assignment amount among units based on distribution method.
 * Same logic as GenerateChargesService.calculateDistribution.
 */
function calculateDistribution(
  assignment: TPaymentConceptAssignment,
  units: TUnitInfo[]
): Map<string, number> {
  const result = new Map<string, number>()
  if (units.length === 0) return result

  const total = Number(assignment.amount)

  switch (assignment.distributionMethod) {
    case 'by_aliquot': {
      const unitsWithAliquot = units.filter(
        u => u.aliquotPercentage != null && Number(u.aliquotPercentage) > 0
      )
      if (unitsWithAliquot.length === 0) return result

      const totalAliquot = unitsWithAliquot.reduce(
        (sum, u) => sum + Number(u.aliquotPercentage!),
        0
      )

      let distributed = 0
      for (let i = 0; i < unitsWithAliquot.length; i++) {
        const unit = unitsWithAliquot[i]!
        const proportion = Number(unit.aliquotPercentage!) / totalAliquot

        if (i === unitsWithAliquot.length - 1) {
          result.set(unit.id, roundCurrency(total - distributed))
        } else {
          const amount = roundCurrency(total * proportion)
          result.set(unit.id, amount)
          distributed += amount
        }
      }
      break
    }

    case 'equal_split': {
      let distributed = 0
      const perUnit = total / units.length

      for (let i = 0; i < units.length; i++) {
        const unit = units[i]!
        if (i === units.length - 1) {
          result.set(unit.id, roundCurrency(total - distributed))
        } else {
          const amount = roundCurrency(perUnit)
          result.set(unit.id, amount)
          distributed += amount
        }
      }
      break
    }

    case 'fixed_per_unit': {
      for (const unit of units) {
        result.set(unit.id, total)
      }
      break
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Period calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates how many charge periods have elapsed since concept creation.
 * Returns each period with its year/month and the accumulated total.
 */
export function calculateElapsedPeriods(
  conceptCreatedAt: Date,
  issueDay: number,
  recurrencePeriod: 'monthly' | 'quarterly' | 'yearly' | null,
  baseAmount: number,
  currentDate: Date = new Date()
): TElapsedPeriodsResult {
  if (!recurrencePeriod) {
    return { periodsCount: 1, accumulatedAmount: baseAmount, periods: [] }
  }

  let startYear = conceptCreatedAt.getFullYear()
  let startMonth = conceptCreatedAt.getMonth() + 1 // 1-indexed

  // If concept was created after the issue day, first period is next cycle
  if (conceptCreatedAt.getDate() > issueDay) {
    startMonth += 1
    if (startMonth > 12) {
      startMonth = 1
      startYear += 1
    }
  }

  const step = recurrencePeriod === 'monthly' ? 1 : recurrencePeriod === 'quarterly' ? 3 : 12

  const periods: TPeriodDetail[] = []
  let year = startYear
  let month = startMonth

  while (true) {
    const issueDate = new Date(year, month - 1, issueDay)
    if (issueDate > currentDate) break

    periods.push({ year, month, amount: baseAmount })

    month += step
    while (month > 12) {
      month -= 12
      year += 1
    }
  }

  return {
    periodsCount: periods.length,
    accumulatedAmount: roundCurrency(baseAmount * periods.length),
    periods,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}
