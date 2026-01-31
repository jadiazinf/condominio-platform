'use client'

import { useState, useCallback, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import {
  type TAttachment,
  ALLOWED_MIME_TYPES,
  getFileTypeCategory,
  validateFileSize,
  getFileSizeLimit,
  formatFileSize,
} from '@packages/domain'

import { getFirebaseStorage } from '@/libs/firebase/config'

export type TUploadStatus = 'pending' | 'uploading' | 'completed' | 'error'

export interface IUploadingFile {
  id: string
  file: File
  progress: number
  status: TUploadStatus
  error?: string
  attachment?: TAttachment
}

export interface IFileValidationError {
  file: File
  reason: 'invalid_type' | 'file_too_large'
  maxSize?: number
}

interface IUseTicketAttachmentUploadOptions {
  ticketId: string
  onValidationError?: (errors: IFileValidationError[]) => void
}

export function useTicketAttachmentUpload(options: IUseTicketAttachmentUploadOptions) {
  const { ticketId, onValidationError } = options
  const [uploadingFiles, setUploadingFiles] = useState<IUploadingFile[]>([])
  const uploadTasksRef = useRef<Map<string, ReturnType<typeof uploadBytesResumable>>>(new Map())

  // Validate a single file
  const validateFile = useCallback((file: File): IFileValidationError | null => {
    const mimeType = file.type

    // Check if MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      return { file, reason: 'invalid_type' }
    }

    // Check file size
    if (!validateFileSize(mimeType, file.size)) {
      const maxSize = getFileSizeLimit(mimeType)
      return { file, reason: 'file_too_large', maxSize: maxSize ?? undefined }
    }

    return null
  }, [])

  // Add files to the upload queue
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const validationErrors: IFileValidationError[] = []
      const validFiles: File[] = []

      // Validate each file
      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          validationErrors.push(error)
        } else {
          validFiles.push(file)
        }
      }

      // Notify about validation errors
      if (validationErrors.length > 0 && onValidationError) {
        onValidationError(validationErrors)
      }

      // Add valid files to the uploading list and start uploads
      if (validFiles.length > 0) {
        const newUploadingFiles: IUploadingFile[] = validFiles.map((file) => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: 'pending' as const,
        }))

        setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

        // Start uploading each file
        for (const uploadingFile of newUploadingFiles) {
          uploadFile(uploadingFile)
        }
      }
    },
    [validateFile, onValidationError]
  )

  // Upload a single file to Firebase Storage
  const uploadFile = useCallback(
    async (uploadingFile: IUploadingFile) => {
      const { id, file } = uploadingFile

      try {
        const storage = getFirebaseStorage()
        const fileExtension = file.name.split('.').pop() || ''
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `tickets/${ticketId}/attachments/${id}_${safeFileName}`
        const storageRef = ref(storage, storagePath)

        // Update status to uploading
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const } : f))
        )

        const uploadTask = uploadBytesResumable(storageRef, file)
        uploadTasksRef.current.set(id, uploadTask)

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            setUploadingFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress } : f)))
          },
          (error) => {
            // Upload failed
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === id ? { ...f, status: 'error' as const, error: error.message } : f
              )
            )
            uploadTasksRef.current.delete(id)
          },
          async () => {
            // Upload completed - get download URL
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

              const attachment: TAttachment = {
                name: file.name,
                url: downloadURL,
                size: file.size,
                mimeType: file.type as TAttachment['mimeType'],
              }

              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === id
                    ? { ...f, status: 'completed' as const, progress: 100, attachment }
                    : f
                )
              )
            } catch (error) {
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === id
                    ? { ...f, status: 'error' as const, error: 'Failed to get download URL' }
                    : f
                )
              )
            }
            uploadTasksRef.current.delete(id)
          }
        )
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'error' as const, error: 'Failed to start upload' } : f
          )
        )
      }
    },
    [ticketId]
  )

  // Remove a file from the upload queue
  const removeFile = useCallback((id: string) => {
    // Cancel upload if in progress
    const uploadTask = uploadTasksRef.current.get(id)
    if (uploadTask) {
      uploadTask.cancel()
      uploadTasksRef.current.delete(id)
    }

    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // Clear all files
  const clearAll = useCallback(() => {
    // Cancel all uploads
    const entries = Array.from(uploadTasksRef.current.entries())
    for (const [id, uploadTask] of entries) {
      uploadTask.cancel()
      uploadTasksRef.current.delete(id)
    }

    setUploadingFiles([])
  }, [])

  // Retry a failed upload
  const retryFile = useCallback(
    (id: string) => {
      const fileToRetry = uploadingFiles.find((f) => f.id === id)
      if (fileToRetry && fileToRetry.status === 'error') {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'pending' as const, progress: 0, error: undefined } : f
          )
        )
        uploadFile(fileToRetry)
      }
    },
    [uploadingFiles, uploadFile]
  )

  // Computed values
  const completedAttachments = uploadingFiles
    .filter((f) => f.status === 'completed' && f.attachment)
    .map((f) => f.attachment!)

  const isUploading = uploadingFiles.some((f) => f.status === 'uploading' || f.status === 'pending')

  const hasErrors = uploadingFiles.some((f) => f.status === 'error')

  const totalProgress =
    uploadingFiles.length > 0
      ? Math.round(uploadingFiles.reduce((sum, f) => sum + f.progress, 0) / uploadingFiles.length)
      : 0

  return {
    uploadingFiles,
    completedAttachments,
    isUploading,
    hasErrors,
    totalProgress,
    addFiles,
    removeFile,
    clearAll,
    retryFile,
    // Utility exports
    getFileTypeCategory,
    formatFileSize,
  }
}
