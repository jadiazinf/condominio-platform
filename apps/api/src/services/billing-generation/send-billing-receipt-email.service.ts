import { type TServiceResult, success, failure } from '@packages/services'
import type {
  BillingReceiptsRepository,
  CondominiumsRepository,
  UnitsRepository,
  UnitOwnershipsRepository,
  CurrenciesRepository,
} from '@packages/database'
import { SendReceiptEmailService } from '../email/send-receipt-email.service'
import { GenerateBillingReceiptPdfService } from './generate-billing-receipt-pdf.service'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export class SendBillingReceiptEmailService {
  constructor(
    private readonly receiptsRepo: BillingReceiptsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly unitOwnershipsRepo: UnitOwnershipsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
    private readonly emailService: SendReceiptEmailService,
    private readonly pdfService?: GenerateBillingReceiptPdfService,
  ) {}

  async execute(receiptId: string): Promise<TServiceResult<{ emailsSent: number }>> {
    const receipt = await this.receiptsRepo.getById(receiptId)
    if (!receipt) return failure('Recibo no encontrado', 'NOT_FOUND')

    const condominium = await this.condominiumsRepo.getById(receipt.condominiumId)
    if (!condominium) return failure('Condominio no encontrado', 'NOT_FOUND')

    const currency = await this.currenciesRepo.getById(receipt.currencyId)
    const currencySymbol = String(currency?.symbol ?? '')

    const periodLabel = `${MONTH_NAMES[receipt.periodMonth - 1]} ${receipt.periodYear}`

    // Get unit owners' emails
    const ownerships = await this.unitOwnershipsRepo.getByUnitId(receipt.unitId)
    const ownerEmails = ownerships
      .filter(o => o.email && (o.ownershipType === 'owner' || o.ownershipType === 'co-owner'))
      .map(o => ({ email: o.email!, name: o.fullName ?? o.email! }))

    if (ownerEmails.length === 0) {
      return failure('No se encontraron propietarios con email para esta unidad', 'NOT_FOUND')
    }

    // Generate PDF if service available
    let pdfBuffer: Buffer | undefined
    if (this.pdfService) {
      const pdfResult = await this.pdfService.execute(receiptId)
      if (pdfResult.success) {
        pdfBuffer = pdfResult.data.data
      }
    }

    // Build amounts in the format expected by the email service
    const amounts = {
      ordinary: receipt.subtotal ?? '0',
      extraordinary: '0',
      reserveFund: receipt.reserveFundAmount ?? '0',
      interest: receipt.interestAmount ?? '0',
      fines: receipt.lateFeeAmount ?? '0',
      previousBalance: receipt.previousBalance ?? '0',
    }

    let emailsSent = 0
    for (const { email, name } of ownerEmails) {
      const result = await this.emailService.execute({
        to: email,
        recipientName: name,
        condominiumName: String(condominium.name),
        receiptNumber: receipt.receiptNumber,
        periodLabel,
        totalAmount: receipt.totalAmount,
        currencySymbol,
        amounts,
        pdfBuffer,
      })

      if (result.success) emailsSent++
    }

    return success({ emailsSent })
  }
}
