import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import {
  buildEmailHtml,
  buildEmailText,
  formatDateES,
  formatCurrency,
  translateBillingCycle,
  p,
} from './email-template'

export interface ISendSubscriptionAcceptanceEmailInput {
  to: string
  recipientName: string
  companyName: string
  subscriptionName: string
  basePrice: number
  billingCycle: string
  startDate: Date
  pricingDetails?: {
    condominiumCount: number | null
    unitCount: number | null
    condominiumRate: number | null
    unitRate: number | null
    calculatedPrice: number | null
    discountType: string | null
    discountValue: number | null
    discountAmount: number | null
  }
  termsContent: string
  termsVersion: string
  acceptanceToken: string
  expiresAt: Date
}

export interface ISendSubscriptionAcceptanceEmailResult {
  emailId: string
}

export class SendSubscriptionAcceptanceEmailService implements IService<
  ISendSubscriptionAcceptanceEmailInput,
  TServiceResult<ISendSubscriptionAcceptanceEmailResult>
> {
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendSubscriptionAcceptanceEmailInput
  ): Promise<TServiceResult<ISendSubscriptionAcceptanceEmailResult>> {
    const {
      to,
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      startDate,
      pricingDetails,
      termsContent,
      termsVersion,
      acceptanceToken,
      expiresAt,
    } = input

    const acceptanceLink = `${env.APP_URL}/accept-subscription?token=${acceptanceToken}`
    const expiresAtFormatted = formatDateES(expiresAt)
    const startDateFormatted = startDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const billingCycleTranslated = translateBillingCycle(billingCycle)
    const subject = `Confirmación de suscripción para ${companyName}`

    const detailsHtml = `
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #1e40af;">Detalles de la suscripción</h3>
                <table style="width: 100%;">
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Plan:</td><td style="padding: 8px 0; color: #18181b;">${subscriptionName || 'Plan personalizado'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Precio:</td><td style="padding: 8px 0; color: #18181b; font-weight: 600;">${formatCurrency(basePrice)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Ciclo de facturación:</td><td style="padding: 8px 0; color: #18181b;">${billingCycleTranslated}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Fecha de inicio:</td><td style="padding: 8px 0; color: #18181b;">${startDateFormatted}</td></tr>
                </table>
              </div>`

    const pricingHtml = this.generatePricingBreakdownHtml(pricingDetails, basePrice)

    const termsHtml = `
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #18181b;">Términos y Condiciones (v${termsVersion})</h3>
                <div style="background-color: #fafafa; border: 1px solid #e4e4e7; padding: 20px; border-radius: 8px; max-height: 300px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                  ${termsContent.replace(/\n/g, '<br>')}
                </div>
              </div>`

    const template = {
      title: subject,
      headerIcon: { symbol: 'C', color: '#006FEE' },
      headerTitle: 'Confirmación de Suscripción',
      greeting: recipientName,
      bodyHtml: [
        p(
          `Se ha creado una nueva suscripción para <strong style="color: #006FEE;">${companyName}</strong>. Por favor revisa los detalles a continuación y acepta los términos y condiciones para activar la suscripción.`
        ),
        detailsHtml,
        pricingHtml,
        termsHtml,
        `<p style="margin: 30px 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">Al hacer clic en el botón a continuación, confirmas que has leído y aceptas los términos y condiciones de la suscripción.</p>`,
      ].join('\n'),
      bodyText: `Se ha creado una nueva suscripción para ${companyName}.\n\nDETALLES DE LA SUSCRIPCIÓN\n--------------------------\nPlan: ${subscriptionName || 'Plan personalizado'}\nPrecio: ${formatCurrency(basePrice)}\nCiclo de facturación: ${billingCycleTranslated}\nFecha de inicio: ${startDateFormatted}\n\nTÉRMINOS Y CONDICIONES (v${termsVersion})\n--------------------------\n${termsContent}\n\nPara aceptar los términos y activar la suscripción, visita el siguiente enlace:`,
      cta: { label: 'Aceptar y activar suscripción', url: acceptanceLink, color: '#22c55e' },
      expiration: `Esta invitación expira el ${expiresAtFormatted}. Si no aceptas antes de esa fecha, la suscripción no será activada.`,
      footerNote: 'Si no solicitaste esta suscripción, puedes ignorar este correo.',
    }

    logger.info(
      { to, companyName, expiresAt: expiresAtFormatted },
      'Sending subscription acceptance email'
    )

    const result = await this.emailService.execute({
      to,
      subject,
      html: buildEmailHtml(template),
      text: buildEmailText(template),
    })

    if (!result.success) {
      return failure(result.error, result.code)
    }

    return success({ emailId: result.data.id })
  }

  private generatePricingBreakdownHtml(
    details: ISendSubscriptionAcceptanceEmailInput['pricingDetails'],
    basePrice?: number
  ): string {
    if (!details) return ''

    let html = `
      <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px; font-size: 16px; color: #18181b;">Desglose del precio:</h3>
        <table style="width: 100%; border-collapse: collapse;">`

    if (details.condominiumCount && details.condominiumRate) {
      html += `<tr><td style="padding: 8px 0; color: #3f3f46;">${details.condominiumCount} condominios × ${formatCurrency(details.condominiumRate)}</td><td style="padding: 8px 0; text-align: right; color: #3f3f46;">${formatCurrency(details.condominiumCount * details.condominiumRate)}</td></tr>`
    }
    if (details.unitCount && details.unitRate) {
      html += `<tr><td style="padding: 8px 0; color: #3f3f46;">${details.unitCount} unidades × ${formatCurrency(details.unitRate)}</td><td style="padding: 8px 0; text-align: right; color: #3f3f46;">${formatCurrency(details.unitCount * details.unitRate)}</td></tr>`
    }
    if (details.calculatedPrice) {
      html += `<tr style="border-top: 1px solid #e4e4e7;"><td style="padding: 12px 0 8px; font-weight: 600; color: #18181b;">Subtotal</td><td style="padding: 12px 0 8px; text-align: right; font-weight: 600; color: #18181b;">${formatCurrency(details.calculatedPrice)}</td></tr>`
    }
    if (details.discountAmount && details.discountAmount > 0) {
      const discountLabel =
        details.discountType === 'percentage'
          ? `Descuento (${details.discountValue}%)`
          : 'Descuento'
      html += `<tr><td style="padding: 8px 0; color: #22c55e;">${discountLabel}</td><td style="padding: 8px 0; text-align: right; color: #22c55e;">-${formatCurrency(details.discountAmount)}</td></tr>`
    }
    if (
      basePrice !== undefined &&
      details.calculatedPrice &&
      basePrice !== details.calculatedPrice
    ) {
      html += `<tr style="border-top: 2px solid #e4e4e7;"><td style="padding: 12px 0 8px; font-weight: 700; font-size: 15px; color: #18181b;">Precio final</td><td style="padding: 12px 0 8px; text-align: right; font-weight: 700; font-size: 15px; color: #18181b;">${formatCurrency(basePrice)}</td></tr>`
    }

    html += `</table></div>`
    return html
  }
}
