'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Send,
  Wifi,
  WifiOff,
  MessageSquare,
  Lock,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  RefreshCw,
  Download,
} from 'lucide-react'
import {
  useUserTicket,
  useUserTicketMessages,
  useCreateUserTicketMessage,
  useUserUpdateTicketStatus,
  useUserResolveTicket,
  useUserCloseTicket,
  useTicketWebSocket,
} from '@packages/http-client'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  formatFileSize,
  getFileTypeCategory,
} from '@packages/domain'

import { useTicketAttachmentUpload } from '../../tickets/[ticketId]/hooks'

import { useTranslation, useAuth, useUser, useManagementCompany } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Textarea } from '@/ui/components/textarea'
import { Progress } from '@/ui/components/progress'
import { useToast } from '@/ui/components/toast'
import { setSessionCookie } from '@/libs/cookies'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACCEPT_STRING = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
].join(',')

function getFileIcon(mimeType: string) {
  const category = getFileTypeCategory(mimeType)

  switch (category) {
    case 'image':
      return <ImageIcon className="text-blue-500" size={16} />
    case 'video':
      return <Video className="text-purple-500" size={16} />
    case 'pdf':
      return <FileText className="text-red-500" size={16} />
    default:
      return <FileText className="text-default-400" size={16} />
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getChannelLabel(channel: string): string {
  switch (channel) {
    case 'resident_to_admin':
      return 'Administradora'
    case 'resident_to_support':
    case 'admin_to_support':
      return 'Soporte'
    default:
      return channel
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Abierto'
    case 'in_progress':
      return 'En progreso'
    case 'waiting_customer':
      return 'Esperando respuesta'
    case 'resolved':
      return 'Resuelto'
    case 'closed':
      return 'Cerrado'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

function getStatusColor(
  status: string
): 'primary' | 'warning' | 'success' | 'danger' | 'default' | 'secondary' {
  switch (status) {
    case 'open':
      return 'primary'
    case 'in_progress':
      return 'warning'
    case 'waiting_customer':
      return 'secondary'
    case 'resolved':
      return 'success'
    case 'closed':
      return 'default'
    case 'cancelled':
      return 'danger'
    default:
      return 'default'
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'low':
      return 'Baja'
    case 'medium':
      return 'Media'
    case 'high':
      return 'Alta'
    case 'urgent':
      return 'Urgente'
    default:
      return priority
  }
}

function getPriorityColor(priority: string): 'default' | 'primary' | 'warning' | 'danger' {
  switch (priority) {
    case 'low':
      return 'default'
    case 'medium':
      return 'primary'
    case 'high':
      return 'warning'
    case 'urgent':
      return 'danger'
    default:
      return 'default'
  }
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface ITicketDetailClientProps {
  ticketId: string
}

export function TicketDetailClient({ ticketId }: ITicketDetailClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const { user: currentUser } = useUser()
  const { user: firebaseUser } = useAuth()
  const { isAdmin } = useManagementCompany()

  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: ticketData, isLoading: isLoadingTicket } = useUserTicket(ticketId)
  const ticket = ticketData?.data

  const { data: messagesData, isLoading: isLoadingMessages } = useUserTicketMessages(ticketId)
  const messages = messagesData?.data

  // ── Admin ticket management (for resident_to_admin tickets) ─────────────

  const canManageTicket = isAdmin && ticket?.channel === 'resident_to_admin'

  const updateStatusMutation = useUserUpdateTicketStatus(ticketId)
  const resolveMutation = useUserResolveTicket(ticketId)
  const closeMutation = useUserCloseTicket(ticketId)

  const handleResolve = () => {
    if (!currentUser) return
    toast.promise(
      resolveMutation.mutateAsync({ resolvedBy: currentUser.id }).then(() => router.refresh()),
      { loading: 'Resolviendo...', success: 'Ticket resuelto', error: 'Error al resolver' }
    )
  }

  const handleClose = () => {
    if (!currentUser) return
    toast.promise(
      closeMutation.mutateAsync({ closedBy: currentUser.id }).then(() => router.refresh()),
      { loading: 'Cerrando...', success: 'Ticket cerrado', error: 'Error al cerrar' }
    )
  }

  const handleStatusChange = (newStatus: string) => {
    toast.promise(
      updateStatusMutation
        .mutateAsync({
          status: newStatus as
            | 'open'
            | 'in_progress'
            | 'waiting_customer'
            | 'resolved'
            | 'closed'
            | 'cancelled',
        })
        .then(() => router.refresh()),
      { loading: 'Actualizando...', success: 'Estado actualizado', error: 'Error al actualizar' }
    )
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────

  const [token, setToken] = useState('')
  const [tokenReady, setTokenReady] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return

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

  // ── File attachments ──────────────────────────────────────────────────────

  const handleValidationError = useCallback(
    (errors: { file: File; reason: string; maxSize?: number }[]) => {
      for (const error of errors) {
        if (error.reason === 'invalid_type') {
          toast.error(`Tipo de archivo no permitido: ${error.file.name}`)
        } else if (error.reason === 'file_too_large') {
          toast.error(
            `Archivo muy grande: ${error.file.name} (máx ${error.maxSize ? formatFileSize(error.maxSize) : 'desconocido'})`
          )
        }
      }
    },
    [toast]
  )

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

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files

      if (files && files.length > 0) addFiles(files)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [addFiles]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

      if (files && files.length > 0) addFiles(files)
    },
    [addFiles]
  )

  // ── Send message ──────────────────────────────────────────────────────────

  const { mutateAsync: sendMessage, isPending: isSending } = useCreateUserTicketMessage(ticketId, {
    onSuccess: () => {
      setMessage('')
      clearAll()
    },
    onError: () => {
      toast.error(
        t('resident.support.detail.sendError') !== 'resident.support.detail.sendError'
          ? t('resident.support.detail.sendError')
          : 'Error al enviar el mensaje'
      )
    },
  })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isUploading) return
    if (!message.trim() && completedAttachments.length === 0) return
    if (isSending) return

    await sendMessage({
      message: message.trim(),
      isInternal: false,
      attachments: completedAttachments.length > 0 ? completedAttachments : null,
    })
  }

  // ── Auto-scroll ─────────────────────────────────────────────────────────

  const prevMessageCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (!messages || messages.length === 0) return

    const currentCount = messages.length
    const prevCount = prevMessageCountRef.current

    // Scroll on first load or new messages
    if (prevCount === null || currentCount > prevCount) {
      messagesEndRef.current?.scrollIntoView({ behavior: prevCount === null ? 'auto' : 'smooth' })
    }

    prevMessageCountRef.current = currentCount
  }, [messages])

  // ── Format time ───────────────────────────────────────────────────────────

  const formatMessageTime = (dateString: string | Date) => {
    const messageDate = new Date(dateString)
    const today = new Date()
    const isToday = messageDate.toDateString() === today.toDateString()

    if (isToday) {
      return messageDate.toLocaleTimeString('es', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return `${messageDate.toLocaleDateString('es', {
      month: 'short',
      day: 'numeric',
    })} ${messageDate.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  // ── Sort messages ─────────────────────────────────────────────────────────

  const sortedMessages = messages
    ?.slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoadingTicket) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <MessageSquare className="text-default-300" size={56} />
        <Typography color="muted">Ticket no encontrado</Typography>
        <Button size="sm" variant="flat" onPress={() => router.push('/dashboard/support')}>
          Volver a soporte
        </Button>
      </div>
    )
  }

  const isTicketClosed =
    ticket.status === 'closed' || ticket.status === 'cancelled' || ticket.status === 'resolved'

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-default-200 pb-3">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => router.push('/dashboard/support')}
        >
          <ArrowLeft size={20} />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col">
          <Typography className="truncate font-semibold">{ticket.subject}</Typography>
          <div className="flex items-center gap-2 text-xs text-default-400">
            <span>#{ticket.ticketNumber}</span>
            <span>·</span>
            <span>{getChannelLabel(ticket.channel)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Chip color={getStatusColor(ticket.status)} size="sm" variant="flat">
            {getStatusLabel(ticket.status)}
          </Chip>
          <Chip color={getPriorityColor(ticket.priority)} size="sm" variant="flat">
            {getPriorityLabel(ticket.priority)}
          </Chip>
          <div title={isConnected ? 'Conectado en tiempo real' : 'Sin conexión en tiempo real'}>
            {isConnected ? (
              <Wifi className="text-success" size={16} />
            ) : (
              <WifiOff className="text-default-300" size={16} />
            )}
          </div>
        </div>
      </div>

      {/* ── Admin actions (for resident_to_admin tickets) ────────────────── */}
      {canManageTicket && !isTicketClosed && (
        <div className="flex items-center gap-2 border-b border-default-200 px-4 py-2">
          <Typography className="text-xs text-default-400">Acciones:</Typography>
          {ticket.status === 'open' && (
            <Button
              color="warning"
              isLoading={updateStatusMutation.isPending}
              size="sm"
              variant="flat"
              onPress={() => handleStatusChange('in_progress')}
            >
              En progreso
            </Button>
          )}
          {(ticket.status === 'open' || ticket.status === 'in_progress') && (
            <Button
              color="secondary"
              isLoading={updateStatusMutation.isPending}
              size="sm"
              variant="flat"
              onPress={() => handleStatusChange('waiting_customer')}
            >
              Esperando respuesta
            </Button>
          )}
          {!ticket.resolvedAt && (
            <Button
              color="success"
              isLoading={resolveMutation.isPending}
              size="sm"
              variant="flat"
              onPress={handleResolve}
            >
              Resolver
            </Button>
          )}
          <Button
            color="danger"
            isLoading={closeMutation.isPending}
            size="sm"
            variant="flat"
            onPress={handleClose}
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-2 py-4 sm:px-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : !sortedMessages || sortedMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="text-default-200" size={48} />
            <Typography color="muted" variant="body2">
              {t('resident.support.detail.noMessages') !== 'resident.support.detail.noMessages'
                ? t('resident.support.detail.noMessages')
                : 'No hay mensajes aún. Envía el primer mensaje.'}
            </Typography>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {sortedMessages.map(msg => {
              const isCurrentUser = currentUser?.id === msg.userId
              const userName =
                msg.user?.firstName && msg.user?.lastName
                  ? `${msg.user.firstName} ${msg.user.lastName}`
                  : msg.user?.displayName || msg.user?.email || 'Usuario'

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {!isCurrentUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {getUserInitials(userName)}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                      isCurrentUser
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm bg-default-100'
                    }`}
                  >
                    {!isCurrentUser && (
                      <p className="mb-0.5 text-xs font-semibold text-primary">{userName}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {msg.message}
                    </p>
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {msg.attachments.map(
                          (
                            attachment: {
                              url: string
                              name: string
                              mimeType?: string
                              size?: number
                            },
                            idx: number
                          ) => {
                            const category = attachment.mimeType
                              ? getFileTypeCategory(attachment.mimeType)
                              : null
                            const isImage = category === 'image'

                            if (isImage) {
                              return (
                                <a
                                  key={idx}
                                  href={attachment.url}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  <img
                                    alt={attachment.name}
                                    className="max-h-48 rounded-lg object-cover"
                                    src={attachment.url}
                                  />
                                </a>
                              )
                            }

                            return (
                              <a
                                key={idx}
                                className={`flex items-center gap-2 rounded-lg p-2 ${
                                  isCurrentUser
                                    ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                                    : 'bg-default-200/50 hover:bg-default-200'
                                }`}
                                href={attachment.url}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {attachment.mimeType ? (
                                  getFileIcon(attachment.mimeType)
                                ) : (
                                  <FileText size={16} />
                                )}
                                <span className="min-w-0 flex-1 truncate text-xs">
                                  {attachment.name}
                                </span>
                                <Download className="shrink-0 opacity-60" size={14} />
                              </a>
                            )
                          }
                        )}
                      </div>
                    )}
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 ${
                        isCurrentUser ? 'text-primary-foreground/60' : 'text-default-400'
                      }`}
                    >
                      <span className="text-[10px]">{formatMessageTime(msg.createdAt)}</span>
                      {isCurrentUser && (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
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
      </div>

      {/* ── Message input ───────────────────────────────────────────────────── */}
      <div
        className={`border-t border-default-200 px-2 py-3 sm:px-4 transition-colors ${
          isDragging ? 'bg-primary-50 ring-2 ring-primary ring-inset' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          multiple
          accept={ACCEPT_STRING}
          aria-label="Adjuntar archivos"
          className="hidden"
          type="file"
          onChange={handleFileSelect}
        />

        {isTicketClosed ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-default-100 p-3">
            <Lock className="text-default-400" size={16} />
            <Typography color="muted" variant="body2">
              {t('resident.support.detail.ticketClosed') !== 'resident.support.detail.ticketClosed'
                ? t('resident.support.detail.ticketClosed')
                : 'Este ticket está cerrado. No se pueden enviar más mensajes.'}
            </Typography>
          </div>
        ) : (
          <form className="mx-auto flex max-w-3xl flex-col gap-2" onSubmit={handleSend}>
            {/* Drag overlay */}
            {isDragging && (
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary-50 p-6">
                <Typography color="primary" variant="body2">
                  Suelta los archivos aquí
                </Typography>
              </div>
            )}

            {/* File previews */}
            {uploadingFiles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {uploadingFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-lg bg-default-100 p-2"
                  >
                    {/* Thumbnail or icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-default-200">
                      {file.file.type.startsWith('image/') &&
                      file.status === 'completed' &&
                      file.attachment ? (
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
                      <p className="truncate text-xs">{file.file.name}</p>
                      <p className="text-[10px] text-default-400">
                        {formatFileSize(file.file.size)}
                      </p>
                      {(file.status === 'uploading' || file.status === 'pending') && (
                        <Progress
                          className="mt-0.5"
                          color="primary"
                          size="sm"
                          value={file.progress}
                        />
                      )}
                      {file.status === 'error' && (
                        <p className="text-[10px] text-danger">{file.error || 'Error al subir'}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-0.5">
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

            {/* Input row */}
            {!isDragging && (
              <div className="flex items-end gap-2">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="text-default-400" size={18} />
                </Button>
                <div className="flex-1">
                  <Textarea
                    maxRows={4}
                    minRows={1}
                    placeholder={
                      t('resident.support.detail.messagePlaceholder') !==
                      'resident.support.detail.messagePlaceholder'
                        ? t('resident.support.detail.messagePlaceholder')
                        : 'Escribe un mensaje...'
                    }
                    value={message}
                    variant="bordered"
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>
                <Button
                  isIconOnly
                  color="primary"
                  isDisabled={
                    (!message.trim() && completedAttachments.length === 0) ||
                    isSending ||
                    isUploading
                  }
                  isLoading={isSending || isUploading}
                  type="submit"
                >
                  {!isSending && !isUploading && <Send size={18} />}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
