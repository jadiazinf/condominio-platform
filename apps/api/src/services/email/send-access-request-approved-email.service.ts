import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, p } from './email-template'

export interface ISendAccessRequestApprovedEmailInput {
  to: string
  recipientName: string
  condominiumName: string
  buildingName: string
  unitNumber: string
}

export interface ISendAccessRequestApprovedEmailResult {
  emailId: string
}

export class SendAccessRequestApprovedEmailService implements IService<
  ISendAccessRequestApprovedEmailInput,
  TServiceResult<ISendAccessRequestApprovedEmailResult>
> {
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendAccessRequestApprovedEmailInput
  ): Promise<TServiceResult<ISendAccessRequestApprovedEmailResult>> {
    const { to, recipientName, condominiumName, buildingName, unitNumber } = input

    const dashboardLink = `${env.APP_URL}/api/refresh-session`
    const subject = 'Tu solicitud de acceso ha sido aprobada'

    const infoCardHtml = `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Condominio</span>
                      <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #18181b;">${condominiumName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width: 50%; padding-top: 12px;">
                            <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Edificio</span>
                            <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${buildingName}</p>
                          </td>
                          <td style="width: 50%; padding-top: 12px;">
                            <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Unidad</span>
                            <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${unitNumber}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>`

    const template = {
      title: subject,
      headerIcon: { symbol: '✓', color: '#16a34a' },
      headerTitle: 'Solicitud aprobada',
      greeting: recipientName,
      bodyHtml: [
        p(
          'Tu solicitud de acceso al condominio ha sido <strong style="color: #16a34a;">aprobada</strong>. Ya puedes acceder a tu unidad y a todas las funciones del condominio.'
        ),
        `<p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">Haz clic en el botón de abajo para acceder a tu dashboard con la información actualizada. Si ya tienes la app abierta, cierra sesión e inicia sesión nuevamente para ver los cambios.</p>`,
        infoCardHtml,
      ].join('\n'),
      bodyText: `Tu solicitud de acceso al condominio ha sido APROBADA.\n\nDETALLES\n--------\nCondominio: ${condominiumName}\nEdificio: ${buildingName}\nUnidad: ${unitNumber}\n\nPara acceder a tu dashboard, visita el enlace.\nSi ya tienes la app abierta, cierra sesión e inicia sesión nuevamente para ver los cambios.`,
      cta: { label: 'Acceder al Dashboard', url: dashboardLink, color: '#16a34a' },
      footerNote: 'Este es un mensaje automático. No es necesario responder.',
    }

    logger.info({ to, condominiumName, unitNumber }, 'Sending access request approved email')

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
