'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Wifi, WifiOff, FileText, Download } from 'lucide-react'
import { useTicketMessages, useTicketWebSocket } from '@packages/http-client'
import { type TAttachment, getFileTypeCategory, formatFileSize } from '@packages/domain'

import { SendMessageForm } from './SendMessageForm'
import { AttachmentsGallery } from './AttachmentsGallery'

import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { Chip } from '@/ui/components/chip'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { setSessionCookie } from '@/libs/cookies'
import { useUser, useAuth } from '@/contexts'

export interface ITicketMessagesTranslations {
  title: string
  noMessages: string
  internalMessage: string
  attachments: string
  loadingMessages: string
  messagePlaceholder: string
  internalCheckbox: string
  sendButton: string
  sending: string
  success: string
  error: string
  today?: string
  ticketClosed?: string
  attachFiles?: string
  dropFilesHere?: string
  invalidFileType?: string
  fileTooLarge?: string
  uploading?: string
  removeFile?: string
  downloadFile?: string
  openImage?: string
  // Gallery translations
  galleryTitle?: string
  galleryNoAttachments?: string
  galleryImages?: string
  galleryVideos?: string
  galleryDocuments?: string
  galleryUploadedBy?: string
  galleryShowAll?: string
  galleryShowLess?: string
}

export interface ITicketMessagesProps {
  ticketId: string
  ticketStatus: string
  locale: string
  translations: ITicketMessagesTranslations
}

// Attachment display component
function AttachmentDisplay({
  attachment,
  isCurrentUser,
  downloadLabel,
}: {
  attachment: TAttachment
  isCurrentUser: boolean
  downloadLabel?: string
}) {
  const category = getFileTypeCategory(attachment.mimeType)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  if (category === 'image') {
    return (
      <div className="mt-2">
        <button
          className="block cursor-pointer overflow-hidden rounded-lg"
          type="button"
          onClick={() => setIsImageModalOpen(true)}
        >
          <img
            alt={attachment.name}
            className="max-h-48 max-w-full rounded-lg object-contain"
            src={attachment.url}
          />
        </button>
        {/* Simple image modal */}
        {isImageModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <img
              alt={attachment.name}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              src={attachment.url}
            />
          </div>
        )}
      </div>
    )
  }

  if (category === 'video') {
    return (
      <div className="mt-2">
        <video controls className="max-h-64 max-w-full rounded-lg" preload="metadata">
          <source src={attachment.url} type={attachment.mimeType} />
          Your browser does not support video playback.
        </video>
        <Typography
          className={`mt-1 text-xs ${isCurrentUser ? 'text-white/70' : 'text-default-400'}`}
        >
          {attachment.name} ({formatFileSize(attachment.size)})
        </Typography>
      </div>
    )
  }

  // PDF and other files - show as download link
  return (
    <a
      className={`mt-2 flex items-center gap-2 rounded-lg p-2 transition-colors ${
        isCurrentUser ? 'bg-white/10 hover:bg-white/20' : 'bg-default-100 hover:bg-default-200'
      }`}
      href={attachment.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <FileText className={isCurrentUser ? 'text-white' : 'text-red-500'} size={24} />
      <div className="min-w-0 flex-1">
        <Typography
          className={`truncate text-sm ${isCurrentUser ? 'text-white' : 'text-default-900'}`}
        >
          {attachment.name}
        </Typography>
        <Typography className={`text-xs ${isCurrentUser ? 'text-white/70' : 'text-default-400'}`}>
          {formatFileSize(attachment.size)}
        </Typography>
      </div>
      <Download className={isCurrentUser ? 'text-white/80' : 'text-default-400'} size={16} />
    </a>
  )
}

