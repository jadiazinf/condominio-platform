'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { useMyCompanyBankAccountsPaginated, useImportBankStatement } from '@packages/http-client'

import { useSessionStore } from '@/stores'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Select, SelectItem } from '@/ui/components/select'
import { useToast } from '@/ui/components/toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  backToList: string
  bankAccount: string
  bankAccountPlaceholder: string
  selectFile: string
  changeFile: string
  preview: string
  previewDesc: string
  entriesFound: string
  columnMapping: string
  columnMappingDesc: string
  col: {
    transactionDate: string
    reference: string
    description: string
    amount: string
    entryType: string
    balance: string
  }
  autoDetected: string
  skipColumn: string
  importing: string
  importBtn: string
  success: string
  error: string
  noFile: string
  noBankAccount: string
  emptyFile: string
}

type TColumnKey =
  | 'transactionDate'
  | 'reference'
  | 'description'
  | 'amount'
  | 'entryType'
  | 'balance'

const REQUIRED_COLUMNS: TColumnKey[] = ['transactionDate', 'reference', 'description', 'amount']
const OPTIONAL_COLUMNS: TColumnKey[] = ['entryType', 'balance']
const ALL_COLUMNS: TColumnKey[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

// Common CSV column name patterns for auto-detection
const COLUMN_PATTERNS: Record<TColumnKey, RegExp> = {
  transactionDate: /fecha|date|fec/i,
  reference: /referencia|reference|ref|numero|number/i,
  description: /descripcion|description|desc|concepto|detalle|detail/i,
  amount: /monto|amount|valor|value|importe/i,
  entryType: /tipo|type|naturaleza|nat/i,
  balance: /saldo|balance|disponible/i,
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportBankStatementClient({ translations: t }: { translations: ITranslations }) {
  const router = useRouter()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const managementCompanies = useSessionStore(s => s.managementCompanies)
  const managementCompanyId = managementCompanies?.[0]?.managementCompanyId ?? ''

  // State
  const [bankAccountId, setBankAccountId] = useState('')
  const [fileName, setFileName] = useState('')
  const [csvContent, setCsvContent] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<TColumnKey, string>>({
    transactionDate: '',
    reference: '',
    description: '',
    amount: '',
    entryType: '',
    balance: '',
  })

  // Hooks
  const { data: bankAccountsData } = useMyCompanyBankAccountsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100, isActive: true },
    enabled: !!managementCompanyId,
  })
  const bankAccounts = bankAccountsData?.data ?? []
  const importMutation = useImportBankStatement()

  // Auto-detect column mapping from headers
  const autoDetectMapping = useCallback((headers: string[]) => {
    const mapping: Record<TColumnKey, string> = {
      transactionDate: '',
      reference: '',
      description: '',
      amount: '',
      entryType: '',
      balance: '',
    }

    for (const col of ALL_COLUMNS) {
      const pattern = COLUMN_PATTERNS[col]
      const match = headers.find(h => pattern.test(h))

      if (match) {
        mapping[col] = match
      }
    }

    return mapping
  }, [])

  // Handle CSV file selection
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]

      if (!file) return

      setFileName(file.name)

      const reader = new FileReader()

      reader.onload = event => {
        const content = event.target?.result as string

        setCsvContent(content)

        // Simple CSV preview parsing (backend does the real parsing)
        const lines = content.split(/\r?\n/).filter(l => l.trim())

        if (lines.length === 0) return

        const separator = lines[0].includes(';') ? ';' : ','
        const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''))
        const dataRows = lines
          .slice(1)
          .map(line => {
            const fields = line.split(separator).map(f => f.trim().replace(/^"|"$/g, ''))
            const row: Record<string, string> = {}

            headers.forEach((h, i) => {
              row[h] = fields[i] ?? ''
            })

            return row
          })
          .filter(row => Object.values(row).some(v => v !== ''))

        if (headers.length > 0) {
          setCsvHeaders(headers)
          setCsvRows(dataRows)
          setColumnMapping(autoDetectMapping(headers))
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [autoDetectMapping]
  )

  // Update a single column mapping
  const updateMapping = useCallback((col: TColumnKey, value: string) => {
    setColumnMapping(prev => ({ ...prev, [col]: value }))
  }, [])

  // Validation
  const canImport = useMemo(() => {
    if (!bankAccountId) return false
    if (!csvContent) return false
    if (csvRows.length === 0) return false

    // Required columns must be mapped
    return REQUIRED_COLUMNS.every(col => columnMapping[col] !== '')
  }, [bankAccountId, csvContent, csvRows.length, columnMapping])

  // Submit
  const handleImport = useCallback(async () => {
    if (!canImport) return

    const mappingPayload: Record<string, string> = {}

    for (const col of ALL_COLUMNS) {
      if (columnMapping[col]) {
        mappingPayload[col] = columnMapping[col]
      }
    }

    try {
      await importMutation.mutateAsync({
        bankAccountId,
        filename: fileName,
        csvContent,
        columnMapping: mappingPayload as {
          transactionDate: string
          reference: string
          description: string
          amount: string
          entryType?: string
          balance?: string
        },
      })
      toast.success(t.success)
      router.push('/dashboard/bank-reconciliation')
    } catch {
      toast.error(t.error)
    }
  }, [
    canImport,
    columnMapping,
    bankAccountId,
    fileName,
    csvContent,
    importMutation,
    toast,
    t,
    router,
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          className="mb-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"
          onClick={() => router.push('/dashboard/bank-reconciliation')}
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToList}
        </button>
        <Typography variant="h2">{t.title}</Typography>
        <Typography className="mt-1" color="muted">
          {t.subtitle}
        </Typography>
      </div>

      {/* Bank Account Selector */}
      <div className="max-w-md">
        <Select
          label={t.bankAccount}
          placeholder={t.bankAccountPlaceholder}
          selectedKeys={bankAccountId ? [bankAccountId] : []}
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as string

            setBankAccountId(selected ?? '')
          }}
        >
          {bankAccounts.map(account => (
            <SelectItem key={account.id}>
              {account.bankName} - {account.displayName}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* File Upload */}
      <div>
        <input
          ref={fileInputRef}
          accept=".csv,.txt"
          className="hidden"
          type="file"
          onChange={handleFileChange}
        />
        <Button
          className="w-full max-w-md"
          size="lg"
          startContent={<Upload className="h-4 w-4" />}
          variant="bordered"
          onPress={() => fileInputRef.current?.click()}
        >
          {fileName || t.selectFile}
        </Button>
      </div>

      {/* Column Mapping */}
      {csvHeaders.length > 0 && (
        <div className="rounded-lg border border-default-200 p-4">
          <Typography className="font-medium mb-1" variant="subtitle2">
            {t.columnMapping}
          </Typography>
          <Typography className="mb-4 text-sm" color="muted">
            {t.columnMappingDesc}
          </Typography>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_COLUMNS.map(col => (
              <Select
                key={col}
                isRequired={REQUIRED_COLUMNS.includes(col)}
                label={t.col[col]}
                selectedKeys={columnMapping[col] ? [columnMapping[col]] : []}
                onSelectionChange={keys => {
                  const selected = Array.from(keys)[0] as string

                  updateMapping(col, selected ?? '')
                }}
              >
                {csvHeaders.map(header => (
                  <SelectItem key={header}>{header}</SelectItem>
                ))}
              </Select>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {csvRows.length > 0 && (
        <div className="rounded-lg border border-success-200 bg-success-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <Typography className="font-medium text-success" variant="subtitle2">
              {csvRows.length} {t.entriesFound}
            </Typography>
          </div>
          <div className="max-h-60 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-success-200">
                  {csvHeaders.slice(0, 6).map(h => (
                    <th key={h} className="px-2 py-1 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-success-100 last:border-0">
                    {csvHeaders.slice(0, 6).map(h => (
                      <td key={h} className="px-2 py-1">
                        {row[h] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvRows.length > 10 && (
              <Typography className="mt-2 text-default-400" variant="caption">
                +{csvRows.length - 10} more...
              </Typography>
            )}
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {csvContent && csvRows.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50/50 p-4">
          <AlertCircle className="h-5 w-5 text-danger" />
          <Typography className="text-danger" variant="body2">
            {t.emptyFile}
          </Typography>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-2">
        <Button
          color="primary"
          isDisabled={!canImport}
          isLoading={importMutation.isPending}
          startContent={<FileSpreadsheet className="h-4 w-4" />}
          onPress={handleImport}
        >
          {importMutation.isPending ? t.importing : t.importBtn}
        </Button>
      </div>
    </div>
  )
}
