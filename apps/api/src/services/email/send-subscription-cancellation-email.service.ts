import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, formatCurrency, translateBillingCycle, p } from './email-template'

export interface ISendSubscriptionCancellationEmailInput {
  to: string | string[]
  recipientName: string
  companyName: string
  subscriptionName: string
  basePrice: number
  billingCycle: string
  cancelledByName: string
  cancellationReason?: string
  cancelledAt: Date
}

export interface ISendSubscriptionCancellationEmailResult {
  emailId: string
}

export class SendSubscriptionCancellationEmailService
  implements IService<ISendSubscriptionCancellationEmailInput, TServiceResult<ISendSubscriptionCancellationEmailResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendSubscriptionCancellationEmailInput
  ): Promise<TServiceResult<ISendSubscriptionCancellationEmailResult>> {
    const {
      to, recipientName, companyName, subscriptionName, basePrice,
      billingCycle, cancelledByName, cancellationReason, cancelledAt,
    } = input

    const cancelledAtFormatted = cancelledAt.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const billingCycleTranslated = translateBillingCycle(billingCycle)
    const subject = `Suscripción cancelada - ${companyName}`

    const alertHtml = `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>Acción realizada:</strong> La suscripción ha sido cancelada y no se renovará automáticamente.
                </p>
              </div>`

    const reasonRow = cancellationReason
      ? `<tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Motivo:</td><td style="padding: 8px 0; color: #18181b;">${cancellationReason}</td></tr>`
      : ''

    const detailsHtml = `
              <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #18181b;">Detalles de la suscripción cancelada</h3>
                <table style="width: 100%;">
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Plan:</td><td style="padding: 8px 0; color: #18181b;">${subscriptionName || 'Plan personalizado'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Precio:</td><td style="padding: 8px 0; color: #18181b;">${formatCurrency(basePrice)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Ciclo de facturación:</td><td style="padding: 8px 0; color: #18181b;">${billingCycleTranslated}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Cancelada por:</td><td style="padding: 8px 0; color: #18181b;">${cancelledByName}</td></tr>
                  <tr><td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Fecha de cancelación:</td><td style="padding: 8px 0; color: #18181b;">${cancelledAtFormatted}</td></tr>
                  ${reasonRow}
                </table>
              </div>`

    const reasonText = cancellationReason ? `Motivo: ${cancellationReason}\n` : ''

    const template = {
      title: subject,
      headerIcon: { symbol: '!', color: '#ef4444' },
      headerTitle: 'Suscripción Cancelada',
      greeting: recipientName,
      bodyHtml: [
        p(`Te informamos que la suscripción de <strong style="color: #ef4444;">${companyName}</strong> ha sido cancelada.`),
        alertHtml,
        detailsHtml,
        `<p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">Si tienes alguna pregunta sobre esta cancelación o necesitas reactivar la suscripción, por favor contacta al equipo de soporte.</p>`,
      ].join('\n'),
      bodyText: `Te informamos que la suscripción de ${companyName} ha sido cancelada.\n\nDETALLES DE LA SUSCRIPCIÓN CANCELADA\n------------------------------------\nPlan: ${subscriptionName || 'Plan personalizado'}\nPrecio: ${formatCurrency(basePrice)}\nCiclo de facturación: ${billingCycleTranslated}\nCancelada por: ${cancelledByName}\nFecha de cancelación: ${cancelledAtFormatted}\n${reasonText}\nSi tienes alguna pregunta sobre esta cancelación, contacta al equipo de soporte.`,
      footerNote: 'Este es un correo automático de notificación. Por favor no respondas a este mensaje.',
    }

    logger.info({ to, companyName, cancelledAt: cancelledAtFormatted }, 'Sending subscription cancellation email')

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
}
