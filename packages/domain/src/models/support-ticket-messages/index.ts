export * from './schema'
export * from './types'
export * from './dtos/types'
export { supportTicketMessageCreateSchema } from './dtos/createDto'
export { supportTicketMessageUpdateSchema } from './dtos/updateDto'

// Re-export attachment validation utilities
export {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMITS,
  getFileTypeCategory,
  validateFileSize,
  getFileSizeLimit,
  formatFileSize,
  type TAllowedMimeType,
} from './schema'
