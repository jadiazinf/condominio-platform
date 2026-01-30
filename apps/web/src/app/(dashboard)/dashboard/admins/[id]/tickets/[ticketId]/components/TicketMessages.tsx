'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardHeader, CardBody, CardFooter } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Textarea } from '@/ui/components/textarea'
import { Avatar } from '@/ui/components/avatar-base'
import { Send, MessageSquare } from 'lucide-react'

import {
  useTicketMessages,
  useMutation,
  createTicketMessage,
  useQueryClient,
  supportTicketMessageKeys,
  supportTicketKeys,
} from '@packages/http-client'
import { useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface TicketMessagesProps {
  ticketId: string
  ticketStatus: string
}

export function TicketMessages({ ticketId, ticketStatus }: TicketMessagesProps) {
  const isTicketClosed = ticketStatus === 'closed' || ticketStatus === 'cancelled'
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading } = useTicketMessages(ticketId, {
    enabled: !!token && !!ticketId,
  })

  const createMessageMutation = useMutation({
    mutationFn: ({ message }: { message: string }) =>
      createTicketMessage(ticketId, {
        message,
        isInternal: false,
        attachments: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportTicketMessageKeys.list(ticketId),
      })
      queryClient.invalidateQueries({
        queryKey: supportTicketKeys.detail(ticketId),
      })
      setMessage('')
    },
  })

  const messages = data?.data || []

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef<number | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-scroll only when NEW messages arrive (not on initial load)
  useEffect(() => {
    if (messages.length === 0) return

    const currentCount = messages.length
    const prevCount = prevMessageCountRef.current

    // Only scroll if this is NOT the initial load and message count increased
    if (prevCount !== null && currentCount > prevCount) {
      scrollToBottom()
    }

    // Update the ref for next comparison
    prevMessageCountRef.current = currentCount
  }, [messages])

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !firebaseUser) return

    await createMessageMutation.mutateAsync({
      message: message.trim(),
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <MessageSquare className="text-default-400" size={20} />
        <Typography variant="subtitle1">Mensajes</Typography>
        <Typography className="ml-auto" color="muted" variant="caption">
          {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
        </Typography>
      </CardHeader>

      <CardBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="mb-2 text-default-300" size={40} />
            <Typography color="muted" variant="body2">
              No hay mensajes aún
            </Typography>
          </div>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
            {messages.map(msg => (
              <div key={msg.id} className="flex gap-3">
                <Avatar name={msg.user?.displayName || 'Usuario'} />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <Typography variant="body2" weight="semibold">
                      {msg.user?.displayName || 'Usuario'}
                    </Typography>
                    <Typography color="muted" variant="caption">
                      {formatDate(msg.createdAt)}
                    </Typography>
                  </div>
                  <div className="mt-1 rounded-lg bg-default-100 p-3">
                    <Typography variant="body2">{msg.message}</Typography>
                  </div>
                  {msg.isInternal && (
                    <Typography className="mt-1" color="warning" variant="caption">
                      (Mensaje interno - no visible para el cliente)
                    </Typography>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardBody>

      <CardFooter className="flex-col gap-2">
        {isTicketClosed ? (
          <div className="w-full rounded-lg bg-default-100 p-4 text-center">
            <Typography color="muted" variant="body2">
              Este ticket está cerrado. No se pueden enviar más mensajes.
            </Typography>
          </div>
        ) : (
          <>
            <Textarea
              maxRows={4}
              minRows={2}
              placeholder="Escribe un mensaje..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <div className="flex w-full justify-end">
              <Button
                color="primary"
                isDisabled={!message.trim()}
                isLoading={createMessageMutation.isPending}
                startContent={<Send size={16} />}
                onPress={handleSendMessage}
              >
                Enviar
              </Button>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
