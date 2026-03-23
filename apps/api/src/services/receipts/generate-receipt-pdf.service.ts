import PDFDocument from 'pdfkit'
import { type TServiceResult, success, failure } from '@packages/services'
import type { CondominiumReceiptsRepository } from '@packages/database'
import type { QuotasRepository } from '@packages/database'
import type { UnitsRepository } from '@packages/database'
import type { BuildingsRepository } from '@packages/database'
import type { CondominiumsRepository } from '@packages/database'
import type { CurrenciesRepository } from '@packages/database'
import type { ManagementCompaniesRepository } from '@packages/database'
import type { ExchangeRatesRepository } from '@packages/database'
import type { PaymentConceptServicesRepository } from '@packages/database'

export interface IReceiptPdfOutput {
  data: Buffer
  filename: string
  contentType: string
}

// Layout constants
const MARGIN = 40
const HEADER_BG = '#2c3e50'
const ACCENT_COLOR = '#3498db'
const LIGHT_BG = '#f8f9fa'
const BORDER_COLOR = '#dee2e6'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Remove accents, replace spaces/special chars with hyphens, lowercase */
function sanitize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

/** Shorthand for doc.text with lineBreak: false to prevent auto-paging */
function txt(
  doc: PDFKit.PDFDocument,
  str: string,
  x: number,
  y: number,
  opts?: PDFKit.Mixins.TextOptions
) {
  doc.text(str, x, y, { lineBreak: false, ...opts })
}

interface IBreakdownItem {
  label: string
  amount: string
  sub?: boolean
}

export class GenerateReceiptPdfService {
  constructor(
    private readonly receiptsRepo: CondominiumReceiptsRepository,
    private readonly quotasRepo: QuotasRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly buildingsRepo: BuildingsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
    private readonly conceptServicesRepo?: PaymentConceptServicesRepository,
    private readonly managementCompaniesRepo?: ManagementCompaniesRepository,
    private readonly exchangeRatesRepo?: ExchangeRatesRepository
  ) {}

