import type { Context } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { getBody, getQuery, getParams } from './middlewares/utils/payload-validator'
import { AUTHENTICATED_USER_PROP } from './middlewares/utils/auth/is-user-authenticated'

export class HttpContext<TBody = unknown, TQuery = unknown, TParams = unknown> {
  constructor(private readonly c: Context) {}

  get body(): TBody {
    return getBody<TBody>(this.c)
  }

  get query(): TQuery {
    return getQuery<TQuery>(this.c)
  }

  get params(): TParams {
    return getParams<TParams>(this.c)
  }

  // 2xx Success
  ok<T>(data: T): Response | Promise<Response> {
    return this.c.json(data, StatusCodes.OK)
  }

  created<T>(data: T): Response | Promise<Response> {
    return this.c.json(data, StatusCodes.CREATED)
  }

  accepted<T>(data: T): Response | Promise<Response> {
    return this.c.json(data, StatusCodes.ACCEPTED)
  }

  noContent(): Response | Promise<Response> {
    return this.c.body(null, StatusCodes.NO_CONTENT)
  }

  // 3xx Redirection
  movedPermanently(url: string): Response | Promise<Response> {
    return this.c.redirect(url, StatusCodes.MOVED_PERMANENTLY)
  }

  found(url: string): Response | Promise<Response> {
    return this.c.redirect(url, StatusCodes.MOVED_TEMPORARILY)
  }

  seeOther(url: string): Response | Promise<Response> {
    return this.c.redirect(url, StatusCodes.SEE_OTHER)
  }

  notModified(): Response | Promise<Response> {
    return this.c.body(null, StatusCodes.NOT_MODIFIED)
  }

  // 4xx Client Errors
  badRequest<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.BAD_REQUEST)
  }

  unauthorized<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.UNAUTHORIZED)
  }

  forbidden<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.FORBIDDEN)
  }

  notFound<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.NOT_FOUND)
  }

  methodNotAllowed<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.METHOD_NOT_ALLOWED)
  }

  conflict<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.CONFLICT)
  }

  unprocessableEntity<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.UNPROCESSABLE_ENTITY)
  }

  tooManyRequests<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.TOO_MANY_REQUESTS)
  }

  // 5xx Server Errors
  internalError<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.INTERNAL_SERVER_ERROR)
  }

  notImplemented<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.NOT_IMPLEMENTED)
  }

  badGateway<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.BAD_GATEWAY)
  }

  serviceUnavailable<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.SERVICE_UNAVAILABLE)
  }

  gatewayTimeout<T>(error: T): Response | Promise<Response> {
    return this.c.json(error, StatusCodes.GATEWAY_TIMEOUT)
  }

  // auth
  async getAuthenticatedUser(): Promise<unknown> {
    return await this.c.get(AUTHENTICATED_USER_PROP)
  }

  get context() {
    return this.c
  }
}
