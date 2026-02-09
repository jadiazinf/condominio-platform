/* eslint-disable @typescript-eslint/no-explicit-any */
import { getEnvConfig } from '../config/env'

// Browser globals — declared here so the file compiles in non-DOM environments
// (e.g. the API tsconfig which doesn't include "lib": ["dom"]).
declare const window: any
declare const document: any

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TReportFormat = 'csv' | 'pdf'

export interface IAccountStatementExportParams {
  unitId: string
  format: TReportFormat
  startDate?: string
  endDate?: string
}

export interface IDebtorsReportExportParams {
  condominiumId: string
  format: TReportFormat
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: auth token getter (mirrors the global auth pattern)
// ─────────────────────────────────────────────────────────────────────────────

let reportAuthTokenGetter: (() => string | null | Promise<string | null>) | null = null

/**
 * Set the auth token getter for report downloads.
 * This should be called during app initialization alongside `setGlobalAuthToken`.
 */
export function setReportAuthToken(
  tokenGetter: () => string | null | Promise<string | null>
): void {
  reportAuthTokenGetter = tokenGetter
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: common download helper
// ─────────────────────────────────────────────────────────────────────────────

async function downloadFile(
  path: string,
  filename: string
): Promise<void> {
  if (typeof window === 'undefined') return

  const { apiBaseUrl } = getEnvConfig()
  const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${normalizedBase}${normalizedPath}`

  const headers: Record<string, string> = {}

  if (reportAuthTokenGetter) {
    const token = await reportAuthTokenGetter()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const blobUrl = (URL as any).createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  ;(URL as any).revokeObjectURL(blobUrl)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: download functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download an account statement report (CSV or PDF).
 * Triggers a browser file download.
 */
export async function downloadAccountStatement(
  params: IAccountStatementExportParams
): Promise<void> {
  const queryParams = new URLSearchParams()
  queryParams.set('unitId', params.unitId)
  queryParams.set('format', params.format)
  if (params.startDate) queryParams.set('startDate', params.startDate)
  if (params.endDate) queryParams.set('endDate', params.endDate)

  const path = `/condominium/reports/account-statement?${queryParams.toString()}`
  const filename = `account-statement.${params.format}`

  await downloadFile(path, filename)
}

/**
 * Download a debtors report (CSV or PDF).
 * Triggers a browser file download.
 */
export async function downloadDebtorsReport(
  params: IDebtorsReportExportParams
): Promise<void> {
  const queryParams = new URLSearchParams()
  queryParams.set('condominiumId', params.condominiumId)
  queryParams.set('format', params.format)

  const path = `/condominium/reports/debtors?${queryParams.toString()}`
  const filename = `debtors-report.${params.format}`

  await downloadFile(path, filename)
}
