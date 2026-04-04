import PDFDocument from 'pdfkit'
import { type TServiceResult, success, failure } from '@packages/services'
import type {
  PaymentsRepository,
  PaymentAllocationsV2Repository,
  ChargesRepository,
  UnitsRepository,
  BuildingsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
} from '@packages/database'

export interface IPaymentReceiptPdfOutput {
  data: Buffer
  filename: string
  contentType: string
}

const MARGIN = 40
const HEADER_BG = '#27ae60'
const LIGHT_BG = '#f8f9fa'

function fmt(amount: string | number | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function txt(doc: PDFKit.PDFDocument, str: string, x: number, y: number, opts?: PDFKit.Mixins.TextOptions) {
  doc.text(str, x, y, { lineBreak: false, ...opts })
}

export class GenerateBillingPaymentReceiptPdfService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly allocationsRepo: PaymentAllocationsV2Repository,
    private readonly chargesRepo: ChargesRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly buildingsRepo: BuildingsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
  ) {}

  async execute(paymentId: string): Promise<TServiceResult<IPaymentReceiptPdfOutput>> {
    try {
      const payment = await this.paymentsRepo.getById(paymentId)
      if (!payment) return failure('Pago no encontrado', 'NOT_FOUND')

      const unit = await this.unitsRepo.getById(payment.unitId)
      if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')

      const building = unit.buildingId ? await this.buildingsRepo.getById(unit.buildingId) : null

      const currency = await this.currenciesRepo.getById(payment.currencyId)
      const currencySymbol = String(currency?.symbol ?? '')

      // Get allocations to show which charges this payment covered
      const allocations = await this.allocationsRepo.findByPayment(paymentId)

      const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: MARGIN })
      const chunks: Uint8Array[] = []
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
      const bufferPromise = new Promise<Buffer>(resolve => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
      })

      const pageWidth = (doc.page.width as number) - MARGIN * 2

      // Header
      doc.rect(MARGIN, MARGIN, pageWidth, 50).fill(HEADER_BG)
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
      txt(doc, 'COMPROBANTE DE PAGO', MARGIN + 15, MARGIN + 10, { width: pageWidth - 30 })
      doc.fontSize(10).font('Helvetica').fillColor('#e0e0e0')
      txt(doc, `N° ${payment.paymentNumber ?? paymentId.slice(0, 8)}`, MARGIN + 15, MARGIN + 30, { width: pageWidth - 30 })
      doc.fillColor('#000000')
      doc.y = MARGIN + 60

      // Payment info
      const iy = doc.y + 10
      doc.rect(MARGIN, iy, pageWidth, 70).fill(LIGHT_BG).stroke('#dee2e6')

      doc.fontSize(9).font('Helvetica').fillColor('#666666')
      txt(doc, 'UNIDAD', MARGIN + 15, iy + 6)
      txt(doc, 'FECHA', MARGIN + pageWidth / 3, iy + 6)
      txt(doc, 'MÉTODO', MARGIN + (pageWidth * 2) / 3, iy + 6)

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
      txt(doc, `${String(building?.name ?? '')} ${String(unit.unitNumber ?? '')}`.trim(), MARGIN + 15, iy + 20)
      txt(doc, payment.paymentDate, MARGIN + pageWidth / 3, iy + 20)
      txt(doc, payment.paymentMethod, MARGIN + (pageWidth * 2) / 3, iy + 20)

      doc.fontSize(9).font('Helvetica').fillColor('#666666')
      txt(doc, 'ESTADO', MARGIN + 15, iy + 40)
      txt(doc, 'REFERENCIA', MARGIN + pageWidth / 3, iy + 40)

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
      txt(doc, payment.status, MARGIN + 15, iy + 54)
      txt(doc, payment.receiptNumber ?? '—', MARGIN + pageWidth / 3, iy + 54)

      doc.fillColor('#000000')
      doc.y = iy + 80

      // Allocations table
      if (allocations.length > 0) {
        const ty = doc.y + 5
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
        txt(doc, 'CARGOS CUBIERTOS', MARGIN, ty)

        let tableY = ty + 20
        doc.rect(MARGIN, tableY, pageWidth, 22).fill('#2c3e50')
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
        txt(doc, 'CARGO', MARGIN + 6, tableY + 6, { width: pageWidth * 0.6 })
        txt(doc, 'MONTO APLICADO', MARGIN + pageWidth * 0.6 + 6, tableY + 6, { width: pageWidth * 0.35, align: 'right' })
        tableY += 22

        for (let i = 0; i < allocations.length; i++) {
          const alloc = allocations[i]!
          const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_BG
          doc.rect(MARGIN, tableY, pageWidth, 20).fill(bgColor)

          const charge = await this.chargesRepo.getById(alloc.chargeId)
          const desc = charge?.description ?? `Cargo ${alloc.chargeId.slice(0, 8)}`

          doc.fontSize(9).font('Helvetica').fillColor('#333333')
          txt(doc, desc, MARGIN + 6, tableY + 5, { width: pageWidth * 0.6 })
          txt(doc, `${currencySymbol} ${fmt(alloc.allocatedAmount)}`, MARGIN + pageWidth * 0.6 + 6, tableY + 5, { width: pageWidth * 0.35, align: 'right' })
          tableY += 20
        }

        doc.fillColor('#000000')
        doc.y = tableY + 5
      }

      // Total
      const totalY = doc.y + 10
      doc.rect(MARGIN, totalY, pageWidth, 30).fill(HEADER_BG)
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
      txt(doc, 'TOTAL PAGADO', MARGIN + 10, totalY + 8, { width: pageWidth * 0.6 })
      txt(doc, `${currencySymbol} ${fmt(payment.amount)}`, MARGIN + pageWidth * 0.6, totalY + 8, { width: pageWidth * 0.35, align: 'right' })

      doc.fillColor('#000000')
      doc.y = totalY + 50

      // Footer
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#999999')
      txt(doc, 'Este comprobante es un documento informativo generado automáticamente.', MARGIN, doc.y, { width: pageWidth, align: 'center' })

      doc.end()
      const buffer = await bufferPromise

      return success({
        data: buffer,
        filename: `comprobante-pago-${payment.paymentNumber ?? paymentId.slice(0, 8)}.pdf`,
        contentType: 'application/pdf',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generando PDF del comprobante'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
