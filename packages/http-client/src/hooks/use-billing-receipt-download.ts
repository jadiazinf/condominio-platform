'use client'

import { useState, useCallback } from 'react'
import { getEnvConfig } from '../config'

let billingReceiptAuthTokenGetter: (() => Promise<string | null>) | null = null
let billingReceiptCondominiumIdGetter: (() => Promise<string | null>) | null = null

export function setBillingReceiptDownloadAuth(
  tokenGetter: () => Promise<string | null>,
  condominiumIdGetter?: () => Promise<string | null>,
) {
  billingReceiptAuthTokenGetter = tokenGetter
  billingReceiptCondominiumIdGetter = condominiumIdGetter ?? null
}

export function useDownloadBillingReceiptPdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(async (receiptId: string) => {
    const win = globalThis as any
    if (!win.window) return

    setIsDownloading(true)
    try {
      const { apiBaseUrl } = getEnvConfig()
      const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl

      const headers: Record<string, string> = {}

      if (billingReceiptAuthTokenGetter) {
        const token = await billingReceiptAuthTokenGetter()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }

      if (billingReceiptCondominiumIdGetter) {
        const condominiumId = await billingReceiptCondominiumIdGetter()
        if (condominiumId) headers['x-condominium-id'] = condominiumId
      }

      const response = await fetch(`${normalizedBase}/billing/receipts/${receiptId}/pdf`, { headers })

      if (!response.ok) throw new Error('Error descargando el PDF del recibo')

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="?(.+?)"?$/)
      const filename = filenameMatch?.[1] ?? `recibo-${receiptId}.pdf`

      const url: string = win.URL.createObjectURL(blob)
      const a = win.document.createElement('a')
      a.href = url
      a.download = filename
      win.document.body.appendChild(a)
      a.click()
      win.document.body.removeChild(a)
      win.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading billing receipt PDF:', error)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  return { download, isDownloading }
}
