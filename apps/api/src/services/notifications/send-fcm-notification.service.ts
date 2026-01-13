import { admin } from '@libs/firebase/config'
import type { Message, MulticastMessage } from 'firebase-admin/messaging'
import type { UserFcmTokensRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@utils/logger'

export interface ISendFcmNotificationInput {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
  priority?: 'high' | 'normal'
}

export interface ISendFcmMulticastInput {
  userIds: string[]
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
  priority?: 'high' | 'normal'
}

export interface ISendFcmNotificationOutput {
  successCount: number
  failureCount: number
  invalidTokens: string[]
}

export class SendFcmNotificationService {
  constructor(private readonly fcmTokensRepository: UserFcmTokensRepository) {}

  /**
   * Sends a push notification to a single user via FCM.
   * Sends to all active devices registered for the user.
   */
  async execute(
    input: ISendFcmNotificationInput
  ): Promise<TServiceResult<ISendFcmNotificationOutput>> {
    const tokens = await this.fcmTokensRepository.getActiveByUserId(input.userId)

    if (tokens.length === 0) {
      return success({
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      })
    }

    const tokenStrings = tokens.map(t => t.token)

    return this.sendToTokens(tokenStrings, input)
  }

  /**
   * Sends a push notification to multiple users via FCM.
   */
  async executeMulticast(
    input: ISendFcmMulticastInput
  ): Promise<TServiceResult<ISendFcmNotificationOutput>> {
    const allTokens: string[] = []

    for (const userId of input.userIds) {
      const userTokens = await this.fcmTokensRepository.getActiveByUserId(userId)
      allTokens.push(...userTokens.map(t => t.token))
    }

    if (allTokens.length === 0) {
      return success({
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      })
    }

    return this.sendToTokens(allTokens, input)
  }

  /**
   * Sends notification directly to specific tokens.
   */
  async sendToTokens(
    tokens: string[],
    input: Omit<ISendFcmNotificationInput, 'userId'>
  ): Promise<TServiceResult<ISendFcmNotificationOutput>> {
    if (tokens.length === 0) {
      return success({
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      })
    }

    try {
      const notification: Message['notification'] = {
        title: input.title,
        body: input.body,
      }

      if (input.imageUrl) {
        notification.imageUrl = input.imageUrl
      }

      const androidConfig: Message['android'] = {
        priority: input.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: 'default',
          priority: input.priority === 'high' ? 'high' : 'default',
        },
      }

      const apnsConfig: Message['apns'] = {
        payload: {
          aps: {
            alert: {
              title: input.title,
              body: input.body,
            },
            sound: 'default',
            badge: 1,
          },
        },
        headers: {
          'apns-priority': input.priority === 'high' ? '10' : '5',
        },
      }

      const webpushConfig: Message['webpush'] = {
        notification: {
          title: input.title,
          body: input.body,
          icon: input.imageUrl,
        },
      }

      // FCM has a limit of 500 tokens per multicast message
      const batchSize = 500
      let totalSuccessCount = 0
      let totalFailureCount = 0
      const invalidTokens: string[] = []

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize)

        const message: MulticastMessage = {
          tokens: batchTokens,
          notification,
          data: input.data,
          android: androidConfig,
          apns: apnsConfig,
          webpush: webpushConfig,
        }

        const response = await admin.messaging().sendEachForMulticast(message)

        totalSuccessCount += response.successCount
        totalFailureCount += response.failureCount

        // Collect invalid tokens for cleanup
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = batchTokens[idx]
            if (!token) return

            const errorCode = resp.error?.code
            // These error codes indicate the token is invalid and should be removed
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(token)
            }
            logger.warn(
              { token: token.substring(0, 20) + '...', error: resp.error },
              'FCM send failed for token'
            )
          }
        })
      }

      // Clean up invalid tokens
      for (const invalidToken of invalidTokens) {
        await this.fcmTokensRepository.deactivateToken(invalidToken)
      }

      if (invalidTokens.length > 0) {
        logger.info({ count: invalidTokens.length }, 'Deactivated invalid FCM tokens')
      }

      return success({
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        invalidTokens,
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to send FCM notification')
      return failure('Failed to send FCM notification', 'INTERNAL_ERROR')
    }
  }

  /**
   * Sends a data-only notification (silent push).
   * Useful for triggering background app updates.
   */
  async sendDataOnly(
    userId: string,
    data: Record<string, string>
  ): Promise<TServiceResult<ISendFcmNotificationOutput>> {
    const tokens = await this.fcmTokensRepository.getActiveByUserId(userId)

    if (tokens.length === 0) {
      return success({
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      })
    }

    try {
      const tokenStrings = tokens.map(t => t.token)
      const batchSize = 500
      let totalSuccessCount = 0
      let totalFailureCount = 0
      const invalidTokens: string[] = []

      for (let i = 0; i < tokenStrings.length; i += batchSize) {
        const batchTokens = tokenStrings.slice(i, i + batchSize)

        const message: MulticastMessage = {
          tokens: batchTokens,
          data,
          android: {
            priority: 'high',
          },
          apns: {
            payload: {
              aps: {
                'content-available': 1,
              },
            },
            headers: {
              'apns-priority': '5',
              'apns-push-type': 'background',
            },
          },
        }

        const response = await admin.messaging().sendEachForMulticast(message)

        totalSuccessCount += response.successCount
        totalFailureCount += response.failureCount

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = batchTokens[idx]
            if (!token) return

            const errorCode = resp.error?.code
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(token)
            }
          }
        })
      }

      // Clean up invalid tokens
      for (const invalidToken of invalidTokens) {
        await this.fcmTokensRepository.deactivateToken(invalidToken)
      }

      return success({
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        invalidTokens,
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to send FCM data-only notification')
      return failure('Failed to send FCM data-only notification', 'INTERNAL_ERROR')
    }
  }
}
