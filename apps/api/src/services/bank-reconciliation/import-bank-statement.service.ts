import Papa from 'papaparse'
import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type {
  BankStatementImportsRepository,
  BankStatementEntriesRepository,
} from '@database/repositories'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IColumnMapping {
  transactionDate: string
  reference: string
  description: string
  amount: string
  entryType?: string
  valueDate?: string
  balance?: string
}

export interface IImportBankStatementInput {
  bankAccountId: string
  importedBy: string
  filename: string
  csvContent: string
  columnMapping: IColumnMapping
}

export interface IImportBankStatementResult {
  importId: string
  totalEntries: number
  totalCredits: string
  totalDebits: string
  skippedRows: number
  periodFrom: string
  periodTo: string
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ImportBankStatementService {
  constructor(
    private readonly importsRepo: BankStatementImportsRepository,
    private readonly entriesRepo: BankStatementEntriesRepository
  ) {}

  async execute(
    input: IImportBankStatementInput
  ): Promise<TServiceResult<IImportBankStatementResult>> {
    const { bankAccountId, importedBy, filename, csvContent, columnMapping } = input

    // Parse CSV
    if (!csvContent || csvContent.trim().length === 0) {
      return failure('El archivo CSV está vacío', 'BAD_REQUEST')
    }

    const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // auto-detect
    })

    if (!parsed.data || parsed.data.length === 0) {
      return failure('El archivo CSV no contiene filas de datos', 'BAD_REQUEST')
    }

    // Validate required columns exist
    const headers = parsed.meta.fields ?? []
    const requiredColumns = [columnMapping.transactionDate, columnMapping.amount]
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    if (missingColumns.length > 0) {
      return failure(
        `Columnas requeridas no encontradas: ${missingColumns.join(', ')}`,
        'BAD_REQUEST'
      )
    }

    // Process rows
    const entries: Array<{
      transactionDate: string
      valueDate: string | null
      reference: string | null
      description: string | null
      amount: string
      entryType: 'credit' | 'debit'
      rawData: Record<string, string>
    }> = []

    let totalCredits = 0
    let totalDebits = 0
    let skippedRows = 0
    let minDate = ''
    let maxDate = ''

    for (const row of parsed.data) {
      const rawAmount = row[columnMapping.amount]
      const parsedAmount = parseFloat(rawAmount?.replace(/[,\s]/g, '') ?? '')

      if (isNaN(parsedAmount)) {
        skippedRows++
        continue
      }

      const dateStr = row[columnMapping.transactionDate]
      if (!dateStr) {
        skippedRows++
        continue
      }

      // Normalize date to YYYY-MM-DD
      const normalizedDate = this.normalizeDate(dateStr)
      if (!normalizedDate) {
        skippedRows++
        continue
      }

      // Determine entry type
      let entryType: 'credit' | 'debit'
      const absoluteAmount = Math.abs(parsedAmount)

      if (columnMapping.entryType) {
        const rawType = row[columnMapping.entryType]
        const typeVal = (rawType ?? '').toLowerCase().trim()
        entryType =
          typeVal === 'debit' || typeVal === 'debito' || typeVal === 'débito' ? 'debit' : 'credit'
      } else {
        // Auto-detect from sign
        entryType = parsedAmount < 0 ? 'debit' : 'credit'
      }

      if (entryType === 'credit') {
        totalCredits += absoluteAmount
      } else {
        totalDebits += absoluteAmount
      }

      // Track date range
      if (!minDate || normalizedDate < minDate) minDate = normalizedDate
      if (!maxDate || normalizedDate > maxDate) maxDate = normalizedDate

      entries.push({
        transactionDate: normalizedDate,
        valueDate: columnMapping.valueDate
          ? (this.normalizeDate(row[columnMapping.valueDate] ?? '') ?? null)
          : null,
        reference: row[columnMapping.reference] || null,
        description: row[columnMapping.description] || null,
        amount: absoluteAmount.toFixed(2),
        entryType,
        rawData: row,
      })
    }

    if (entries.length === 0) {
      return failure('No se encontraron filas válidas en el CSV', 'BAD_REQUEST')
    }

    // Create import record
    const importRecord = await this.importsRepo.create({
      bankAccountId,
      importedBy,
      filename,
      periodFrom: new Date(minDate),
      periodTo: new Date(maxDate),
      metadata: null,
    })

    // Batch insert entries
    const entryDtos = entries.map(e => ({
      importId: importRecord.id,
      transactionDate: new Date(e.transactionDate),
      valueDate: e.valueDate ? new Date(e.valueDate) : null,
      reference: e.reference,
      description: e.description,
      amount: e.amount,
      entryType: e.entryType as 'credit' | 'debit',
      balance: null,
      rawData: e.rawData as Record<string, unknown>,
      metadata: null,
    }))

    await this.entriesRepo.createBulk(entryDtos)

    // Update import with totals
    await this.importsRepo.update(importRecord.id, {
      status: 'completed',
      totalEntries: entries.length,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
    })

    return success({
      importId: importRecord.id,
      totalEntries: entries.length,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      skippedRows,
      periodFrom: minDate,
      periodTo: maxDate,
    })
  }

  private normalizeDate(dateStr: string): string | null {
    if (!dateStr) return null
    const trimmed = dateStr.trim()

    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`

    // Try parsing as Date
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }

    return null
  }
}
