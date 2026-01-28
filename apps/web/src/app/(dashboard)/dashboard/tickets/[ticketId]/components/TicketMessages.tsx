'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Divider } from '@/ui/components/divider'
import { MessageSquare, Wifi, WifiOff } from 'lucide-react'
import { useTicketMessages, useTicketWebSocket } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { SendMessageForm } from './SendMessageForm'
import { getSessionCookie } from '@/libs/cookies'
import { useUser } from '@/contexts'

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
}

export interface ITicketMessagesProps {
  ticketId: string
  ticketStatus: string
  locale: string
  translations: ITicketMessagesTranslations
}

export function TicketMessages({
  ticketId,
  ticketStatus,
  locale,
  translations,
}: ITicketMessagesProps) {
  const isTicketClosed = ticketStatus === 'closed' || ticketStatus === 'cancelled'
  const { data, isLoading } = useTicketMessages(ticketId)
  const messages = data?.data
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user: currentUser } = useUser()

  // Connect to WebSocket for real-time updates
  // Initialize token synchronously to avoid race condition
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getSessionCookie() || ''
    }
    return ''
  })

  // Keep token updated if it changes (e.g., token refresh)
  useEffect(() => {
    const sessionToken = getSessionCookie()
    if (sessionToken && sessionToken !== token) {
      setToken(sessionToken)
    }
  }, [token])

  const { isConnected } = useTicketWebSocket({
    ticketId,
    token,
    enabled: !!token,
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
    <Card>
      <CardHeader>
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
      <CardBody>
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Typography color="muted" variant="body2">
                {translations.loadingMessages}
              </Typography>
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 text-default-300" size={48} />
              <Typography color="muted" variant="body2">
                {translations.noMessages}
              </Typography>
            </div>
          ) : (
            <div className="h-[204px] space-y-2 overflow-y-auto px-2 py-4">
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
                      className={`group relative max-w-[75%] px-3 py-2 shadow-sm ${
                        message.isInternal
                          ? 'rounded-2xl border-2 border-warning-400 bg-warning-100'
                          : isCurrentUser
                            ? 'rounded-2xl rounded-br-md bg-[#4CAF50] text-white'
                            : 'rounded-2xl rounded-bl-md bg-default-200 text-default-900'
                      }`}
                    >
                      {!isCurrentUser && (
                        <Typography className="mb-0.5 text-xs font-semibold text-primary-600">
                          {userName}
                        </Typography>
                      )}
                      {message.isInternal && (
                        <Chip className="mb-1" color="warning" variant="flat">
                          {translations.internalMessage}
                        </Chip>
                      )}
                      <Typography className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.message}
                      </Typography>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, idx) => (
                            <a
                              key={idx}
                              className={`flex items-center gap-2 text-xs hover:underline ${
                                isCurrentUser ? 'text-white' : 'text-primary'
                              }`}
                              href={attachment.url}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <span>{attachment.name}</span>
                              <span
                                className={isCurrentUser ? 'text-white/80' : 'text-default-400'}
                              >
                                ({(attachment.size / 1024).toFixed(2)} KB)
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <Typography
                          className={`text-[10px] ${isCurrentUser ? 'text-white/80' : 'text-default-500'}`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </Typography>
                        {isCurrentUser && (
                          <svg
                            className="h-4 w-4 text-white/80"
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

          <Divider />

          <SendMessageForm
            ticketId={ticketId}
            isTicketClosed={isTicketClosed}
            translations={{
              messagePlaceholder: translations.messagePlaceholder,
              internalCheckbox: translations.internalCheckbox,
              sendButton: translations.sendButton,
              sending: translations.sending,
              success: translations.success,
              error: translations.error,
              ticketClosed: translations.ticketClosed,
            }}
          />
        </div>
      </CardBody>
    </Card>
  )
}
