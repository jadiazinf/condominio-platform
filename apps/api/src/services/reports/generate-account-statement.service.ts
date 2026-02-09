import type { TQuota, TPayment } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories/quotas.repository'
import type { PaymentsRepository } from '@database/repositories/payments.repository'
import type { UnitsRepository } from '@database/repositories/units.repository'
import { CsvExporterService, type ICsvColumn } from './csv-exporter.service'
import { PdfExporterService, type IPdfColumn } from './pdf-exporter.service'
import { type TServiceResult, success, failure } from '../base.service'

/**
 * Input parameters for generating an account statement.
 */
export interface IAccountStatementInput {
  unitId: string
  format: 'csv' | 'pdf'
  startDate?: string
  endDate?: string
  generatedBy?: string
}

/**
 * Output of the account statement generation.
 */
export interface IAccountStatementOutput {
  data: string | Buffer
  filename: string
  contentType: string
}

/**
 * Combined row type for the account statement report.
 * Merges quotas and payments into a unified timeline.
 */
interface IStatementRow {
  date: string
  type: string
  description: string
  amount: string
  status: string
  balance: string
}

// CSV column definitions for account statement
const csvColumns: ICsvColumn<IStatementRow>[] = [
  { header: 'Fecha', accessor: row => row.date },
  { header: 'Tipo', accessor: row => row.type },
  { header: 'Descripcion', accessor: row => row.description },
  { header: 'Monto', accessor: row => row.amount },
  { header: 'Estado', accessor: row => row.status },
  { header: 'Saldo', accessor: row => row.balance },
]

// PDF column definitions for account statement
const pdfColumns: IPdfColumn<IStatementRow>[] = [
  { header: 'Fecha', accessor: row => row.date, width: 80 },
  { header: 'Tipo', accessor: row => row.type, width: 60 },
  { header: 'Descripcion', accessor: row => row.description },
  { header: 'Monto', accessor: row => row.amount, width: 80 },
  { header: 'Estado', accessor: row => row.status, width: 70 },
  { header: 'Saldo', accessor: row => row.balance, width: 80 },
]

/**
 * Service that generates account statements for a specific unit.
 * Combines quotas (charges) and payments into a chronological report.
 */
export class GenerateAccountStatementService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly unitsRepo: UnitsRepository,
  ) {}

  async execute(input: IAccountStatementInput): Promise<TServiceResult<IAccountStatementOutput>> {
    // 1. Get unit details
    const unit = await this.unitsRepo.getById(input.unitId)
    if (!unit) {
      return failure('Unit not found', 'NOT_FOUND')
    }

    // 2. Get quotas for unit
    const allQuotas = await this.quotasRepo.getByUnitId(input.unitId)

    // 3. Get payments for unit
    const allPayments = await this.paymentsRepo.getByUnitId(input.unitId)

    // 4. Filter by date range if provided
    const quotas = this.filterQuotasByDate(allQuotas, input.startDate, input.endDate)
    const payments = this.filterPaymentsByDate(allPayments, input.startDate, input.endDate)

    // 5. Build statement rows
    const rows = this.buildStatementRows(quotas, payments)

    // 6. Generate output based on format
    const unitLabel = `Unidad ${unit.unitNumber}`
    const dateRange = this.formatDateRange(input.startDate, input.endDate)
    const subtitle = dateRange ? `${unitLabel} - ${dateRange}` : unitLabel

    if (input.format === 'pdf') {
      return this.generatePdf(rows, subtitle, input.generatedBy, unit.unitNumber)
    }

    return this.generateCsv(rows, unit.unitNumber)
  }

  /**
   * Filters quotas by date range using the issue date.
   */
  private filterQuotasByDate(quotas: TQuota[], startDate?: string, endDate?: string): TQuota[] {
    return quotas.filter(q => {
      if (startDate && q.issueDate < startDate) return false
      if (endDate && q.issueDate > endDate) return false
      return true
    })
  }

  /**
   * Filters payments by date range using the payment date.
   */
  private filterPaymentsByDate(
    payments: TPayment[],
    startDate?: string,
    endDate?: string
  ): TPayment[] {
    return payments.filter(p => {
      if (startDate && p.paymentDate < startDate) return false
      if (endDate && p.paymentDate > endDate) return false
      return true
    })
  }

  /**
   * Builds a chronologically sorted array of statement rows from quotas and payments.
   */
  private buildStatementRows(quotas: TQuota[], payments: TPayment[]): IStatementRow[] {
    const rows: IStatementRow[] = []

    // Add quota rows (charges)
    for (const quota of quotas) {
      rows.push({
        date: quota.issueDate,
        type: 'Cuota',
        description: quota.periodDescription ?? `${quota.periodYear}-${String(quota.periodMonth).padStart(2, '0')}`,
        amount: quota.baseAmount,
        status: this.translateQuotaStatus(quota.status),
        balance: quota.balance,
      })
    }

    // Add payment rows
    for (const payment of payments) {
      rows.push({
        date: payment.paymentDate,
        type: 'Pago',
        description: `Pago #${payment.paymentNumber ?? payment.id.slice(0, 8)}`,
        amount: `-${payment.amount}`,
        status: this.translatePaymentStatus(payment.status),
        balance: '',
      })
    }

    // Sort chronologically
    rows.sort((a, b) => a.date.localeCompare(b.date))

    return rows
  }

  /**
   * Translates quota status to a human-readable Spanish label.
   */
  private translateQuotaStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagada',
      partial: 'Parcial',
      overdue: 'Vencida',
      cancelled: 'Cancelada',
    }
    return statusMap[status] ?? status
  }

  /**
   * Translates payment status to a human-readable Spanish label.
   */
  private translatePaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      completed: 'Completado',
      pending_verification: 'Por verificar',
      rejected: 'Rechazado',
      reversed: 'Revertido',
    }
    return statusMap[status] ?? status
  }

  /**
   * Formats a date range string for display.
   */
  private formatDateRange(startDate?: string, endDate?: string): string {
    if (startDate && endDate) return `${startDate} al ${endDate}`
    if (startDate) return `Desde ${startDate}`
    if (endDate) return `Hasta ${endDate}`
    return ''
  }

  /**
   * Generates the CSV output.
   */
  private generateCsv(
    rows: IStatementRow[],
    unitNumber: string
  ): TServiceResult<IAccountStatementOutput> {
    const csvService = new CsvExporterService()
    const csvResult = csvService.generate(rows, csvColumns)

    if (!csvResult.success) {
      return failure(csvResult.error, csvResult.code)
    }

    return success({
      data: csvResult.data,
      filename: `estado-cuenta-${unitNumber}-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv; charset=utf-8',
    })
  }

  /**
   * Generates the PDF output.
   */
  private async generatePdf(
    rows: IStatementRow[],
    subtitle: string,
    generatedBy?: string,
    unitNumber?: string
  ): Promise<TServiceResult<IAccountStatementOutput>> {
    const pdfService = new PdfExporterService()
    const pdfResult = await pdfService.generate(rows, pdfColumns, {
      title: 'Estado de Cuenta',
      subtitle,
      generatedBy,
      orientation: 'landscape',
    })

    if (!pdfResult.success) {
      return failure(pdfResult.error, pdfResult.code)
    }

    return success({
      data: pdfResult.data,
      filename: `estado-cuenta-${unitNumber ?? 'unit'}-${new Date().toISOString().slice(0, 10)}.pdf`,
      contentType: 'application/pdf',
    })
  }
}
