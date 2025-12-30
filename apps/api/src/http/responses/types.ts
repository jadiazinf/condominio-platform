/**
 * Field validation error - represents an error for a specific field
 */
export type TFieldError = {
  field: string
  messages: string[]
}

/**
 * Standard validation error response
 * This format is returned when schema validation fails
 *
 * @example
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Error de validación",
 *     fields: [
 *       { field: "email", messages: ["El correo electrónico no es válido."] },
 *       { field: "name", messages: ["El nombre es requerido.", "El nombre debe tener como máximo 255 caracteres."] }
 *     ]
 *   }
 * }
 */
export type TValidationErrorResponse = {
  success: false
  error: {
    code: 'VALIDATION_ERROR'
    message: string
    fields: TFieldError[]
  }
}

/**
 * Standard error response for non-validation errors
 *
 * @example
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Recurso no encontrado"
 *   }
 * }
 */
export type TErrorResponse = {
  success: false
  error: {
    code: string
    message: string
  }
}

/**
 * Standard success response
 *
 * @example
 * {
 *   success: true,
 *   data: { ... }
 * }
 */
export type TSuccessResponse<T> = {
  success: true
  data: T
}

/**
 * Common error codes used in the API
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const

export type TErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
