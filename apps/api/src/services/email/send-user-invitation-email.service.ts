import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, formatDateES, p } from './email-template'

export interface ISendUserInvitationEmailInput {
  to: string
  recipientName: string
  condominiumName: string | null
  unitIdentifier?: string | null
  roleName: string
  invitationToken: string
  expiresAt: Date
  inviterName?: string
  inviterEmail?: string
  managementCompanyName?: string
  managementCompanyContact?: string
}

export interface ISendUserInvitationEmailResult {
  emailId: string
}

export class SendUserInvitationEmailService
  implements IService<ISendUserInvitationEmailInput, TServiceResult<ISendUserInvitationEmailResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendUserInvitationEmailInput
  ): Promise<TServiceResult<ISendUserInvitationEmailResult>> {
    const { to, recipientName, condominiumName, unitIdentifier, roleName, invitationToken, expiresAt } = input

    const invitationLink = `${env.APP_URL}/accept-user-invitation?token=${invitationToken}`
    const expiresAtFormatted = formatDateES(expiresAt)

    let contextHtml: string
    let contextPlain: string
    if (condominiumName && unitIdentifier) {
      contextHtml = `el condominio <strong style="color: #006FEE;">${condominiumName}</strong> (Unidad: <strong>${unitIdentifier}</strong>)`
      contextPlain = `el condominio ${condominiumName} (Unidad: ${unitIdentifier})`
    } else if (condominiumName) {
      contextHtml = `el condominio <strong style="color: #006FEE;">${condominiumName}</strong>`
      contextPlain = `el condominio ${condominiumName}`
    } else {
      contextHtml = 'la plataforma'
      contextPlain = 'la plataforma'
    }

    const subject = condominiumName
      ? `Invitación para unirte a ${condominiumName}`
      : `Invitación para unirte a la plataforma`

    const template = {
      title: 'Invitación',
      headerIcon: { symbol: 'C', color: '#006FEE' },
      headerTitle: 'Has sido invitado',
      greeting: recipientName,
      bodyHtml: [
        p(`Has sido invitado a unirte a ${contextHtml} como <strong>${roleName}</strong>.`),
        p('Haz clic en el siguiente botón para aceptar la invitación y crear tu cuenta:'),
      ].join('\n'),
      bodyText: `Has sido invitado a unirte a ${contextPlain} como ${roleName}.\n\nPara aceptar la invitación y crear tu cuenta, visita el siguiente enlace:`,
      cta: { label: 'Aceptar invitación', url: invitationLink, color: '#006FEE' },
      expiration: `Esta invitación expira el ${expiresAtFormatted}.`,
      footerNote: 'Si no esperabas esta invitación, puedes ignorar este correo.',
    }

    logger.info({ to, condominiumName, roleName, expiresAt: expiresAtFormatted }, 'Sending user invitation email')

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
