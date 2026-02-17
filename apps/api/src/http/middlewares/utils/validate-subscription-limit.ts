import type { Context, Next, MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { StatusCodes } from 'http-status-codes'
import {
  ValidateSubscriptionLimitsService,
  type TResourceType,
} from '@src/services/subscriptions'
import type {
  ManagementCompanySubscriptionsRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import { LocaleDictionary } from '@locales/dictionary'
import { getBody } from './payload-validator'

/**
 * Creates a middleware that validates subscription limits before resource creation.
 *
 * This middleware:
 * 1. Extracts managementCompanyId from request body (expects managementCompanyIds array)
 * 2. Calls ValidateSubscriptionLimitsService to check if creation is allowed
 * 3. Returns 403 if limit is reached
 * 4. Calls next() if creation is allowed
 *
 * @param resourceType - Type of resource being created ('condominium' | 'unit' | 'user')
 * @param subscriptionsRepository - Repository for subscriptions
 * @param companiesRepository - Repository for companies
 * @returns Middleware handler
 */
export function validateSubscriptionLimit(
  resourceType: TResourceType,
  subscriptionsRepository: ManagementCompanySubscriptionsRepository,
  companiesRepository: ManagementCompaniesRepository
): MiddlewareHandler {
  const service = new ValidateSubscriptionLimitsService(subscriptionsRepository, companiesRepository)

  return async (c: Context, next: Next) => {
    try {
      // Extract management company ID from body
      const body = getBody<{ managementCompanyIds?: string[] }>(c)

      // Condominiums can belong to multiple management companies
      // We validate against the first one in the array
      const managementCompanyId = body.managementCompanyIds?.[0]

      if (!managementCompanyId) {
        const t = useTranslation(c)
        return c.json(
          {
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: t(LocaleDictionary.http.services.subscriptions.managementCompanyRequired),
            },
          },
          StatusCodes.BAD_REQUEST
        )
      }

      // Validate subscription limits
      const result = await service.execute({
        managementCompanyId,
        resourceType,
      })

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: result.code,
              message: result.error,
            },
          },
          StatusCodes.NOT_FOUND
        )
      }

      // Check if creation is allowed
      if (!result.data.canCreate) {
        const t = useTranslation(c)
        return c.json(
          {
            success: false,
            error: {
              code: 'SUBSCRIPTION_LIMIT_REACHED',
              message: t(LocaleDictionary.http.services.subscriptions.subscriptionLimitReached),
              details: {
                resourceType,
                currentCount: result.data.currentCount,
                maxAllowed: result.data.maxAllowed,
                limitReached: result.data.limitReached,
              },
            },
          },
          StatusCodes.FORBIDDEN
        )
      }

      // Limit not reached, proceed
      return await next()
    } catch (error) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to validate subscription limits',
          },
        },
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    }
  }
}
