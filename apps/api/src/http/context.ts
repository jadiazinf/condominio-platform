import type { Context } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { getBody, getQuery, getParams } from './middlewares/utils/payload-validator'
import { AUTHENTICATED_USER_PROP } from './middlewares/utils/auth/is-user-authenticated'
import type { TUser } from '@packages/domain'
import type {
  TApiDataResponse,
  TApiMessageResponse,
  TApiDataMessageResponse,
  TApiSimpleErrorResponse,
} from '@packages/http-client'

// Response type aliases for convenience
type TResponse = Response | Promise<Response>

// Allow extra properties in responses for flexibility
type TExtraProps = Record<string, unknown>

// Success response payloads (with optional extra properties)
type TDataPayload<T> = TApiDataResponse<T> & TExtraProps
type TMessagePayload = TApiMessageResponse & TExtraProps
type TDataMessagePayload<T> = TApiDataMessageResponse<T> & TExtraProps
type TSuccessPayload<T> = TDataPayload<T> | TMessagePayload | TDataMessagePayload<T>

// Error response payloads (with optional extra properties)
type TErrorPayload = TApiSimpleErrorResponse & TExtraProps

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

  /**
   * HTTP 200 OK
   * @param data Response payload: { data: T } | { message: string } | { data: T, message: string }
   */
  ok<T>(data: TSuccessPayload<T>): TResponse {
    return this.c.json(data, StatusCodes.OK)
  }

  /**
   * HTTP 201 Created
   * @param data Response payload: { data: T } | { data: T, message: string }
   */
  created<T>(data: TDataPayload<T> | TDataMessagePayload<T>): TResponse {
    return this.c.json(data, StatusCodes.CREATED)
  }

  /**
   * HTTP 202 Accepted
   * @param data Response payload: { data: T } | { message: string }
   */
  accepted<T>(data: TSuccessPayload<T>): TResponse {
    return this.c.json(data, StatusCodes.ACCEPTED)
  }

  /**
   * HTTP 204 No Content
   */
  noContent(): TResponse {
    return this.c.body(null, StatusCodes.NO_CONTENT)
  }

  // 3xx Redirection

  movedPermanently(url: string): TResponse {
    return this.c.redirect(url, StatusCodes.MOVED_PERMANENTLY)
  }

  found(url: string): TResponse {
    return this.c.redirect(url, StatusCodes.MOVED_TEMPORARILY)
  }

  seeOther(url: string): TResponse {
    return this.c.redirect(url, StatusCodes.SEE_OTHER)
  }

  notModified(): TResponse {
    return this.c.body(null, StatusCodes.NOT_MODIFIED)
  }

  // 4xx Client Errors

  /**
   * HTTP 400 Bad Request
   * @param error Error payload: { error: string }
   */
  badRequest(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.BAD_REQUEST)
  }

  /**
   * HTTP 401 Unauthorized
   * @param error Error payload: { error: string }
   */
  unauthorized(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.UNAUTHORIZED)
  }

  /**
   * HTTP 403 Forbidden
   * @param error Error payload: { error: string }
   */
  forbidden(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.FORBIDDEN)
  }

  /**
   * HTTP 404 Not Found
   * @param error Error payload: { error: string }
   */
  notFound(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.NOT_FOUND)
  }

  /**
   * HTTP 405 Method Not Allowed
   * @param error Error payload: { error: string }
   */
  methodNotAllowed(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.METHOD_NOT_ALLOWED)
  }

  /**
   * HTTP 409 Conflict
   * @param error Error payload: { error: string }
   */
  conflict(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.CONFLICT)
  }

  /**
   * HTTP 422 Unprocessable Entity
   * @param error Error payload: { error: string }
   */
  unprocessableEntity(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.UNPROCESSABLE_ENTITY)
  }

  /**
   * HTTP 429 Too Many Requests
   * @param error Error payload: { error: string }
   */
  tooManyRequests(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.TOO_MANY_REQUESTS)
  }

  // 5xx Server Errors

  /**
   * HTTP 500 Internal Server Error
   * @param error Error payload: { error: string }
   */
  internalError(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.INTERNAL_SERVER_ERROR)
  }

  /**
   * HTTP 501 Not Implemented
   * @param error Error payload: { error: string }
   */
  notImplemented(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.NOT_IMPLEMENTED)
  }

  /**
   * HTTP 502 Bad Gateway
   * @param error Error payload: { error: string }
   */
  badGateway(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.BAD_GATEWAY)
  }

  /**
   * HTTP 503 Service Unavailable
   * @param error Error payload: { error: string }
   */
  serviceUnavailable(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.SERVICE_UNAVAILABLE)
  }

  /**
   * HTTP 504 Gateway Timeout
   * @param error Error payload: { error: string }
   */
  gatewayTimeout(error: TErrorPayload): TResponse {
    return this.c.json(error, StatusCodes.GATEWAY_TIMEOUT)
  }

  // Auth

  getAuthenticatedUser(): TUser {
    return this.c.get(AUTHENTICATED_USER_PROP)
  }

  get context() {
    return this.c
  }
}
