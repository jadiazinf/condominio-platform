'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/ui/components/textarea'
import { Button } from '@/ui/components/button'
import { Checkbox } from '@/ui/components/checkbox'
import { Send } from 'lucide-react'
import { useCreateTicketMessage } from '@packages/http-client'

import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'

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
  }
}

export function SendMessageForm({ ticketId, isTicketClosed = false, translations }: ISendMessageFormProps) {
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()

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
    },
    onError: () => {
      toast.error(translations.error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) return

    createMessage({
      message: message.trim(),
      isInternal,
      attachments: null,
    })
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

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
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

      <div className="flex items-center justify-between gap-4">
        <Checkbox isSelected={isInternal} onValueChange={setIsInternal}>
          {translations.internalCheckbox}
        </Checkbox>

        <Button
          className="bg-[#25D366] text-white hover:bg-[#20BA5A]"
          isDisabled={!message.trim() || isPending}
          isLoading={isPending}
          startContent={!isPending ? <Send size={16} /> : null}
          type="submit"
        >
          {isPending ? translations.sending : translations.sendButton}
        </Button>
      </div>
    </form>
  )
}
