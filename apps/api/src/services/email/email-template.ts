/**
 * Shared email template builder.
 * All email services use this to generate consistent HTML and plain text emails.
 */

export interface IEmailTemplateParams {
  title: string
  headerIcon: { symbol: string; color: string }
  headerTitle: string
  greeting: string
  bodyHtml: string
  bodyText: string
  cta?: { label: string; url: string; color: string }
  expiration?: string
  footerNote: string
}

export function buildEmailHtml(params: IEmailTemplateParams): string {
  const { title, headerIcon, headerTitle, greeting, bodyHtml, cta, expiration, footerNote } = params

  const ctaHtml = cta
    ? `
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${cta.url}"
                       style="display: inline-block; padding: 16px 32px; background-color: ${cta.color}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                      ${cta.label}
                    </a>
                  </td>
                </tr>
              </table>`
    : ''

  const expirationHtml = expiration
    ? `
              <!-- Expiration Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>Importante:</strong> ${expiration}
                </p>
              </div>`
    : ''

  const altLinkHtml = cta
    ? `
              <!-- Alternative Link -->
              <p style="margin: 0 0 10px; font-size: 14px; color: #71717a;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${cta.url}" style="color: ${cta.color};">${cta.url}</a>
              </p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="width: 64px; height: 64px; background-color: ${headerIcon.color}; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px; font-weight: bold;">${headerIcon.symbol}</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                ${headerTitle}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Hola <strong>${greeting}</strong>,
              </p>

              ${bodyHtml}
${ctaHtml}
${expirationHtml}
${altLinkHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; text-align: center;">
                ${footerNote}
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                &copy; ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export function buildEmailText(params: IEmailTemplateParams): string {
  const { headerTitle, greeting, bodyText, cta, expiration, footerNote } = params

  const ctaText = cta ? `\n${cta.url}\n` : ''
  const expirationText = expiration ? `\nIMPORTANTE: ${expiration}\n` : ''

  return `
${headerTitle.toUpperCase()}

Hola ${greeting},

${bodyText}
${ctaText}${expirationText}
${footerNote}

---
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function translateBillingCycle(cycle: string): string {
  const translations: Record<string, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semi_annual: 'Semestral',
    annual: 'Anual',
    custom: 'Personalizado',
  }
  return translations[cycle] || cycle
}

export function formatDateES(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function p(text: string): string {
  return `<p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">${text}</p>`
}
