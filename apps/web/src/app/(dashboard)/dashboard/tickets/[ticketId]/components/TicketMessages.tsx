'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Divider } from '@heroui/divider'
import { MessageSquare, User, Wifi, WifiOff } from 'lucide-react'
import { useTicketMessages, useTicketWebSocket } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { formatDate } from './ticket-helpers'
import { SendMessageForm } from './SendMessageForm'
import { getSessionCookie } from '@/libs/cookies'

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
}

export interface ITicketMessagesProps {
  ticketId: string
  locale: string
  translations: ITicketMessagesTranslations
}

export function TicketMessages({ ticketId, locale, translations }: ITicketMessagesProps) {
  const { data, isLoading } = useTicketMessages(ticketId)
  const messages = data?.data.data

  // Connect to WebSocket for real-time updates
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    const sessionToken = getSessionCookie()
    console.log('[TicketMessages] Session token retrieved:', sessionToken ? `${sessionToken.substring(0, 20)}...` : 'NO TOKEN')
    setToken(sessionToken || '')
  }, [])

  const { isConnected, error: wsError } = useTicketWebSocket({
    ticketId,
    token,
    enabled: !!token,
  })

  useEffect(() => {
    console.log('[TicketMessages] WebSocket status - connected:', isConnected, 'error:', wsError)
  }, [isConnected, wsError])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <Typography variant="subtitle1">{translations.title}</Typography>
            {messages && messages.length > 0 && (
              <Chip size="sm" variant="flat">
                {messages.length}
              </Chip>
            )}
          </div>
          {/* WebSocket connection indicator */}
          <div className="flex items-center gap-1" title={isConnected ? 'Connected' : 'Disconnected'}>
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
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg border p-4 ${
                    message.isInternal
                      ? 'border-warning-200 bg-warning-50'
                      : 'border-default-200 bg-default-50'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="text-default-400" size={16} />
                      <Typography className="font-medium" variant="body2">
                        {message.user?.firstName && message.user?.lastName
                          ? `${message.user.firstName} ${message.user.lastName}`
                          : message.user?.displayName || message.user?.email || 'Usuario'}
                      </Typography>
                      {message.isInternal && (
                        <Chip color="warning" size="sm" variant="flat">
                          {translations.internalMessage}
                        </Chip>
                      )}
                    </div>
                    <Typography color="muted" variant="caption">
                      {formatDate(message.createdAt, locale)}
                    </Typography>
                  </div>
                  <Typography className="whitespace-pre-wrap" variant="body2">
                    {message.message}
                  </Typography>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <Typography className="text-xs font-medium" color="muted">
                        {translations.attachments}:
                      </Typography>
                      {message.attachments.map((attachment, idx) => (
                        <a
                          key={idx}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                          href={attachment.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span>{attachment.name}</span>
                          <span className="text-xs text-default-400">
                            ({(attachment.size / 1024).toFixed(2)} KB)
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Divider />

          <SendMessageForm
            ticketId={ticketId}
            translations={{
              messagePlaceholder: translations.messagePlaceholder,
              internalCheckbox: translations.internalCheckbox,
              sendButton: translations.sendButton,
              sending: translations.sending,
              success: translations.success,
              error: translations.error,
            }}
          />
        </div>
      </CardBody>
    </Card>
  )
}
