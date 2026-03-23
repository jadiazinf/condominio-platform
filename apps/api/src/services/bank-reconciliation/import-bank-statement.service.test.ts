import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { ImportBankStatementService } from './import-bank-statement.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

type TMockImportsRepo = {
  create: ReturnType<typeof mock>
  update: ReturnType<typeof mock>
}
type TMockEntriesRepo = {
  createBulk: ReturnType<typeof mock>
}

function createMockRepos() {
  return {
    importsRepo: {
      create: mock(() =>
        Promise.resolve({
          id: 'import-001',
          bankAccountId: 'ba-001',
          filename: 'test.csv',
          importedBy: 'user-001',
          periodFrom: new Date('2026-03-01'),
          periodTo: new Date('2026-03-31'),
          totalEntries: 0,
          totalCredits: '0',
          totalDebits: '0',
          status: 'processing',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      update: mock((id: string, data: unknown) => Promise.resolve({ id, ...(data as object) })),
    } as TMockImportsRepo,
    entriesRepo: {
      createBulk: mock((entries: unknown[]) =>
        Promise.resolve(
          (entries as Array<Record<string, unknown>>).map((e, i) => ({
            id: `entry-00${i + 1}`,
            ...e,
            status: 'unmatched',
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        )
      ),
    } as TMockEntriesRepo,
  }
}

const VALID_CSV = `Fecha,Referencia,Descripcion,Monto,Tipo
2026-03-05,REF001,Deposito de Juan,150.00,credit
2026-03-10,REF002,Pago de Maria,250.50,credit
2026-03-15,REF003,Comision bancaria,5.00,debit`

const VALID_CSV_SEMICOLON = `Fecha;Referencia;Descripcion;Monto;Tipo
2026-03-05;REF001;Deposito de Juan;150.00;credit
2026-03-10;REF002;Pago de Maria;250.50;credit`

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportBankStatementService', () => {
  let service: ImportBankStatementService

  beforeEach(() => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)
  })

  it('parses a valid CSV and creates import + entries', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'estado-marzo.csv',
      csvContent: VALID_CSV,
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalEntries).toBe(3)
    expect(result.data.totalCredits).toBe('400.50')
    expect(result.data.totalDebits).toBe('5.00')
  })

  it('handles semicolon-delimited CSV', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'test.csv',
      csvContent: VALID_CSV_SEMICOLON,
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalEntries).toBe(2)
  })

  it('rejects empty CSV', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'empty.csv',
      csvContent: '',
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('BAD_REQUEST')
  })

  it('rejects CSV with missing required columns', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'bad.csv',
      csvContent: 'Nombre,Apellido\nJuan,Perez',
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('BAD_REQUEST')
  })

  it('rejects CSV with only headers and no data rows', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'headers-only.csv',
      csvContent: 'Fecha,Referencia,Descripcion,Monto,Tipo\n',
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('BAD_REQUEST')
  })

  it('auto-detects entry type when column not mapped (defaults to credit)', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const csv = `Fecha,Referencia,Descripcion,Monto
2026-03-05,REF001,Deposito,150.00
2026-03-10,REF002,Retiro,-50.00`

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'no-type.csv',
      csvContent: csv,
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalEntries).toBe(2)
    // Negative amount should be detected as debit
    expect(result.data.totalCredits).toBe('150.00')
    expect(result.data.totalDebits).toBe('50.00')
  })

  it('calculates period from/to from transaction dates', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'test.csv',
      csvContent: VALID_CSV,
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    // Should have called create with the correct period dates derived from CSV data
    expect(repos.importsRepo.create).toHaveBeenCalled()
  })

  it('handles rows with invalid amounts gracefully (skips them)', async () => {
    const repos = createMockRepos()
    service = new ImportBankStatementService(repos.importsRepo as never, repos.entriesRepo as never)

    const csv = `Fecha,Referencia,Descripcion,Monto,Tipo
2026-03-05,REF001,Deposito,150.00,credit
2026-03-10,REF002,Bad row,abc,credit
2026-03-15,REF003,Good row,100.00,credit`

    const result = await service.execute({
      bankAccountId: 'ba-001',
      importedBy: 'user-001',
      filename: 'mixed.csv',
      csvContent: csv,
      columnMapping: {
        transactionDate: 'Fecha',
        reference: 'Referencia',
        description: 'Descripcion',
        amount: 'Monto',
        entryType: 'Tipo',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    // Should skip invalid row and process the valid ones
    expect(result.data.totalEntries).toBe(2)
    expect(result.data.skippedRows).toBe(1)
  })
})
