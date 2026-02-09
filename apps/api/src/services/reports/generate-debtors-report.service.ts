import type { TQuota, TUnit, TBuilding } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories/quotas.repository'
import type { UnitsRepository } from '@database/repositories/units.repository'
import type { BuildingsRepository } from '@database/repositories/buildings.repository'
import { CsvExporterService, type ICsvColumn } from './csv-exporter.service'
import { PdfExporterService, type IPdfColumn } from './pdf-exporter.service'
import { type TServiceResult, success, failure } from '../base.service'

/**
 * Input parameters for generating a debtors report.
 */
export interface IDebtorsReportInput {
  condominiumId: string
  format: 'csv' | 'pdf'
  asOfDate?: string
  generatedBy?: string
}

/**
 * Output of the debtors report generation.
 */
export interface IDebtorsReportOutput {
  data: string | Buffer
  filename: string
  contentType: string
}

/**
 * Row type for the debtors report.
 * Each row represents a unit with overdue quotas.
 */
interface IDebtorRow {
  building: string
  unitNumber: string
  overdueCount: number
  totalDebt: string
  oldestDueDate: string
  newestDueDate: string
}

// CSV column definitions for debtors report
const csvColumns: ICsvColumn<IDebtorRow>[] = [
  { header: 'Edificio', accessor: row => row.building },
  { header: 'Unidad', accessor: row => row.unitNumber },
  { header: 'Cuotas Vencidas', accessor: row => row.overdueCount },
  { header: 'Deuda Total', accessor: row => row.totalDebt },
  { header: 'Vencimiento Mas Antiguo', accessor: row => row.oldestDueDate },
  { header: 'Vencimiento Mas Reciente', accessor: row => row.newestDueDate },
]

// PDF column definitions for debtors report
const pdfColumns: IPdfColumn<IDebtorRow>[] = [
  { header: 'Edificio', accessor: row => row.building, width: 100 },
  { header: 'Unidad', accessor: row => row.unitNumber, width: 70 },
  { header: 'Cuotas Vencidas', accessor: row => String(row.overdueCount), width: 80 },
  { header: 'Deuda Total', accessor: row => row.totalDebt, width: 90 },
  { header: 'Venc. Antiguo', accessor: row => row.oldestDueDate, width: 90 },
  { header: 'Venc. Reciente', accessor: row => row.newestDueDate, width: 90 },
]

/**
 * Service that generates a debtors report for a condominium.
 * Lists all units with overdue quotas, grouped by unit with summary data.
 */
export class GenerateDebtorsReportService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly buildingsRepo: BuildingsRepository,
  ) {}

  async execute(input: IDebtorsReportInput): Promise<TServiceResult<IDebtorsReportOutput>> {
    // 1. Get all buildings for the condominium
    const buildings = await this.buildingsRepo.getByCondominiumId(input.condominiumId)
    if (buildings.length === 0) {
      return failure('No buildings found for this condominium', 'NOT_FOUND')
    }

    // 2. Build lookup maps
    const buildingMap = new Map<string, TBuilding>()
    for (const building of buildings) {
      buildingMap.set(building.id, building)
    }

    // 3. Get all units across all buildings
    const allUnits: TUnit[] = []
    for (const building of buildings) {
      const units = await this.unitsRepo.getByBuildingId(building.id)
      allUnits.push(...units)
    }

    const unitMap = new Map<string, TUnit>()
    for (const unit of allUnits) {
      unitMap.set(unit.id, unit)
    }

    // 4. Get overdue quotas
    const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10)
    const overdueQuotas = await this.quotasRepo.getOverdue(asOfDate)

    // 5. Filter to only quotas belonging to units in this condominium
    const unitIds = new Set(allUnits.map(u => u.id))
    const relevantQuotas = overdueQuotas.filter(q => unitIds.has(q.unitId))

    if (relevantQuotas.length === 0) {
      // Still generate an empty report
      const rows: IDebtorRow[] = []
      return this.generateOutput(rows, input, asOfDate)
    }

    // 6. Group overdue quotas by unit
    const quotasByUnit = new Map<string, TQuota[]>()
    for (const quota of relevantQuotas) {
      const existing = quotasByUnit.get(quota.unitId) ?? []
      existing.push(quota)
      quotasByUnit.set(quota.unitId, existing)
    }

    // 7. Build debtor rows
    const rows: IDebtorRow[] = []
    for (const [unitId, quotas] of quotasByUnit) {
      const unit = unitMap.get(unitId)
      if (!unit) continue

      const building = buildingMap.get(unit.buildingId)

      // Calculate total debt
      const totalDebt = quotas.reduce((sum, q) => sum + parseFloat(q.balance), 0)

      // Find date range
      const dueDates = quotas.map(q => q.dueDate).sort()

      rows.push({
        building: building?.name ?? 'N/A',
        unitNumber: unit.unitNumber,
        overdueCount: quotas.length,
        totalDebt: totalDebt.toFixed(2),
        oldestDueDate: dueDates[0] ?? '',
        newestDueDate: dueDates[dueDates.length - 1] ?? '',
      })
    }

    // Sort by total debt descending
    rows.sort((a, b) => parseFloat(b.totalDebt) - parseFloat(a.totalDebt))

    return this.generateOutput(rows, input, asOfDate)
  }

  /**
   * Generates the output in the requested format.
   */
  private async generateOutput(
    rows: IDebtorRow[],
    input: IDebtorsReportInput,
    asOfDate: string
  ): Promise<TServiceResult<IDebtorsReportOutput>> {
    const dateLabel = new Date().toISOString().slice(0, 10)

    if (input.format === 'pdf') {
      return this.generatePdf(rows, asOfDate, input.generatedBy, dateLabel)
    }

    return this.generateCsv(rows, dateLabel)
  }

  /**
   * Generates the CSV output.
   */
  private generateCsv(
    rows: IDebtorRow[],
    dateLabel: string
  ): TServiceResult<IDebtorsReportOutput> {
    const csvService = new CsvExporterService()
    const csvResult = csvService.generate(rows, csvColumns)

    if (!csvResult.success) {
      return failure(csvResult.error, csvResult.code)
    }

    return success({
      data: csvResult.data,
      filename: `reporte-deudores-${dateLabel}.csv`,
      contentType: 'text/csv; charset=utf-8',
    })
  }

  /**
   * Generates the PDF output.
   */
  private async generatePdf(
    rows: IDebtorRow[],
    asOfDate: string,
    generatedBy?: string,
    dateLabel?: string
  ): Promise<TServiceResult<IDebtorsReportOutput>> {
    const pdfService = new PdfExporterService()
    const pdfResult = await pdfService.generate(rows, pdfColumns, {
      title: 'Reporte de Deudores',
      subtitle: `Cuotas vencidas al ${asOfDate}`,
      generatedBy,
      orientation: 'landscape',
    })

    if (!pdfResult.success) {
      return failure(pdfResult.error, pdfResult.code)
    }

    return success({
      data: pdfResult.data,
      filename: `reporte-deudores-${dateLabel ?? 'report'}.pdf`,
      contentType: 'application/pdf',
    })
  }
}
