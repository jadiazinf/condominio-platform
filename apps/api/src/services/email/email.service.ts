import { Resend } from 'resend'
import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'

export interface ISendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface ISendEmailResult {
  id: string
}

/**
 * Service for sending emails using Resend.
 */
export class EmailService implements IService<ISendEmailInput, TServiceResult<ISendEmailResult>> {
  private resend: Resend | null = null

  constructor() {
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY)
    }
  }

  async execute(input: ISendEmailInput): Promise<TServiceResult<ISendEmailResult>> {
    const { to, subject, html, text, replyTo } = input

    // If Resend is not configured, log and return success (for development)
    if (!this.resend) {
      logger.warn({ to, subject }, 'Resend API key not configured. Email not sent.')

      // In development, we can still "succeed" without actually sending
      if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
        return success({ id: `dev-${Date.now()}` })
      }

      return failure('Email service not configured', 'INTERNAL_ERROR')
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: env.RESEND_FROM_EMAIL || 'Condominio App <noreply@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        replyTo,
      })

      if (error) {
        logger.error({ err: error.message, to, subject }, 'Failed to send email via Resend')
        return failure(`Failed to send email: ${error.message}`, 'INTERNAL_ERROR')
      }

      logger.info({ id: data?.id, to, subject }, 'Email sent successfully')

      return success({ id: data?.id || '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error({ err: message, to, subject }, 'Error sending email')
      return failure(`Error sending email: ${message}`, 'INTERNAL_ERROR')
    }
  }
}