  /**
   * Resolves the preferred currency and exchange rate for a management company.
   * Returns a formatter function that converts and formats amounts.
   */
  /**
   * Resolves the preferred currency and exchange rate for a management company.
   * Returns a converter function that converts amounts, and the preferred currency symbol.
   */
  private async resolvePreferredCurrency(
    condominium: Record<string, unknown>,
    receiptCurrencyId: string
  ): Promise<{
    convertAmount: (amount: string | number) => string
    currencySymbol: string
  }> {
    const currency = await this.currenciesRepo.getById(receiptCurrencyId)
    const originalSymbol = String(currency?.symbol ?? '')
    const identity = (a: string | number) => String(a)

    if (!this.managementCompaniesRepo || !this.exchangeRatesRepo) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const managementCompanyIds = (condominium as { managementCompanyIds?: string[] }).managementCompanyIds
    if (!managementCompanyIds?.length) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const company = await this.managementCompaniesRepo.getById(managementCompanyIds[0]!)
    if (!company?.preferredCurrencyId || company.preferredCurrencyId === receiptCurrencyId) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const preferredCurrency = await this.currenciesRepo.getById(company.preferredCurrencyId)
    if (!preferredCurrency) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const rate = await this.exchangeRatesRepo.getLatestRate(receiptCurrencyId, company.preferredCurrencyId)
    if (!rate) {
      // No exchange rate available — fall back to original currency
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const preferredSymbol = String(preferredCurrency.symbol ?? '')
    const rateValue = Number(rate.rate)
    const decimals = preferredCurrency.decimals ?? 2

    return {
      currencySymbol: preferredSymbol,
      convertAmount: (amount: string | number) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(numAmount)) return String(amount)
        const converted = numAmount * rateValue
        return converted.toFixed(decimals)
      },
    }
  }

  async execute(receiptId: string): Promise<TServiceResult<IReceiptPdfOutput>> {
    try {
      // 1. Load receipt
      const receipt = await this.receiptsRepo.getById(receiptId)
      if (!receipt) return failure('Recibo no encontrado', 'NOT_FOUND')

      // 2. Load related entities
      const unit = await this.unitsRepo.getById(receipt.unitId)
      if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')

      const building = await this.buildingsRepo.getById(receipt.buildingId)

      const condominium = await this.condominiumsRepo.getById(receipt.condominiumId)
      if (!condominium) return failure('Condominio no encontrado', 'NOT_FOUND')

      // Resolve preferred currency for display (converts amounts if needed)
      const { convertAmount, currencySymbol } = await this.resolvePreferredCurrency(
        condominium as Record<string, unknown>,
        receipt.currencyId as string
      )

      // 3b. Build breakdown items from quotas + services (matching web view)
      const quotas = await this.quotasRepo.getByUnitAndPeriod(
        receipt.unitId,
        receipt.periodYear,
        receipt.periodMonth
      )

      const breakdownItems: IBreakdownItem[] = []
      for (const quota of quotas) {
        const conceptName =
          (((quota as Record<string, unknown>).paymentConcept as Record<string, unknown>)
            ?.name as string) ?? 'Concepto'
        breakdownItems.push({
          label: conceptName,
          amount: convertAmount((quota as Record<string, unknown>).baseAmount as string),
        })

        // Fetch linked services for this concept
        if (this.conceptServicesRepo && (quota as Record<string, unknown>).paymentConceptId) {
          const services = await this.conceptServicesRepo.listByConceptId(
            (quota as Record<string, unknown>).paymentConceptId as string
          )
          for (const svc of services) {
            breakdownItems.push({ label: svc.serviceName, amount: convertAmount(svc.amount), sub: true })
          }
        }
      }

      // 4. Generate PDF
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'portrait',
        margin: MARGIN,
      })

      const chunks: Uint8Array[] = []
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))

      const bufferPromise = new Promise<Buffer>(resolve => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
      })

      const pageWidth = (doc.page.width as number) - MARGIN * 2

      // ─── Header: Condominium Info ─────────────────────────────────
      this.drawHeader(doc, condominium, receipt, pageWidth)

      // ─── Unit Info Box ────────────────────────────────────────────
      this.drawUnitInfo(doc, unit, building, receipt, pageWidth)

      // ─── Period & Receipt Number ──────────────────────────────────
      this.drawPeriodInfo(doc, receipt, pageWidth)

      // ─── Period Breakdown ─────────────────────────────────────────
      this.drawBreakdownTable(doc, breakdownItems, currencySymbol, pageWidth)

      // ─── Amounts Summary ──────────────────────────────────────────
      this.drawAmountsSummary(doc, receipt, currencySymbol, pageWidth, convertAmount)

      // ─── Footer ───────────────────────────────────────────────────
      this.drawFooter(doc, condominium, pageWidth)

      doc.end()

      const buffer = await bufferPromise

      return success({
        data: buffer,
        filename: `recibo_${sanitize(condominium.name as string)}_${sanitize(unit.unitNumber as string)}_${MONTH_NAMES[(receipt.periodMonth as number) - 1]}_${receipt.periodYear}.pdf`,
        contentType: 'application/pdf',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generando PDF del recibo'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    condominium: Record<string, unknown>,
    receipt: Record<string, unknown>,
    pageWidth: number
  ) {
    // Header background
    doc.rect(MARGIN, MARGIN, pageWidth, 60).fill(HEADER_BG)

    // Condominium name
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
    txt(doc, (condominium.name as string) ?? 'Condominio', MARGIN + 15, MARGIN + 10, {
      width: pageWidth - 30,
    })

    // RIF
    if (condominium.rif as string) {
      doc.fontSize(10).font('Helvetica').fillColor('#cccccc')
      txt(doc, `RIF: ${condominium.rif as string}`, MARGIN + 15, MARGIN + 32, {
        width: pageWidth - 30,
      })
    }

    // "RECIBO DE CONDOMINIO" label on the right
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
    txt(doc, 'RECIBO DE CONDOMINIO', MARGIN + 15, MARGIN + 10, {
      width: pageWidth - 30,
      align: 'right',
    })

    // Receipt number on the right
    doc.fontSize(10).font('Helvetica').fillColor('#cccccc')
    txt(doc, `N° ${receipt.receiptNumber as string}`, MARGIN + 15, MARGIN + 28, {
      width: pageWidth - 30,
      align: 'right',
    })

    // Status badge
    const statusLabels: Record<string, string> = {
      draft: 'BORRADOR',
      generated: 'GENERADO',
      sent: 'ENVIADO',
      voided: 'ANULADO',
    }
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffd700')
    txt(
      doc,
      statusLabels[receipt.status as string] ?? (receipt.status as string),
      MARGIN + 15,
      MARGIN + 44,
      { width: pageWidth - 30, align: 'right' }
    )

    doc.fillColor('#000000')
    doc.y = MARGIN + 70
  }

  private drawUnitInfo(
    doc: PDFKit.PDFDocument,
    unit: Record<string, unknown>,
    building: Record<string, unknown> | null,
    receipt: Record<string, unknown>,
    pageWidth: number
  ) {
    const y = doc.y + 10

    // Info box
    doc.rect(MARGIN, y, pageWidth, 50).fill(LIGHT_BG).stroke(BORDER_COLOR)

    const col1X = MARGIN + 15
    const col2X = MARGIN + pageWidth / 3
    const col3X = MARGIN + (pageWidth * 2) / 3

    doc.fontSize(8).font('Helvetica').fillColor('#666666')
    txt(doc, 'PROPIETARIO / RESIDENTE', col1X, y + 6)
    txt(doc, 'EDIFICIO / TORRE', col2X, y + 6)
    txt(doc, 'UNIDAD / ALÍCUOTA', col3X, y + 6)

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
    txt(doc, (unit.ownerName as string) ?? '-', col1X, y + 20)
    txt(doc, String(building?.name ?? '-'), col2X, y + 20)

    const aliquotStr = receipt.unitAliquot ? ` (${receipt.unitAliquot as string}%)` : ''
    txt(doc, `${unit.unitNumber as string}${aliquotStr}`, col3X, y + 20)

    doc.fillColor('#000000')
    doc.y = y + 60
  }

  private drawPeriodInfo(
    doc: PDFKit.PDFDocument,
    receipt: Record<string, unknown>,
    pageWidth: number
  ) {
    const y = doc.y + 5

    const monthName = MONTH_NAMES[(receipt.periodMonth as number) - 1] ?? ''
    const periodStr = `${monthName} ${receipt.periodYear as number}`

    doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
    txt(doc, `Período: ${periodStr}`, MARGIN, y, { width: pageWidth, align: 'center' })

    if (receipt.generatedAt) {
      const dateStr = new Date(receipt.generatedAt as string | number | Date).toLocaleDateString(
        'es-VE',
        { dateStyle: 'long' }
      )
      doc.fontSize(9).font('Helvetica').fillColor('#666666')
      txt(doc, `Fecha de emisión: ${dateStr}`, MARGIN, y + 18, {
        width: pageWidth,
        align: 'center',
      })
    }

    doc.fillColor('#000000')
    doc.y = y + 35
  }

  private drawBreakdownTable(
    doc: PDFKit.PDFDocument,
    items: IBreakdownItem[],
    currencySymbol: string,
    pageWidth: number
  ) {
    if (items.length === 0) return

    const y = doc.y + 5

    // Section title
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
    txt(doc, 'DESGLOSE DEL PERÍODO', MARGIN, y)

    let tableY = y + 20

    // Column widths: Item (70%) | Monto (30%)
    const colWidths = [pageWidth * 0.7, pageWidth * 0.3]

    // Table header
    doc.rect(MARGIN, tableY, pageWidth, 22).fill(HEADER_BG)
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
    txt(doc, 'CONCEPTO', MARGIN + 6, tableY + 6, { width: colWidths[0]! - 12 })
    txt(doc, 'MONTO', MARGIN + colWidths[0]! + 6, tableY + 6, {
      width: colWidths[1]! - 12,
      align: 'right',
    })

    tableY += 22

    // Table rows
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      const rowHeight = 20
      const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_BG

      doc.rect(MARGIN, tableY, pageWidth, rowHeight).fill(bgColor)

      const leftPad = item.sub ? 20 : 6
      const fontSize = item.sub ? 8 : 9
      const fontName = item.sub ? 'Helvetica' : 'Helvetica-Bold'
      const textColor = item.sub ? '#666666' : '#333333'

      doc.fontSize(fontSize).font(fontName).fillColor(textColor)
      txt(doc, item.label, MARGIN + leftPad, tableY + 5, { width: colWidths[0]! - leftPad - 6 })
      txt(doc, `${currencySymbol} ${item.amount}`, MARGIN + colWidths[0]! + 6, tableY + 5, {
        width: colWidths[1]! - 12,
        align: 'right',
      })

      // Bottom border
      doc
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .moveTo(MARGIN, tableY + rowHeight)
        .lineTo(MARGIN + pageWidth, tableY + rowHeight)
        .stroke()

      tableY += rowHeight
    }

    doc.fillColor('#000000')
    doc.y = tableY + 5
  }

  private drawAmountsSummary(
    doc: PDFKit.PDFDocument,
    receipt: Record<string, unknown>,
    currencySymbol: string,
    pageWidth: number,
    convertAmount: (amount: string | number) => string = (a) => String(a)
  ) {
    const y = doc.y + 10

    // Section title
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
    txt(doc, 'RESUMEN DE MONTOS', MARGIN, y)

    let rowY = y + 20

    const amounts = [
      { label: 'Cuota Ordinaria', value: receipt.ordinaryAmount as string },
      { label: 'Cuota Extraordinaria', value: receipt.extraordinaryAmount as string },
      { label: 'Fondo de Reserva', value: receipt.reserveFundAmount as string },
      { label: 'Intereses', value: receipt.interestAmount as string },
      { label: 'Multas', value: receipt.finesAmount as string },
      { label: 'Saldo Anterior', value: receipt.previousBalance as string },
    ]

    // Draw all amount rows (matching web view — show all, even zero)
    for (let i = 0; i < amounts.length; i++) {
      const { label, value } = amounts[i]!
      const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_BG
      doc.rect(MARGIN, rowY, pageWidth, 18).fill(bgColor)

      doc.fontSize(9).font('Helvetica').fillColor('#666666')
      txt(doc, label, MARGIN + 10, rowY + 4, { width: pageWidth * 0.6 })
      doc.fontSize(9).font('Helvetica').fillColor('#333333')
      txt(doc, `${currencySymbol} ${convertAmount(value)}`, MARGIN + pageWidth * 0.6, rowY + 4, {
        width: pageWidth * 0.35,
        align: 'right',
      })

      rowY += 18
    }

    // Separator
    doc
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .moveTo(MARGIN, rowY)
      .lineTo(MARGIN + pageWidth, rowY)
      .stroke()

    rowY += 4

    // Total row (highlighted)
    doc.rect(MARGIN, rowY, pageWidth, 24).fill(ACCENT_COLOR)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
    txt(doc, 'TOTAL A PAGAR', MARGIN + 10, rowY + 6, { width: pageWidth * 0.6 })
    txt(
      doc,
      `${currencySymbol} ${convertAmount(receipt.totalAmount as string)}`,
      MARGIN + pageWidth * 0.6,
      rowY + 6,
      {
        width: pageWidth * 0.35,
        align: 'right',
      }
    )

    doc.fillColor('#000000')
    doc.y = rowY + 35
  }

  private drawFooter(
    doc: PDFKit.PDFDocument,
    condominium: Record<string, unknown>,
    pageWidth: number
  ) {
    // Draw footer at a fixed position near the bottom of the current page
    const pageBottom = (doc.page.height as number) - MARGIN
    const footerStartY = pageBottom - 50
    const y = Math.max(doc.y + 10, footerStartY)

    // Separator line
    doc
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + pageWidth, y)
      .stroke()

    // Footer text — all using txt() to prevent auto-paging
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#999999')
    txt(
      doc,
      'Este recibo es un documento informativo generado automáticamente. Para cualquier consulta, contacte a la administración del condominio.',
      MARGIN,
      y + 8,
      { width: pageWidth, align: 'center' }
    )

    if (condominium.address as string) {
      txt(doc, condominium.address as string, MARGIN, y + 22, { width: pageWidth, align: 'center' })
    }

    // Generation timestamp
    const now = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })
    txt(doc, `Documento generado el ${now}`, MARGIN, y + 36, { width: pageWidth, align: 'center' })
  }
}
