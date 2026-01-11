import type { TNotificationTemplate } from '@packages/domain'
import type { NotificationTemplatesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetTemplateByCodeInput {
  code: string
}

export type IGetTemplateByCodeOutput = TNotificationTemplate

export class GetTemplateByCodeService {
  constructor(private readonly repository: NotificationTemplatesRepository) {}

  async execute(input: IGetTemplateByCodeInput): Promise<TServiceResult<IGetTemplateByCodeOutput>> {
    const template = await this.repository.getByCode(input.code)

    if (!template) {
      return failure('Notification template not found', 'NOT_FOUND')
    }

    return success(template)
  }
}
