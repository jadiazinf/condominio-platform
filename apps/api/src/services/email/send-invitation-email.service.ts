import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, formatDateES, p } from './email-template'

export interface ISendInvitationEmailInput {
  to: string
  recipientName: string
  companyName: string
  invitationToken: string
  expiresAt: Date
}

export interface ISendInvitationEmailResult {
  emailId: string
}

export class SendInvitationEmailService
  implements IService<ISendInvitationEmailInput, TServiceResult<ISendInvitationEmailResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendInvitationEmailInput
  ): Promise<TServiceResult<ISendInvitationEmailResult>> {
    const { to, recipientName, companyName, invitationToken, expiresAt } = input

    const invitationLink = `${env.APP_URL}/accept-invitation?token=${invitationToken}`
    const expiresAtFormatted = formatDateES(expiresAt)
    const subject = `Invitación para administrar ${companyName}`

    const template = {
      title: subject,
      headerIcon: { symbol: 'C', color: '#006FEE' },
      headerTitle: 'Has sido invitado',
      greeting: recipientName,
      bodyHtml: [
        p(`Has sido invitado a administrar <strong style="color: #006FEE;">${companyName}</strong> en nuestra plataforma de gestión de condominios.`),
        p('Haz clic en el siguiente botón para aceptar la invitación y crear tu cuenta:'),
      ].join('\n'),
      bodyText: `Has sido invitado a administrar ${companyName} en nuestra plataforma de gestión de condominios.\n\nPara aceptar la invitación y crear tu cuenta, visita el siguiente enlace:`,
      cta: { label: 'Aceptar invitación', url: invitationLink, color: '#006FEE' },
      expiration: `Esta invitación expira el ${expiresAtFormatted}.`,
      footerNote: 'Si no esperabas esta invitación, puedes ignorar este correo.',
    }

    logger.info({ to, companyName, expiresAt: expiresAtFormatted }, 'Sending invitation email')

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
