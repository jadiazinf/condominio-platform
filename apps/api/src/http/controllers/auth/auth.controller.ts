import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import {
  googleRegisterSchema,
  registerSchema,
  type TGoogleRegisterSchema,
  type TRegisterSchema,
} from '@packages/domain'
import { ApiErrorCodes } from '@packages/http-client'
import { admin } from '@libs/firebase/config'
import type { UsersRepository } from '@database/repositories'
import { HttpContext } from '../../context'
import { bodyValidator } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { RegisterGoogleUserService, RegisterUserService } from '@src/services/auth'
import { LocaleDictionary } from '@locales/dictionary'

/**
 * Controller for authentication endpoints.
 *
 * Endpoints:
 * - POST /register         Register a new user (any Firebase auth method)
 * - POST /register/google  Register a new user via Google Sign-In
 */
export class AuthController {
  private readonly registerGoogleUserService: RegisterGoogleUserService
  private readonly registerUserService: RegisterUserService

  constructor(usersRepository: UsersRepository) {
    this.registerGoogleUserService = new RegisterGoogleUserService(usersRepository)
    this.registerUserService = new RegisterUserService(usersRepository)

    // Bind methods
    this.register = this.register.bind(this)
    this.registerWithGoogle = this.registerWithGoogle.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'post',
        path: '/register',
        handler: this.register,
        middlewares: [bodyValidator(registerSchema)],
      },
      {
        method: 'post',
        path: '/register/google',
        handler: this.registerWithGoogle,
        middlewares: [bodyValidator(googleRegisterSchema)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  /**
   * Register a new user after Firebase authentication.
   * Works for any Firebase auth method (email/password, Google, etc.).
   * Expects a valid Firebase token in the Authorization header.
   */
  private async register(c: Context): Promise<Response> {
    const ctx = new HttpContext<TRegisterSchema>(c)
    const t = useTranslation(c)

    // Get and verify the Firebase token
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.unauthorizedWithCode(
        ApiErrorCodes.MALFORMED_HEADER,
        t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader)
      )
    }

    const token = authHeader.slice(7)

    try {
      // Verify the token with Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(token)

      // Extract user data from the Firebase token
      const { uid: firebaseUid, email, name, picture, email_verified } = decodedToken

      if (!email) {
        return ctx.badRequest({ error: 'Email is required for registration' })
      }

      // Register the user
      const result = await this.registerUserService.execute({
        firebaseUid,
        email,
        displayName: name ?? null,
        photoUrl: picture ?? null,
        emailVerified: email_verified ?? false,
        userData: ctx.body,
      })

      if (!result.success) {
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }

        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch {
      return ctx.unauthorizedWithCode(
        ApiErrorCodes.INVALID_TOKEN,
        t(LocaleDictionary.http.middlewares.utils.auth.invalidToken)
      )
    }
  }

  /**
   * Register a new user via Google Sign-In.
   * Expects a valid Firebase token in the Authorization header.
   * The token is verified and user data is extracted from it.
   */
  private async registerWithGoogle(c: Context): Promise<Response> {
    const ctx = new HttpContext<TGoogleRegisterSchema>(c)
    const t = useTranslation(c)

    // Get and verify the Firebase token
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.unauthorizedWithCode(
        ApiErrorCodes.MALFORMED_HEADER,
        t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader)
      )
    }

    const token = authHeader.slice(7)

    try {
      // Verify the token with Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(token)

      // Extract user data from the Firebase token
      const { uid: firebaseUid, email, name, picture, email_verified } = decodedToken

      if (!email) {
        return ctx.badRequest({ error: 'Email is required for registration' })
      }

      // Register the user
      const result = await this.registerGoogleUserService.execute({
        firebaseUid,
        email,
        displayName: name ?? null,
        photoUrl: picture ?? null,
        emailVerified: email_verified ?? false,
        userData: ctx.body,
      })

      if (!result.success) {
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch {
      return ctx.unauthorizedWithCode(
        ApiErrorCodes.INVALID_TOKEN,
        t(LocaleDictionary.http.middlewares.utils.auth.invalidToken)
      )
    }
  }
}