export function TicketMessages({
  ticketId,
  ticketStatus,
  locale,
  translations,
}: ITicketMessagesProps) {
  const isTicketClosed =
    ticketStatus === 'closed' || ticketStatus === 'cancelled' || ticketStatus === 'resolved'
  const { data, isLoading } = useTicketMessages(ticketId)
  const messages = data?.data
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user: currentUser } = useUser()
  const { user: firebaseUser } = useAuth()

  // Get a fresh token from Firebase to avoid connecting with an expired cookie token
  const [token, setToken] = useState('')
  const [tokenReady, setTokenReady] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return

    // Force refresh to ensure we get a valid token, not a cached expired one
    firebaseUser
      .getIdToken(true)
      .then(freshToken => {
        setToken(freshToken)
        setSessionCookie(firebaseUser)
        setTokenReady(true)
      })
      .catch(() => {
        setTokenReady(false)
      })
  }, [firebaseUser])

  const { isConnected } = useTicketWebSocket({
    ticketId,
    token,
    enabled: !!token && tokenReady,
  })

  // Format message timestamp
  const formatMessageTime = (dateString: string | Date) => {
    const messageDate = new Date(dateString)
    const today = new Date()

    // Check if message is from today
    const isToday = messageDate.toDateString() === today.toDateString()

    if (isToday) {
      return messageDate.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    // Show "Today" or "Hoy" with time
    return `${messageDate.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    })} ${messageDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef<number | null>(null)

  // Auto-scroll only when NEW messages arrive (not on initial load)
  useEffect(() => {
    if (!messages || messages.length === 0) return

    const currentCount = messages.length
    const prevCount = prevMessageCountRef.current

    // Only scroll if this is NOT the initial load and message count increased
    if (prevCount !== null && currentCount > prevCount) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Update the ref for next comparison
    prevMessageCountRef.current = currentCount
  }, [messages])

  // Sort messages by creation date (oldest first, newest last)
  const sortedMessages = messages
    ?.slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <Typography variant="subtitle1">{translations.title}</Typography>
            {messages && messages.length > 0 && <Chip variant="flat">{messages.length}</Chip>}
          </div>
          {/* WebSocket connection indicator */}
          <div
            className="flex items-center gap-1"
            title={isConnected ? 'Connected' : 'Disconnected'}
          >
            {isConnected ? (
              <Wifi className="text-success" size={16} />
            ) : (
              <WifiOff className="text-default-300" size={16} />
            )}
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <Typography color="muted" variant="body2">
                {translations.loadingMessages}
              </Typography>
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 text-default-300" size={48} />
              <Typography color="muted" variant="body2">
                {translations.noMessages}
              </Typography>
            </div>
          ) : (
            <div className="min-h-[204px] max-h-[60vh] flex-1 space-y-2 overflow-y-auto px-2 py-4 lg:max-h-none">
              {sortedMessages?.map(message => {
                const isCurrentUser = currentUser?.id === message.userId
                const userName =
                  message.user?.firstName && message.user?.lastName
                    ? `${message.user.firstName} ${message.user.lastName}`
                    : message.user?.displayName || message.user?.email || 'Unknown User'

                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`group relative max-w-[90%] px-3 py-2 shadow-sm sm:max-w-[75%] ${
                        message.isInternal
                          ? 'rounded-2xl border-2 border-warning-400 bg-warning-100'
                          : isCurrentUser
                            ? 'rounded-2xl rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-2xl rounded-bl-sm bg-default-200 text-default-900'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className="mb-0.5 text-xs font-semibold text-primary-600">{userName}</p>
                      )}
                      {message.isInternal && (
                        <Chip className="mb-1" color="warning" variant="flat">
                          {translations.internalMessage}
                        </Chip>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.message}
                      </p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, idx) => (
                            <AttachmentDisplay
                              key={idx}
                              attachment={attachment}
                              downloadLabel={translations.downloadFile}
                              isCurrentUser={isCurrentUser}
                            />
                          ))}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span
                          className={`text-[10px] ${isCurrentUser ? 'text-primary-foreground/60' : 'text-default-500'}`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isCurrentUser && (
                          <svg
                            className="h-4 w-4 text-primary-foreground/60"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="mt-auto shrink-0" />
          <Divider className="shrink-0" />

          <SendMessageForm
            isTicketClosed={isTicketClosed}
            ticketId={ticketId}
            translations={{
              messagePlaceholder: translations.messagePlaceholder,
              internalCheckbox: translations.internalCheckbox,
              sendButton: translations.sendButton,
              sending: translations.sending,
              success: translations.success,
              error: translations.error,
              ticketClosed: translations.ticketClosed,
              attachFiles: translations.attachFiles,
              dropFilesHere: translations.dropFilesHere,
              invalidFileType: translations.invalidFileType,
              fileTooLarge: translations.fileTooLarge,
              uploading: translations.uploading,
              removeFile: translations.removeFile,
            }}
          />

          {/* Attachments Gallery - Accordion at the bottom */}
          {messages && messages.length > 0 && (
            <AttachmentsGallery
              locale={locale}
              messages={messages}
              translations={{
                title: translations.galleryTitle || translations.attachments,
                noAttachments: translations.galleryNoAttachments || 'No attachments',
                images: translations.galleryImages || 'Images',
                videos: translations.galleryVideos || 'Videos',
                documents: translations.galleryDocuments || 'Documents',
                uploadedBy: translations.galleryUploadedBy || 'Uploaded by',
                showAll: translations.galleryShowAll || 'Show all',
                showLess: translations.galleryShowLess || 'Show less',
              }}
            />
          )}
        </div>
      </CardBody>
    </Card>
  )
}
