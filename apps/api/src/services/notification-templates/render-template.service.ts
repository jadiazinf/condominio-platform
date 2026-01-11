import type { TNotificationTemplate } from '@packages/domain'
import type { NotificationTemplatesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRenderTemplateInput {
  code: string
  variables: Record<string, string>
}

export interface IRenderTemplateOutput {
  subject: string | null
  body: string
}

export class RenderTemplateService {
  constructor(private readonly repository: NotificationTemplatesRepository) {}

  async execute(input: IRenderTemplateInput): Promise<TServiceResult<IRenderTemplateOutput>> {
    const template = await this.repository.getByCode(input.code)

    if (!template) {
      return failure('Notification template not found', 'NOT_FOUND')
    }

    if (!template.isActive) {
      return failure('Notification template is not active', 'BAD_REQUEST')
    }

    const subject = template.subjectTemplate
      ? this.replaceVariables(template.subjectTemplate, input.variables)
      : null

    const body = this.replaceVariables(template.bodyTemplate, input.variables)

    return success({ subject, body })
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] ?? match
    })
  }
}
