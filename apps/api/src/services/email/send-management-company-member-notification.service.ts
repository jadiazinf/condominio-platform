import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, p } from './email-template'

export interface ISendManagementCompanyMemberNotificationInput {
  to: string
  companyName: string
  newMemberName: string
  newMemberEmail: string
  memberRole: string
}

export interface ISendManagementCompanyMemberNotificationResult {
  emailId: string
}

export class SendManagementCompanyMemberNotificationService
  implements IService<ISendManagementCompanyMemberNotificationInput, TServiceResult<ISendManagementCompanyMemberNotificationResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendManagementCompanyMemberNotificationInput
  ): Promise<TServiceResult<ISendManagementCompanyMemberNotificationResult>> {
    const { to, companyName, newMemberName, newMemberEmail, memberRole } = input

    const subject = `Nuevo miembro agregado a ${companyName}`

    const memberCardHtml = `
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding-bottom: 12px;"><p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Nombre</p><p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${newMemberName}</p></td></tr>
                  <tr><td style="padding-bottom: 12px;"><p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Email</p><p style="margin: 4px 0 0; font-size: 16px; color: #18181b;"><a href="mailto:${newMemberEmail}" style="color: #006FEE; text-decoration: none;">${newMemberEmail}</a></p></td></tr>
                  <tr><td><p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Rol</p><p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${memberRole}</p></td></tr>
                </table>
              </div>`

    const template = {
      title: 'Nuevo miembro agregado',
      headerIcon: { symbol: '✓', color: '#17c964' },
      headerTitle: 'Nuevo miembro agregado',
      greeting: companyName,
      bodyHtml: [
        p(`Se ha agregado un nuevo miembro al equipo de <strong style="color: #006FEE;">${companyName}</strong>.`),
        memberCardHtml,
        `<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">El nuevo miembro recibirá un correo de invitación para completar su registro en la plataforma.</p>`,
      ].join('\n'),
      bodyText: `Se ha agregado un nuevo miembro al equipo:\n\nNombre: ${newMemberName}\nEmail: ${newMemberEmail}\nRol: ${memberRole}\n\nEl nuevo miembro recibirá un correo de invitación para completar su registro en la plataforma.`,
      footerNote: '',
    }

    logger.info({ to, companyName, newMemberEmail, memberRole }, 'Sending management company member notification email')

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
