import PDFDocument from 'pdfkit'
import { type TServiceResult, success, failure } from '@packages/services'
import type {
  BillingReceiptsRepository,
  ChargesRepository,
  ChargeTypesRepository,
  UnitsRepository,
  BuildingsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
} from '@packages/database'

export interface IBillingReceiptPdfOutput {
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
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function sanitize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function txt(doc: PDFKit.PDFDocument, str: string, x: number, y: number, opts?: PDFKit.Mixins.TextOptions) {
  doc.text(str, x, y, { lineBreak: false, ...opts })
}

function fmt(amount: string | number | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export class GenerateBillingReceiptPdfService {
  constructor(
    private readonly receiptsRepo: BillingReceiptsRepository,
    private readonly chargesRepo: ChargesRepository,
    private readonly chargeTypesRepo: ChargeTypesRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly buildingsRepo: BuildingsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
  ) {}

  async execute(receiptId: string): Promise<TServiceResult<IBillingReceiptPdfOutput>> {
    try {
      // 1. Load receipt
      const receipt = await this.receiptsRepo.getById(receiptId)
      if (!receipt) return failure('Recibo no encontrado', 'NOT_FOUND')

      // 2. Load unit & building
      const unit = await this.unitsRepo.getById(receipt.unitId)
      if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')

      const building = unit.buildingId ? await this.buildingsRepo.getById(unit.buildingId) : null

      // 3. Load condominium
      const condominium = await this.condominiumsRepo.getById(receipt.condominiumId)
      if (!condominium) return failure('Condominio no encontrado', 'NOT_FOUND')

      // 4. Load currency
      const currency = await this.currenciesRepo.getById(receipt.currencyId)
      const currencySymbol = String(currency?.symbol ?? '')

      // 5. Load charges for this receipt
      const charges = await this.chargesRepo.findByReceipt(receiptId)

      // 6. Load charge types for labels
      const chargeTypeIds = [...new Set(charges.map(c => c.chargeTypeId))]
      const chargeTypeMap = new Map<string, string>()
      for (const ctId of chargeTypeIds) {
        const ct = await this.chargeTypesRepo.getById(ctId)
        if (ct) chargeTypeMap.set(ctId, ct.name)
      }

      // 7. Build breakdown: non-credit charges as debit items, credits as discount items
      const debitItems = charges
        .filter(c => !c.isCredit)
        .sort((a, b) => {
          const aName = chargeTypeMap.get(a.chargeTypeId) ?? ''
          const bName = chargeTypeMap.get(b.chargeTypeId) ?? ''
          return aName.localeCompare(bName)
        })

      // 8. Generate PDF
      const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: MARGIN })
      const chunks: Uint8Array[] = []
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
      const bufferPromise = new Promise<Buffer>(resolve => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
      })

      const pageWidth = (doc.page.width as number) - MARGIN * 2

      // ─── Header ───
      doc.rect(MARGIN, MARGIN, pageWidth, 60).fill(HEADER_BG)
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
      txt(doc, String(condominium.name ?? 'Condominio'), MARGIN + 15, MARGIN + 10, { width: pageWidth - 30 })

      if ((condominium as Record<string, unknown>).rif) {
        doc.fontSize(10).font('Helvetica').fillColor('#cccccc')
        txt(doc, `RIF: ${(condominium as Record<string, unknown>).rif as string}`, MARGIN + 15, MARGIN + 32, { width: pageWidth - 30 })
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
      txt(doc, 'RECIBO DE CONDOMINIO', MARGIN + 15, MARGIN + 10, { width: pageWidth - 30, align: 'right' })
      doc.fontSize(10).font('Helvetica').fillColor('#cccccc')
      txt(doc, `N° ${receipt.receiptNumber}`, MARGIN + 15, MARGIN + 28, { width: pageWidth - 30, align: 'right' })

      const statusLabels: Record<string, string> = { draft: 'BORRADOR', issued: 'EMITIDO', paid: 'PAGADO', partial: 'PARCIAL', voided: 'ANULADO' }
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffd700')
      txt(doc, statusLabels[receipt.status] ?? receipt.status, MARGIN + 15, MARGIN + 44, { width: pageWidth - 30, align: 'right' })

      doc.fillColor('#000000')
      doc.y = MARGIN + 70

      // ─── Unit Info Box ───
      const uy = doc.y + 10
      doc.rect(MARGIN, uy, pageWidth, 50).fill(LIGHT_BG).stroke(BORDER_COLOR)
      const col1X = MARGIN + 15
      const col2X = MARGIN + pageWidth / 3
      const col3X = MARGIN + (pageWidth * 2) / 3

      doc.fontSize(8).font('Helvetica').fillColor('#666666')
      txt(doc, 'UNIDAD', col1X, uy + 6)
      txt(doc, 'EDIFICIO', col2X, uy + 6)
      txt(doc, 'CONDOMINIO', col3X, uy + 6)

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
      txt(doc, String(unit.unitNumber ?? '-'), col1X, uy + 20)
      txt(doc, String(building?.name ?? '-'), col2X, uy + 20)
      txt(doc, String(condominium.name ?? '-'), col3X, uy + 20)

      doc.fillColor('#000000')
      doc.y = uy + 60

      // ─── Period ───
      const py = doc.y + 5
      const monthName = MONTH_NAMES[(receipt.periodMonth) - 1] ?? ''
      doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      txt(doc, `Período: ${monthName} ${receipt.periodYear}`, MARGIN, py, { width: pageWidth, align: 'center' })

      if (receipt.issuedAt) {
        const dateStr = new Date(receipt.issuedAt).toLocaleDateString('es-VE', { dateStyle: 'long' })
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
        txt(doc, `Fecha de emisión: ${dateStr}`, MARGIN, py + 18, { width: pageWidth, align: 'center' })
      }
      doc.fillColor('#000000')
      doc.y = py + 35

      // ─── Charges Breakdown Table ───
      if (debitItems.length > 0) {
        const ty = doc.y + 5
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
        txt(doc, 'DESGLOSE DE CARGOS', MARGIN, ty)

        let tableY = ty + 20
        const colWidths = [pageWidth * 0.6, pageWidth * 0.2, pageWidth * 0.2]

        // Header
        doc.rect(MARGIN, tableY, pageWidth, 22).fill(HEADER_BG)
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
        txt(doc, 'CONCEPTO', MARGIN + 6, tableY + 6, { width: colWidths[0]! - 12 })
        txt(doc, 'CATEGORÍA', MARGIN + colWidths[0]! + 6, tableY + 6, { width: colWidths[1]! - 12 })
        txt(doc, 'MONTO', MARGIN + colWidths[0]! + colWidths[1]! + 6, tableY + 6, { width: colWidths[2]! - 12, align: 'right' })
        tableY += 22

        for (let i = 0; i < debitItems.length; i++) {
          const charge = debitItems[i]!
          const rowHeight = 20
          const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_BG
          doc.rect(MARGIN, tableY, pageWidth, rowHeight).fill(bgColor)

          const chargeTypeName = chargeTypeMap.get(charge.chargeTypeId) ?? 'Cargo'
          const desc = charge.description ?? chargeTypeName

          doc.fontSize(9).font('Helvetica').fillColor('#333333')
          txt(doc, desc, MARGIN + 6, tableY + 5, { width: colWidths[0]! - 12 })
          doc.fontSize(8).font('Helvetica').fillColor('#666666')
          txt(doc, chargeTypeName, MARGIN + colWidths[0]! + 6, tableY + 5, { width: colWidths[1]! - 12 })
          doc.fontSize(9).font('Helvetica').fillColor('#333333')
          txt(doc, `${currencySymbol} ${fmt(charge.amount)}`, MARGIN + colWidths[0]! + colWidths[1]! + 6, tableY + 5, { width: colWidths[2]! - 12, align: 'right' })

          doc.strokeColor(BORDER_COLOR).lineWidth(0.5)
            .moveTo(MARGIN, tableY + rowHeight).lineTo(MARGIN + pageWidth, tableY + rowHeight).stroke()
          tableY += rowHeight
        }

        doc.fillColor('#000000')
        doc.y = tableY + 5
      }

      // ─── Amounts Summary ───
      const sy = doc.y + 10
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
      txt(doc, 'RESUMEN DE MONTOS', MARGIN, sy)

      let rowY = sy + 20
      const amounts = [
        { label: 'Subtotal', value: receipt.subtotal },
        { label: 'Fondo de Reserva', value: receipt.reserveFundAmount },
        { label: 'Saldo Anterior', value: receipt.previousBalance },
        { label: 'Intereses', value: receipt.interestAmount },
        { label: 'Recargo por Mora', value: receipt.lateFeeAmount },
        { label: 'Descuento', value: receipt.discountAmount, isDiscount: true },
      ].filter(a => parseFloat(a.value ?? '0') !== 0)

      for (let i = 0; i < amounts.length; i++) {
        const { label, value, isDiscount } = amounts[i]!
        const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_BG
        doc.rect(MARGIN, rowY, pageWidth, 18).fill(bgColor)

        doc.fontSize(9).font('Helvetica').fillColor('#666666')
        txt(doc, label, MARGIN + 10, rowY + 4, { width: pageWidth * 0.6 })
        doc.fontSize(9).font('Helvetica').fillColor(isDiscount ? '#27ae60' : '#333333')
        txt(doc, `${isDiscount ? '-' : ''}${currencySymbol} ${fmt(value)}`, MARGIN + pageWidth * 0.6, rowY + 4, { width: pageWidth * 0.35, align: 'right' })
        rowY += 18
      }

      // Separator + Total
      doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(MARGIN, rowY).lineTo(MARGIN + pageWidth, rowY).stroke()
      rowY += 4
      doc.rect(MARGIN, rowY, pageWidth, 24).fill(ACCENT_COLOR)
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
      txt(doc, 'TOTAL A PAGAR', MARGIN + 10, rowY + 6, { width: pageWidth * 0.6 })
      txt(doc, `${currencySymbol} ${fmt(receipt.totalAmount)}`, MARGIN + pageWidth * 0.6, rowY + 6, { width: pageWidth * 0.35, align: 'right' })

      doc.fillColor('#000000')
      doc.y = rowY + 35

      // ─── Footer ───
      const pageBottom = (doc.page.height as number) - MARGIN
      const footerY = Math.max(doc.y + 10, pageBottom - 50)
      doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(MARGIN, footerY).lineTo(MARGIN + pageWidth, footerY).stroke()

      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#999999')
      txt(doc, 'Este recibo es un documento informativo generado automáticamente. Para cualquier consulta, contacte a la administración del condominio.', MARGIN, footerY + 8, { width: pageWidth, align: 'center' })

      if ((condominium as Record<string, unknown>).address) {
        txt(doc, (condominium as Record<string, unknown>).address as string, MARGIN, footerY + 22, { width: pageWidth, align: 'center' })
      }

      const now = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })
      txt(doc, `Documento generado el ${now}`, MARGIN, footerY + 36, { width: pageWidth, align: 'center' })

      doc.end()
      const buffer = await bufferPromise

      return success({
        data: buffer,
        filename: `recibo_${sanitize(String(condominium.name))}_${sanitize(String(unit.unitNumber))}_${monthName}_${receipt.periodYear}.pdf`,
        contentType: 'application/pdf',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generando PDF del recibo'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
