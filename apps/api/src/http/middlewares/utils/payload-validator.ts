import { z } from 'zod'
import type { MiddlewareHandler } from 'hono'
import type { Context } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { useTranslation } from '@intlify/hono'
import { translateZodMessages } from '@locales/translator'

export const BODY_FIELD = 'body'

export function bodyValidator<T extends z.ZodTypeAny>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    let body: unknown

    try {
      body = await c.req.json()
    } catch {
      const t = useTranslation(c)
      return c.json({ error: t('errors.malformedBody'), details: [] }, StatusCodes.BAD_REQUEST)
    }

    const { success, error, data } = schema.safeParse(body)

    if (!success) {
      const t = useTranslation(c)
      const translated = translateZodMessages(error, t)

      return c.json({ error: translated }, StatusCodes.UNPROCESSABLE_ENTITY)
    }

    c.set(BODY_FIELD, data)
    return await next()
  }
}

export const PARAMS_FIELD = 'params'

export function paramsValidator<T extends z.ZodTypeAny>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const raw = c.req.param()
    const result = schema.safeParse(raw)

    if (!result.success) {
      const t = useTranslation(c)
      const translated = translateZodMessages(result.error, t)

      return c.json({ error: translated }, StatusCodes.BAD_REQUEST)
    }

    c.set(PARAMS_FIELD, result.data)
    return await next()
  }
}

export const QUERY_FIELD = 'query'

export function queryValidator<T extends z.ZodTypeAny>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const raw = c.req.query()
    const result = schema.safeParse(raw)

    if (!result.success) {
      const t = useTranslation(c)
      const translated = translateZodMessages(result.error, t)

      return c.json({ error: translated }, StatusCodes.BAD_REQUEST)
    }

    c.set(QUERY_FIELD, result.data)
    return await next()
  }
}

export function getBody<T>(c: Context): T {
  return c.get('body') as T
}

export function getQuery<T>(c: Context): T {
  return c.get('query') as T
}

export function getParams<T>(c: Context): T {
  return c.get('params') as T
}
