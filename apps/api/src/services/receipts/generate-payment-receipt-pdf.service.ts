import PDFDocument from 'pdfkit'
import { type TServiceResult, success, failure } from '@packages/services'
import type { PaymentsRepository } from '@packages/database'
import type { PaymentApplicationsRepository } from '@packages/database'
import type { UnitsRepository } from '@packages/database'
import type { CondominiumsRepository } from '@packages/database'
import type { CurrenciesRepository } from '@packages/database'
import type { ManagementCompaniesRepository } from '@packages/database'
import type { ExchangeRatesRepository } from '@packages/database'

export interface IPaymentReceiptPdfOutput {
  data: Buffer
  filename: string
  contentType: string
}

const MARGIN = 40
const HEADER_BG = '#2c3e50'
const ACCENT_COLOR = '#27ae60'
const LIGHT_BG = '#f8f9fa'
const BORDER_COLOR = '#dee2e6'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
  mobile_payment: 'Pago Móvil',
  gateway: 'Pasarela de Pago',
  other: 'Otro',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  pending_verification: 'Por Verificar',
  completed: 'Completado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
  rejected: 'Rechazado',
}

export class GeneratePaymentReceiptPdfService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly paymentApplicationsRepo: PaymentApplicationsRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
    private readonly managementCompaniesRepo?: ManagementCompaniesRepository,
    private readonly exchangeRatesRepo?: ExchangeRatesRepository
  ) {}

  private async resolvePreferredCurrency(
    condominium: Record<string, unknown> | null,
    paymentCurrencyId: string
  ): Promise<{
    convertAmount: (amount: string | number) => string
    currencySymbol: string
  }> {
    const currency = await this.currenciesRepo.getById(paymentCurrencyId)
    const originalSymbol = String(currency?.symbol ?? '')
    const identity = (a: string | number) => String(a)

    if (!condominium || !this.managementCompaniesRepo || !this.exchangeRatesRepo) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const managementCompanyIds = (condominium as { managementCompanyIds?: string[] })
      .managementCompanyIds
    if (!managementCompanyIds?.length) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const company = await this.managementCompaniesRepo.getById(managementCompanyIds[0]!)
    if (!company?.preferredCurrencyId || company.preferredCurrencyId === paymentCurrencyId) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const preferredCurrency = await this.currenciesRepo.getById(company.preferredCurrencyId)
    if (!preferredCurrency) {
      return { convertAmount: identity, currencySymbol: originalSymbol }
    }

    const rate = await this.exchangeRatesRepo.getLatestRate(
      paymentCurrencyId,
      company.preferredCurrencyId
    )
    if (!rate) {
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
        return (numAmount * rateValue).toFixed(decimals)
      },
    }
  }

  async execute(paymentId: string): Promise<TServiceResult<IPaymentReceiptPdfOutput>> {
    try {
      // 1. Load payment
      const payment = await this.paymentsRepo.getById(paymentId)
      if (!payment) return failure('Pago no encontrado', 'NOT_FOUND')

      // 2. Load applications
      const applications = await this.paymentApplicationsRepo.getByPaymentId(paymentId)

      // 3. Load related entities
      const unit = await this.unitsRepo.getById(payment.unitId)
      if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')

      const condominium = await this.condominiumsRepo.getById(
        (unit as unknown as Record<string, unknown>).condominiumId as string
      )

      const { convertAmount, currencySymbol } = await this.resolvePreferredCurrency(
        condominium as Record<string, unknown> | null,
        payment.currencyId
      )

      // 4. Generate PDF
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'portrait',
        margin: MARGIN,
        bufferPages: true,
      })

      const chunks: Uint8Array[] = []
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))

      const bufferPromise = new Promise<Buffer>(resolve => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
      })

      const pageWidth = (doc.page.width as number) - MARGIN * 2

      // ─── Header ───────────────────────────────────────────────────
      this.drawHeader(doc, condominium, payment, pageWidth)

      // ─── Payment Info ─────────────────────────────────────────────
      this.drawPaymentInfo(doc, payment, unit, currencySymbol, pageWidth, convertAmount)

      // ─── Applications Table ───────────────────────────────────────
      if (applications.length > 0) {
        this.drawApplicationsTable(doc, applications, currencySymbol, pageWidth, convertAmount)
      }

      // ─── Total ────────────────────────────────────────────────────
      this.drawTotal(doc, payment, currencySymbol, pageWidth, convertAmount)

      // ─── Notes ────────────────────────────────────────────────────
      if (payment.notes) {
        this.drawNotes(doc, payment.notes, pageWidth)
      }

      // ─── Footer ───────────────────────────────────────────────────
      this.drawFooter(doc, pageWidth)

      // Page numbers
      const pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text(
            `Página ${i + 1} de ${pages.count}`,
            MARGIN,
            (doc.page.height as number) - MARGIN + 10,
            { align: 'center', width: pageWidth }
          )
      }

      doc.end()
      const buffer = await bufferPromise

      const fileId = payment.paymentNumber ?? payment.id
      return success({
        data: buffer,
        filename: `comprobante-pago-${fileId}.pdf`,
        contentType: 'application/pdf',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generando comprobante de pago'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    condominium: Record<string, unknown> | null,
    payment: Record<string, unknown>,
    pageWidth: number
  ) {
    doc.rect(MARGIN, MARGIN, pageWidth, 60).fill(HEADER_BG)

    // Condominium name
    if (condominium) {
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text((condominium.name as string) ?? '', MARGIN + 15, MARGIN + 10, {
          width: pageWidth - 30,
        })

      if (condominium.rif as string) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#cccccc')
          .text(`RIF: ${condominium.rif as string}`, MARGIN + 15, MARGIN + 32, {
            width: pageWidth - 30,
          })
      }
    }

    // Title on the right
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('COMPROBANTE DE PAGO', MARGIN + 15, MARGIN + 10, {
        width: pageWidth - 30,
        align: 'right',
      })

    const paymentLabel = (payment.paymentNumber as string) ?? (payment.id as string).slice(0, 8)
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#cccccc')
      .text(`N° ${paymentLabel}`, MARGIN + 15, MARGIN + 28, {
        width: pageWidth - 30,
        align: 'right',
      })

    // Status badge
    const statusLabel =
      PAYMENT_STATUS_LABELS[payment.status as string] ?? (payment.status as string)
    const statusColor = (payment.status as string) === 'completed' ? '#2ecc71' : '#ffd700'
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(statusColor)
      .text(statusLabel.toUpperCase(), MARGIN + 15, MARGIN + 44, {
        width: pageWidth - 30,
        align: 'right',
      })

    doc.fillColor('#000000')
    doc.y = MARGIN + 70
  }

  private drawPaymentInfo(
    doc: PDFKit.PDFDocument,
    payment: Record<string, unknown>,
    unit: Record<string, unknown>,
    currencySymbol: string,
    pageWidth: number,
    convertAmount: (amount: string | number) => string = a => String(a)
  ) {
    const y = doc.y + 10

    doc.rect(MARGIN, y, pageWidth, 70).fill(LIGHT_BG).stroke(BORDER_COLOR)

    const col1X = MARGIN + 15
    const col2X = MARGIN + pageWidth / 3
    const col3X = MARGIN + (pageWidth * 2) / 3

    // Row 1
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
    doc.text('UNIDAD', col1X, y + 6)
    doc.text('MÉTODO DE PAGO', col2X, y + 6)
    doc.text('FECHA DE PAGO', col3X, y + 6)

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
    doc.text(unit.unitNumber as string, col1X, y + 20)
    doc.text(
      PAYMENT_METHOD_LABELS[payment.paymentMethod as string] ?? (payment.paymentMethod as string),
      col2X,
      y + 20
    )
    doc.text(payment.paymentDate as string, col3X, y + 20)

    // Row 2
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
    doc.text('PROPIETARIO', col1X, y + 40)
    doc.text('MONTO', col2X, y + 40)

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
    doc.text((unit.ownerName as string) ?? '-', col1X, y + 54)
    doc.text(`${currencySymbol} ${convertAmount(payment.amount as string)}`, col2X, y + 54)

    doc.fillColor('#000000')
    doc.y = y + 80
  }

  private drawApplicationsTable(
    doc: PDFKit.PDFDocument,
    applications: Record<string, unknown>[],
    currencySymbol: string,
    pageWidth: number,
    convertAmount: (amount: string | number) => string = a => String(a)
  ) {
    const y = doc.y + 10

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('CUOTAS APLICADAS', MARGIN, y)

    let tableY = y + 20

    const colWidths = [pageWidth * 0.35, pageWidth * 0.25, pageWidth * 0.2, pageWidth * 0.2]

    // Header
    doc.rect(MARGIN, tableY, pageWidth, 22).fill(HEADER_BG)
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
    doc.text('CUOTA', MARGIN + 6, tableY + 6, { width: colWidths[0]! - 12 })
    doc.text('CAPITAL', MARGIN + colWidths[0]! + 6, tableY + 6, {
      width: colWidths[1]! - 12,
      align: 'right',
    })
    doc.text('INTERESES', MARGIN + colWidths[0]! + colWidths[1]! + 6, tableY + 6, {
      width: colWidths[2]! - 12,
      align: 'right',
    })
    doc.text('TOTAL', MARGIN + colWidths[0]! + colWidths[1]! + colWidths[2]! + 6, tableY + 6, {
      width: colWidths[3]! - 12,
      align: 'right',
    })

    tableY += 22

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i]!
      const rowHeight = 20
      const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_BG

      doc.rect(MARGIN, tableY, pageWidth, rowHeight).fill(bgColor)

      doc.fontSize(8).font('Helvetica').fillColor('#333333')
      doc.text((app.quotaId as string)?.slice(0, 8) ?? '-', MARGIN + 6, tableY + 5, {
        width: colWidths[0]! - 12,
      })
      doc.text(
        `${currencySymbol} ${convertAmount(app.appliedToPrincipal as string)}`,
        MARGIN + colWidths[0]! + 6,
        tableY + 5,
        { width: colWidths[1]! - 12, align: 'right' }
      )
      doc.text(
        `${currencySymbol} ${convertAmount(app.appliedToInterest as string)}`,
        MARGIN + colWidths[0]! + colWidths[1]! + 6,
        tableY + 5,
        { width: colWidths[2]! - 12, align: 'right' }
      )
      doc.text(
        `${currencySymbol} ${convertAmount(app.appliedAmount as string)}`,
        MARGIN + colWidths[0]! + colWidths[1]! + colWidths[2]! + 6,
        tableY + 5,
        { width: colWidths[3]! - 12, align: 'right' }
      )

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

  private drawTotal(
    doc: PDFKit.PDFDocument,
    payment: Record<string, unknown>,
    currencySymbol: string,
    pageWidth: number,
    convertAmount: (amount: string | number) => string = a => String(a)
  ) {
    const y = doc.y + 10
    const totalWidth = pageWidth * 0.4
    const totalX = MARGIN + pageWidth - totalWidth

    doc.rect(totalX, y, totalWidth, 28).fill(ACCENT_COLOR)
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
    doc.text('TOTAL PAGADO', totalX + 10, y + 7, { width: totalWidth * 0.5 })
    doc.text(
      `${currencySymbol} ${convertAmount(payment.amount as string)}`,
      totalX + totalWidth * 0.5,
      y + 7,
      {
        width: totalWidth * 0.45,
        align: 'right',
      }
    )

    doc.fillColor('#000000')
    doc.y = y + 40
  }

  private drawNotes(doc: PDFKit.PDFDocument, notes: string, pageWidth: number) {
    const y = doc.y + 5

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333').text('Observaciones:', MARGIN, y)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(notes, MARGIN, y + 14, { width: pageWidth })

    doc.fillColor('#000000')
    doc.y = doc.y + 10
  }

  private drawFooter(doc: PDFKit.PDFDocument, pageWidth: number) {
    const y = doc.y + 15

    doc
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + pageWidth, y)
      .stroke()

    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#999999')
      .text(
        'Este comprobante es un documento informativo generado automáticamente. ' +
          'No constituye un recibo oficial hasta ser validado por la administración.',
        MARGIN,
        y + 8,
        { width: pageWidth, align: 'center' }
      )

    const now = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })
    doc.text(`Documento generado el ${now}`, MARGIN, y + 26, { width: pageWidth, align: 'center' })
  }
}
