'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/ui/components/textarea'
import { Button } from '@/ui/components/button'
import { Checkbox } from '@/ui/components/checkbox'
import { Progress } from '@/ui/components/progress'
import { Send, Paperclip, X, FileText, Image as ImageIcon, Video, RefreshCw } from 'lucide-react'
import { useCreateTicketMessage } from '@packages/http-client'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  formatFileSize,
  getFileTypeCategory,
} from '@packages/domain'

import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'
import { useTicketAttachmentUpload, type IFileValidationError } from '../hooks'

// Build accept string for file input
const ACCEPT_STRING = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
].join(',')

interface ISendMessageFormProps {
  ticketId: string
  isTicketClosed?: boolean
  translations: {
    messagePlaceholder: string
    internalCheckbox: string
    sendButton: string
    sending: string
    success: string
    error: string
    ticketClosed?: string
    attachFiles?: string
    dropFilesHere?: string
    invalidFileType?: string
    fileTooLarge?: string
    uploading?: string
    removeFile?: string
    retryUpload?: string
  }
}

export function SendMessageForm({ ticketId, isTicketClosed = false, translations }: ISendMessageFormProps) {
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // Handle validation errors from the upload hook
  const handleValidationError = useCallback(
    (errors: IFileValidationError[]) => {
      for (const error of errors) {
        if (error.reason === 'invalid_type') {
          toast.error(translations.invalidFileType || `Invalid file type: ${error.file.name}`)
        } else if (error.reason === 'file_too_large') {
          toast.error(
            translations.fileTooLarge ||
              `File too large: ${error.file.name} (max ${error.maxSize ? formatFileSize(error.maxSize) : 'unknown'})`
          )
        }
      }
    },
    [toast, translations.invalidFileType, translations.fileTooLarge]
  )

  // Upload hook
  const {
    uploadingFiles,
    completedAttachments,
    isUploading,
    addFiles,
    removeFile,
    retryFile,
    clearAll,
  } = useTicketAttachmentUpload({
    ticketId,
    onValidationError: handleValidationError,
  })

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [message])

  const { mutate: createMessage, isPending } = useCreateTicketMessage(ticketId, {
    onSuccess: () => {
      // Don't show success toast - message appears in real-time via WebSocket
      setMessage('')
      setIsInternal(false)
      clearAll() // Clear uploaded files after successful message
    },
    onError: () => {
      toast.error(translations.error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Can't submit while uploading
    if (isUploading) return

    // Need either a message or attachments
    if (!message.trim() && completedAttachments.length === 0) return

    createMessage({
      message: message.trim(),
      isInternal,
      attachments: completedAttachments.length > 0 ? completedAttachments : null,
    })
  }

  // File input handler
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length > 0) {
        addFiles(files)
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [addFiles]
  )

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging false if leaving the form area
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        addFiles(files)
      }
    },
    [addFiles]
  )

  // Get icon for file type
  const getFileIcon = (mimeType: string) => {
    const category = getFileTypeCategory(mimeType)
    switch (category) {
      case 'image':
        return <ImageIcon size={16} className="text-blue-500" />
      case 'video':
        return <Video size={16} className="text-purple-500" />
      case 'pdf':
        return <FileText size={16} className="text-red-500" />
      default:
        return <FileText size={16} className="text-default-400" />
    }
  }

  if (isTicketClosed) {
    return (
      <div className="rounded-lg bg-default-100 p-4 text-center">
        <Typography color="muted" variant="body2">
          {translations.ticketClosed || 'This ticket is closed. No more messages can be sent.'}
        </Typography>
      </div>
    )
  }

  const canSubmit = (message.trim() || completedAttachments.length > 0) && !isPending && !isUploading

  return (
    <form
      className={`space-y-3 rounded-lg transition-colors ${
        isDragging ? 'bg-primary-50 ring-2 ring-primary ring-offset-2' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onSubmit={handleSubmit}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        accept={ACCEPT_STRING}
        className="hidden"
        multiple
        type="file"
        onChange={handleFileSelect}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary-50 p-8">
          <Typography color="primary" variant="body2">
            {translations.dropFilesHere || 'Drop files here'}
          </Typography>
        </div>
      )}

      {/* Textarea */}
      {!isDragging && (
        <Textarea
          ref={textareaRef}
          classNames={{
            input: 'resize-none overflow-hidden',
            inputWrapper: 'min-h-[60px] border-0 bg-default-100 shadow-none',
          }}
          isDisabled={isPending}
          maxRows={10}
          minRows={2}
          placeholder={translations.messagePlaceholder}
          radius="lg"
          value={message}
          variant="flat"
          onChange={(e) => setMessage(e.target.value)}
        />
      )}

      {/* File previews */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg bg-default-100 p-2"
            >
              {/* Preview thumbnail or icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-default-200">
                {file.file.type.startsWith('image/') && file.status === 'completed' && file.attachment ? (
                  <img
                    alt={file.file.name}
                    className="h-full w-full rounded object-cover"
                    src={file.attachment.url}
                  />
                ) : (
                  getFileIcon(file.file.type)
                )}
              </div>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <Typography className="truncate" variant="body2">
                  {file.file.name}
                </Typography>
                <Typography color="muted" variant="caption">
                  {formatFileSize(file.file.size)}
                </Typography>
                {/* Progress bar */}
                {(file.status === 'uploading' || file.status === 'pending') && (
                  <Progress
                    className="mt-1"
                    color="primary"
                    size="sm"
                    value={file.progress}
                  />
                )}
                {/* Error message */}
                {file.status === 'error' && (
                  <Typography color="danger" variant="caption">
                    {file.error || 'Upload failed'}
                  </Typography>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {file.status === 'error' && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => retryFile(file.id)}
                  >
                    <RefreshCw size={14} />
                  </Button>
                )}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => removeFile(file.id)}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Checkbox isSelected={isInternal} onValueChange={setIsInternal}>
            {translations.internalCheckbox}
          </Checkbox>

          {/* Attach button */}
          <Button
            isIconOnly
            aria-label={translations.attachFiles || 'Attach files'}
            size="sm"
            variant="light"
            onPress={() => fileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </Button>
        </div>

        <Button
          className="bg-[#25D366] text-white hover:bg-[#20BA5A]"
          isDisabled={!canSubmit}
          isLoading={isPending || isUploading}
          startContent={!isPending && !isUploading ? <Send size={16} /> : null}
          type="submit"
        >
          {isPending
            ? translations.sending
            : isUploading
              ? translations.uploading || 'Uploading...'
              : translations.sendButton}
        </Button>
      </div>
    </form>
  )
}
