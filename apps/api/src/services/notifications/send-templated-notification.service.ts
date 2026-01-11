import type { TNotification, TNotificationTemplate } from '@packages/domain'
import type {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  NotificationTemplatesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { SendNotificationService } from './send-notification.service'

export interface ISendTemplatedNotificationInput {
  userId: string
  templateCode: string
  variables: Record<string, string>
  data?: Record<string, unknown>
  expiresAt?: Date
}

export interface ISendTemplatedNotificationOutput {
  notification: TNotification
  deliveryIds: string[]
  pushResult?: {
    successCount: number
    failureCount: number
  }
}

export class SendTemplatedNotificationService {
  private readonly sendNotificationService: SendNotificationService

  constructor(
    private readonly templatesRepository: NotificationTemplatesRepository,
    notificationsRepository: NotificationsRepository,
    deliveriesRepository: NotificationDeliveriesRepository,
    preferencesRepository: UserNotificationPreferencesRepository,
    fcmTokensRepository?: UserFcmTokensRepository
  ) {
    this.sendNotificationService = new SendNotificationService(
      notificationsRepository,
      deliveriesRepository,
      preferencesRepository,
      fcmTokensRepository
    )
  }

  async execute(
    input: ISendTemplatedNotificationInput
  ): Promise<TServiceResult<ISendTemplatedNotificationOutput>> {
    const template = await this.templatesRepository.getByCode(input.templateCode)

    if (!template) {
      return failure('Notification template not found', 'NOT_FOUND')
    }

    if (!template.isActive) {
      return failure('Notification template is not active', 'BAD_REQUEST')
    }

    const title = template.subjectTemplate
      ? this.replaceVariables(template.subjectTemplate, input.variables)
      : template.name

    const body = this.replaceVariables(template.bodyTemplate, input.variables)

    const channels = (template.defaultChannels ?? ['in_app']) as Array<'in_app' | 'email' | 'push'>

    const result = await this.sendNotificationService.execute({
      userId: input.userId,
      category: template.category,
      title,
      body,
      templateId: template.id,
      channels,
      data: input.data,
      expiresAt: input.expiresAt,
    })

    return result
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] ?? match
    })
  }
}
