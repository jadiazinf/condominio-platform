import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'

// Allowed MIME types for attachments
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'] as const
export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const

export type TAllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// File size limits in bytes
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  video: 50 * 1024 * 1024, // 50MB
  pdf: 10 * 1024 * 1024, // 10MB
} as const

/**
 * Get the category of a file based on its MIME type
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'pdf' | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'image'
  }
  if (ALLOWED_VIDEO_TYPES.includes(mimeType as (typeof ALLOWED_VIDEO_TYPES)[number])) {
    return 'video'
  }
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return 'pdf'
  }
  return null
}

/**
 * Validate if a file size is within the allowed limit for its type
 */
export function validateFileSize(mimeType: string, size: number): boolean {
  const category = getFileTypeCategory(mimeType)
  if (!category) return false

  const limit = FILE_SIZE_LIMITS[category]
  return size <= limit
}

/**
 * Get the maximum file size for a given MIME type
 */
export function getFileSizeLimit(mimeType: string): number | null {
  const category = getFileTypeCategory(mimeType)
  if (!category) return null
  return FILE_SIZE_LIMITS[category]
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Attachment schema with strict MIME type validation
export const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().positive(),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
})

export const supportTicketMessageSchema = baseModelSchema.extend({
  ticketId: z.uuid(),
  userId: z.uuid(),

  // Message content
  message: z.string(),
  isInternal: z.boolean().default(false),

  // Attachments
  attachments: z.array(attachmentSchema).nullable(),

  // Status
  isActive: z.boolean().default(true),

  // Relations (populated by repository joins)
  user: userSchema
    .pick({
      id: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    })
    .nullable()
    .optional(),
})

export type TAttachment = z.infer<typeof attachmentSchema>
