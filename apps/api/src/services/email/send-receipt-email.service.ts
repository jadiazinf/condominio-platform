import type { TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, p } from './email-template'

export interface IReceiptBreakdownItem {
  label: string
  amount: string
  sub?: boolean
}

export interface IReceiptAmountSummary {
  ordinary: string
  extraordinary: string
  reserveFund: string
  interest: string
  fines: string
  previousBalance: string
}

export interface ISendReceiptEmailInput {
  to: string
  recipientName: string
  condominiumName: string
  receiptNumber: string
  periodLabel: string
  totalAmount: string
  currencySymbol: string
  breakdown?: IReceiptBreakdownItem[]
  amounts?: IReceiptAmountSummary
  pdfBuffer?: Buffer
}

export interface ISendReceiptEmailResult {
  emailId: string
}

function buildBreakdownHtml(items: IReceiptBreakdownItem[], currencySymbol: string): string {
  if (items.length === 0) return ''

  const rows = items
    .map(item => {
      const padding = item.sub ? '6px 8px 6px 24px' : '6px 8px'
      const fontSize = item.sub ? '12px' : '13px'
      const color = item.sub ? '#64748b' : '#334155'
      const fontWeight = item.sub ? 'normal' : '600'
      return `
        <tr>
          <td style="font-size: ${fontSize}; color: ${color}; font-weight: ${fontWeight}; padding: ${padding}; border-bottom: 1px solid #e2e8f0;">${item.label}</td>
          <td style="font-size: ${fontSize}; color: ${color}; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${currencySymbol} ${item.amount}</td>
        </tr>`
    })
    .join('\n')

  return `
    <div style="margin-bottom: 20px;">
      <p style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Desglose del Período:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="font-size: 12px; color: #64748b; padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Concepto</th>
            <th style="font-size: 12px; color: #64748b; padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`
}

function buildAmountsSummaryHtml(
  amounts: IReceiptAmountSummary,
  totalAmount: string,
  currencySymbol: string
): string {
  const rows = [
    { label: 'Cuota Ordinaria', value: amounts.ordinary },
    { label: 'Cuota Extraordinaria', value: amounts.extraordinary },
    { label: 'Fondo de Reserva', value: amounts.reserveFund },
    { label: 'Intereses', value: amounts.interest },
    { label: 'Multas', value: amounts.fines },
    { label: 'Saldo Anterior', value: amounts.previousBalance },
  ]
    .filter(r => parseFloat(r.value) > 0)
    .map(
      r => `
        <tr>
          <td style="font-size: 13px; color: #64748b; padding: 4px 8px;">${r.label}</td>
          <td style="font-size: 13px; color: #334155; padding: 4px 8px; text-align: right;">${currencySymbol} ${r.value}</td>
        </tr>`
    )
    .join('\n')

  return `
    <div style="margin-bottom: 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        <tbody>
          ${rows}
          <tr>
            <td colspan="2" style="border-top: 2px solid #e2e8f0; padding-top: 8px;"></td>
          </tr>
          <tr>
            <td style="font-size: 15px; font-weight: 700; color: #1e293b; padding: 4px 8px;">Total a Pagar</td>
            <td style="font-size: 15px; font-weight: 700; color: #2563eb; padding: 4px 8px; text-align: right;">${currencySymbol} ${totalAmount}</td>
          </tr>
        </tbody>
      </table>
    </div>`
}

function buildBreakdownText(items: IReceiptBreakdownItem[], currencySymbol: string): string {
  if (items.length === 0) return ''

  const lines = items.map(
    item => `  ${item.sub ? '  ' : ''}- ${item.label}: ${currencySymbol} ${item.amount}`
  )

  return ['', 'Desglose del Período:', ...lines, ''].join('\n')
}

function buildAmountsSummaryText(
  amounts: IReceiptAmountSummary,
  totalAmount: string,
  currencySymbol: string
): string {
  const rows = [
    { label: 'Cuota Ordinaria', value: amounts.ordinary },
    { label: 'Cuota Extraordinaria', value: amounts.extraordinary },
    { label: 'Fondo de Reserva', value: amounts.reserveFund },
    { label: 'Intereses', value: amounts.interest },
    { label: 'Multas', value: amounts.fines },
    { label: 'Saldo Anterior', value: amounts.previousBalance },
  ]
    .filter(r => parseFloat(r.value) > 0)
    .map(r => `  ${r.label}: ${currencySymbol} ${r.value}`)

  return ['', 'Resumen de Montos:', ...rows, `  TOTAL: ${currencySymbol} ${totalAmount}`, ''].join(
    '\n'
  )
}

export class SendReceiptEmailService {
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(input: ISendReceiptEmailInput): Promise<TServiceResult<ISendReceiptEmailResult>> {
    const {
      to,
      recipientName,
      condominiumName,
      receiptNumber,
      periodLabel,
      totalAmount,
      currencySymbol,
      breakdown,
      amounts,
    } = input

    const subject = `Recibo de Condominio ${receiptNumber} — ${periodLabel}`

    const breakdownHtml = breakdown?.length ? buildBreakdownHtml(breakdown, currencySymbol) : ''
    const breakdownText = breakdown?.length ? buildBreakdownText(breakdown, currencySymbol) : ''
    const amountsSummaryHtml = amounts
      ? buildAmountsSummaryHtml(amounts, totalAmount, currencySymbol)
      : ''
    const amountsSummaryText = amounts
      ? buildAmountsSummaryText(amounts, totalAmount, currencySymbol)
      : ''

    const template = {
      title: subject,
      headerIcon: { symbol: '📄', color: '#2c3e50' },
      headerTitle: 'Recibo de Condominio',
      greeting: recipientName,
      bodyHtml: [
        p(
          `Se ha generado su recibo de condominio para el período <strong>${periodLabel}</strong> en <strong style="color: #006FEE;">${condominiumName}</strong>.`
        ),
        `<div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Recibo N°</td>
              <td style="font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; padding-bottom: 8px;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Período</td>
              <td style="font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; padding-bottom: 8px;">${periodLabel}</td>
            </tr>
          </table>
        </div>`,
        breakdownHtml,
        amountsSummaryHtml,
        p('Puede consultar el detalle completo de su recibo ingresando a la plataforma.'),
      ].join('\n'),
      bodyText: [
        `Se ha generado su recibo de condominio para el período ${periodLabel} en ${condominiumName}.`,
        '',
        `Recibo N°: ${receiptNumber}`,
        `Período: ${periodLabel}`,
        breakdownText,
        amountsSummaryText,
        'Puede consultar el detalle completo de su recibo ingresando a la plataforma.',
      ].join('\n'),
      footerNote:
        'Este es un correo automático generado por el sistema de administración de condominios. Si tiene alguna consulta, contacte a su administrador.',
    }

    const html = buildEmailHtml(template)
    const text = buildEmailText(template)

    const emailResult = await this.emailService.execute({
      to,
      subject,
      html,
      text,
    })

    if (!emailResult.success) {
      return failure(emailResult.error, emailResult.code)
    }

    return success({ emailId: emailResult.data.id })
  }
}
