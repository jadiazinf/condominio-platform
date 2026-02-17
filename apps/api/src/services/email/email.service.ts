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
 * Uses singleton pattern to avoid creating multiple Resend client instances.
 */
export class EmailService implements IService<ISendEmailInput, TServiceResult<ISendEmailResult>> {
  private static instance: EmailService | null = null
  private resend: Resend | null = null

  private constructor() {
    // Use env.RESEND_API_KEY or fallback to Bun.env directly (Railway compatibility)
    const apiKey = env.RESEND_API_KEY || Bun.env.RESEND_API_KEY

    if (apiKey) {
      this.resend = new Resend(apiKey)
      logger.info('EmailService: Resend client initialized')
    } else {
      logger.warn(
        { nodeEnv: env.NODE_ENV, hasEnvKey: !!env.RESEND_API_KEY },
        'EmailService: RESEND_API_KEY not configured'
      )
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
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
