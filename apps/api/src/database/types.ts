import { DatabaseService } from './service'
import { ZodError } from 'zod'

export type TDrizzleDatabase = ReturnType<typeof DatabaseService.prototype.getDb>

export type TRepositoryResponse<T = unknown> = [boolean, T | null, ZodError | undefined]

export type TRepositoryResultObject<T = unknown> = {
  executed: boolean
  data: T | null
  validationError?: ZodError
}
