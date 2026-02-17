'use client'

import { useState, useCallback, useRef } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Button } from '@heroui/button'
import { Divider } from '@heroui/divider'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import type { TLocalUnit } from '../hooks/useCreateCondominiumWizard'

interface CsvUnitImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (units: Omit<TLocalUnit, 'tempId'>[]) => void
  buildingTempId: string
  buildingName: string
}

interface ParsedRow {
  unitNumber: string
  floor: number | null
  areaM2: string | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | undefined
  storageIdentifier: string | null
  aliquotPercentage: string | null
}

interface ParseResult {
  rows: ParsedRow[]
  errors: string[]
  warnings: string[]
}

const CSV_HEADERS = [
  'unitNumber',
  'floor',
  'areaM2',
  'bedrooms',
  'bathrooms',
  'parkingSpaces',
  'storageIdentifier',
  'aliquotPercentage',
]

const CSV_TEMPLATE = `unitNumber,floor,areaM2,bedrooms,bathrooms,parkingSpaces,storageIdentifier,aliquotPercentage
1A,1,75.5,2,1,1,D-1,0.85
1B,1,90,3,2,1,D-2,1.05
2A,2,75.5,2,1,1,,0.85
2B,2,90,3,2,1,,1.05`

function parseCsvContent(content: string): ParseResult {
  const rows: ParsedRow[] = []
  const errors: string[] = []
  const warnings: string[] = []

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    errors.push('csv.empty')
    return { rows, errors, warnings }
  }

  // Detect separator (comma or semicolon)
  const firstLine = lines[0]
  const separator = firstLine.includes(';') ? ';' : ','

  // Check if first line is header
  const firstFields = firstLine.split(separator).map((f) => f.trim().toLowerCase())
  const hasHeader = firstFields.includes('unitnumber') || firstFields.includes('unit_number') || firstFields.includes('unidad')

  const dataLines = hasHeader ? lines.slice(1) : lines

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = hasHeader ? i + 2 : i + 1
    const fields = dataLines[i].split(separator).map((f) => f.trim())

    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue

    const unitNumber = fields[0]
    if (!unitNumber) {
      errors.push(`line_${lineNum}_missing_unit_number`)
      continue
    }

    const floor = fields[1] ? Number(fields[1]) : null
    if (fields[1] && isNaN(floor!)) {
      warnings.push(`line_${lineNum}_invalid_floor`)
    }

    const areaM2 = fields[2] || null
    const bedrooms = fields[3] ? Number(fields[3]) : null
    const bathrooms = fields[4] ? Number(fields[4]) : null
    const parkingSpaces = fields[5] ? Number(fields[5]) : undefined
    const storageIdentifier = fields[6] || null
    const aliquotPercentage = fields[7] || null

    rows.push({
      unitNumber,
      floor: floor !== null && !isNaN(floor) ? floor : null,
      areaM2,
      bedrooms: bedrooms !== null && !isNaN(bedrooms) ? bedrooms : null,
      bathrooms: bathrooms !== null && !isNaN(bathrooms) ? bathrooms : null,
      parkingSpaces: parkingSpaces !== undefined && !isNaN(parkingSpaces) ? parkingSpaces : undefined,
      storageIdentifier,
      aliquotPercentage,
    })
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('csv.noValidRows')
  }

  return { rows, errors, warnings }
}

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'units_template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function CsvUnitImportModal({
  isOpen,
  onClose,
  onImport,
  buildingTempId,
  buildingName,
}: CsvUnitImportModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [fileName, setFileName] = useState<string>('')

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const result = parseCsvContent(content)
        setParseResult(result)
      }
      reader.readAsText(file)

      // Reset input so same file can be re-selected
      e.target.value = ''
    },
    []
  )

  const handleImport = useCallback(() => {
    if (!parseResult || parseResult.rows.length === 0) return

    const units: Omit<TLocalUnit, 'tempId'>[] = parseResult.rows.map((row) => ({
      buildingTempId,
      unitNumber: row.unitNumber,
      floor: row.floor,
      areaM2: row.areaM2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parkingSpaces: row.parkingSpaces,
      parkingIdentifiers: null,
      storageIdentifier: row.storageIdentifier,
      aliquotPercentage: row.aliquotPercentage,
    }))

    onImport(units)
    setParseResult(null)
    setFileName('')
    onClose()
  }, [parseResult, buildingTempId, onImport, onClose])

  const handleClose = useCallback(() => {
    setParseResult(null)
    setFileName('')
    onClose()
  }, [onClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col">
            <span>{t('superadmin.condominiums.wizard.csv.title')}</span>
            <span className="text-sm font-normal text-default-500">{buildingName}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-5">
            {/* Instructions */}
            <div className="rounded-lg border border-default-200 p-4">
              <Typography variant="subtitle2" className="font-medium mb-2">
                {t('superadmin.condominiums.wizard.csv.instructions')}
              </Typography>
              <div className="flex flex-col gap-2 text-sm text-default-600">
                <p>{t('superadmin.condominiums.wizard.csv.instructionsDesc')}</p>
                <div className="mt-1">
                  <Typography variant="caption" className="font-medium text-default-700 block mb-1">
                    {t('superadmin.condominiums.wizard.csv.columns')}
                  </Typography>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="font-mono font-medium text-success">unitNumber</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colUnitNumber')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">floor</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colFloor')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">areaM2</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colArea')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">bedrooms</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colBedrooms')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">bathrooms</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colBathrooms')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">parkingSpaces</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colParking')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">storageIdentifier</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colStorage')}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium">aliquotPercentage</span>
                      <span className="text-default-400"> — {t('superadmin.condominiums.wizard.csv.colAliquot')}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-default-400">
                  <p>{t('superadmin.condominiums.wizard.csv.notes')}</p>
                </div>
              </div>
            </div>

            {/* Download Template */}
            <Button
              variant="flat"
              color="default"
              startContent={<Download size={16} />}
              onPress={downloadCsvTemplate}
              className="self-start"
            >
              {t('superadmin.condominiums.wizard.csv.downloadTemplate')}
            </Button>

            <Divider />

            {/* File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="bordered"
                startContent={<Upload size={16} />}
                onPress={() => fileInputRef.current?.click()}
                className="w-full"
                size="lg"
              >
                {fileName || t('superadmin.condominiums.wizard.csv.selectFile')}
              </Button>
            </div>

            {/* Parse Results */}
            {parseResult && (
              <div className="flex flex-col gap-3">
                {/* Errors */}
                {parseResult.errors.length > 0 && (
                  <div className="rounded-lg border border-danger-200 bg-danger-50/50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} className="text-danger" />
                      <Typography variant="caption" className="font-medium text-danger">
                        {t('superadmin.condominiums.wizard.csv.errors')}
                      </Typography>
                    </div>
                    <ul className="text-xs text-danger-600 list-disc list-inside">
                      {parseResult.errors.map((err, i) => (
                        <li key={i}>{t(`superadmin.condominiums.wizard.csv.error.${err}`)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {parseResult.warnings.length > 0 && (
                  <div className="rounded-lg border border-warning-200 bg-warning-50/50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} className="text-warning" />
                      <Typography variant="caption" className="font-medium text-warning">
                        {t('superadmin.condominiums.wizard.csv.warnings')}
                      </Typography>
                    </div>
                    <ul className="text-xs text-warning-600 list-disc list-inside">
                      {parseResult.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success preview */}
                {parseResult.rows.length > 0 && (
                  <div className="rounded-lg border border-success-200 bg-success-50/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-success" />
                      <Typography variant="caption" className="font-medium text-success">
                        {parseResult.rows.length} {t('superadmin.condominiums.wizard.csv.unitsFound')}
                      </Typography>
                    </div>
                    <div className="max-h-40 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-success-200">
                            <th className="text-left py-1 px-1 font-medium">{t('superadmin.condominiums.detail.units.form.unitNumber')}</th>
                            <th className="text-left py-1 px-1 font-medium">{t('superadmin.condominiums.detail.units.form.floor')}</th>
                            <th className="text-left py-1 px-1 font-medium">{t('superadmin.condominiums.detail.units.form.area')}</th>
                            <th className="text-left py-1 px-1 font-medium">{t('superadmin.condominiums.detail.units.form.bedrooms')}</th>
                            <th className="text-left py-1 px-1 font-medium">{t('superadmin.condominiums.detail.units.form.bathrooms')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.rows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-b border-success-100 last:border-0">
                              <td className="py-1 px-1 font-mono">{row.unitNumber}</td>
                              <td className="py-1 px-1">{row.floor ?? '-'}</td>
                              <td className="py-1 px-1">{row.areaM2 ?? '-'}</td>
                              <td className="py-1 px-1">{row.bedrooms ?? '-'}</td>
                              <td className="py-1 px-1">{row.bathrooms ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parseResult.rows.length > 10 && (
                        <Typography variant="caption" className="text-default-400 mt-1 block">
                          +{parseResult.rows.length - 10} {t('superadmin.condominiums.wizard.bulk.more')}
                        </Typography>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            color="success"
            onPress={handleImport}
            isDisabled={!parseResult || parseResult.rows.length === 0 || parseResult.errors.length > 0}
            startContent={<FileSpreadsheet size={16} />}
          >
            {t('superadmin.condominiums.wizard.csv.import', { count: parseResult?.rows.length ?? 0 })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
