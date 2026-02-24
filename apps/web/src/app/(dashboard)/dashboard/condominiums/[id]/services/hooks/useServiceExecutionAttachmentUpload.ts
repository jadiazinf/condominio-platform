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

interface IUseServiceExecutionAttachmentUploadOptions {
  /** Storage folder ID — either a temp UUID (on create) or the actual executionId (on edit) */
  storageId: string
  onValidationError?: (errors: IFileValidationError[]) => void
}

export function useServiceExecutionAttachmentUpload(
  options: IUseServiceExecutionAttachmentUploadOptions
) {
  const { storageId, onValidationError } = options
  const [uploadingFiles, setUploadingFiles] = useState<IUploadingFile[]>([])
  const uploadTasksRef = useRef<Map<string, ReturnType<typeof uploadBytesResumable>>>(new Map())

  const validateFile = useCallback((file: File): IFileValidationError | null => {
    const mimeType = file.type
    if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      return { file, reason: 'invalid_type' }
    }
    if (!validateFileSize(mimeType, file.size)) {
      const maxSize = getFileSizeLimit(mimeType)
      return { file, reason: 'file_too_large', maxSize: maxSize ?? undefined }
    }
    return null
  }, [])

  const uploadFile = useCallback(
    async (uploadingFile: IUploadingFile) => {
      const { id, file } = uploadingFile
      try {
        const storage = getFirebaseStorage()
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `service-executions/${storageId}/attachments/${id}_${safeFileName}`
        const storageRef = ref(storage, storagePath)

        setUploadingFiles(prev =>
          prev.map(f => (f.id === id ? { ...f, status: 'uploading' as const } : f))
        )

        const uploadTask = uploadBytesResumable(storageRef, file)
        uploadTasksRef.current.set(id, uploadTask)

        uploadTask.on(
          'state_changed',
          snapshot => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            setUploadingFiles(prev => prev.map(f => (f.id === id ? { ...f, progress } : f)))
          },
          error => {
            setUploadingFiles(prev =>
              prev.map(f =>
                f.id === id ? { ...f, status: 'error' as const, error: error.message } : f
              )
            )
            uploadTasksRef.current.delete(id)
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
              const attachment: TAttachment = {
                name: file.name,
                url: downloadURL,
                size: file.size,
                mimeType: file.type as TAttachment['mimeType'],
              }
              setUploadingFiles(prev =>
                prev.map(f =>
                  f.id === id
                    ? { ...f, status: 'completed' as const, progress: 100, attachment }
                    : f
                )
              )
            } catch {
              setUploadingFiles(prev =>
                prev.map(f =>
                  f.id === id
                    ? { ...f, status: 'error' as const, error: 'Failed to get download URL' }
                    : f
                )
              )
            }
            uploadTasksRef.current.delete(id)
          }
        )
      } catch {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === id ? { ...f, status: 'error' as const, error: 'Failed to start upload' } : f
          )
        )
      }
    },
    [storageId]
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const validationErrors: IFileValidationError[] = []
      const validFiles: File[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          validationErrors.push(error)
        } else {
          validFiles.push(file)
        }
      }

      if (validationErrors.length > 0 && onValidationError) {
        onValidationError(validationErrors)
      }

      if (validFiles.length > 0) {
        const newUploadingFiles: IUploadingFile[] = validFiles.map(file => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: 'pending' as const,
        }))
        setUploadingFiles(prev => [...prev, ...newUploadingFiles])
        for (const uf of newUploadingFiles) {
          uploadFile(uf)
        }
      }
    },
    [validateFile, onValidationError, uploadFile]
  )

  const removeFile = useCallback((id: string) => {
    const uploadTask = uploadTasksRef.current.get(id)
    if (uploadTask) {
      uploadTask.cancel()
      uploadTasksRef.current.delete(id)
    }
    setUploadingFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    const entries = Array.from(uploadTasksRef.current.entries())
    for (const [id, uploadTask] of entries) {
      uploadTask.cancel()
      uploadTasksRef.current.delete(id)
    }
    setUploadingFiles([])
  }, [])

  const retryFile = useCallback(
    (id: string) => {
      const fileToRetry = uploadingFiles.find(f => f.id === id)
      if (fileToRetry && fileToRetry.status === 'error') {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === id ? { ...f, status: 'pending' as const, progress: 0, error: undefined } : f
          )
        )
        uploadFile(fileToRetry)
      }
    },
    [uploadingFiles, uploadFile]
  )

  const completedAttachments = uploadingFiles
    .filter(f => f.status === 'completed' && f.attachment)
    .map(f => f.attachment!)

  const isUploading = uploadingFiles.some(
    f => f.status === 'uploading' || f.status === 'pending'
  )

  const hasErrors = uploadingFiles.some(f => f.status === 'error')

  const totalProgress =
    uploadingFiles.length > 0
      ? Math.round(
          uploadingFiles.reduce((sum, f) => sum + f.progress, 0) / uploadingFiles.length
        )
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
    getFileTypeCategory,
    formatFileSize,
  }
}
