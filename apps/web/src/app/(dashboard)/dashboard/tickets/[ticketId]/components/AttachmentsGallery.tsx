'use client'

import { useState, useMemo } from 'react'
import { Accordion, AccordionItem } from '@heroui/accordion'
import { Paperclip, Image as ImageIcon, Video, FileText, Download, X, Play } from 'lucide-react'
import { type TAttachment, type TSupportTicketMessage, getFileTypeCategory, formatFileSize } from '@packages/domain'

import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'

interface IAttachmentWithMeta {
  attachment: TAttachment
  uploadedBy: string
  uploadedAt: Date
  messageId: string
}

interface IAttachmentsGalleryProps {
  messages: TSupportTicketMessage[]
  locale: string
  translations: {
    title: string
    noAttachments: string
    images: string
    videos: string
    documents: string
    uploadedBy: string
    showAll: string
    showLess: string
  }
}

// Modal for viewing full content
function MediaModal({
  item,
  onClose,
}: {
  item: IAttachmentWithMeta | null
  onClose: () => void
}) {
  if (!item) return null

  const category = getFileTypeCategory(item.attachment.mimeType)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        type="button"
        onClick={onClose}
      >
        <X size={24} />
      </button>

      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {category === 'image' && (
          <img
            alt={item.attachment.name}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            src={item.attachment.url}
          />
        )}

        {category === 'video' && (
          <video
            autoPlay
            className="max-h-[85vh] max-w-[90vw] rounded-lg"
            controls
          >
            <source src={item.attachment.url} type={item.attachment.mimeType} />
          </video>
        )}

        {/* File info */}
        <div className="mt-3 text-center">
          <Typography className="text-white">{item.attachment.name}</Typography>
          <Typography className="text-sm text-white/70">
            {formatFileSize(item.attachment.size)} • {item.uploadedBy}
          </Typography>
        </div>
      </div>
    </div>
  )
}

export function AttachmentsGallery({ messages, locale, translations }: IAttachmentsGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<IAttachmentWithMeta | null>(null)

  // Extract all attachments with metadata
  const allAttachments = useMemo(() => {
    const attachments: IAttachmentWithMeta[] = []

    for (const message of messages) {
      if (message.attachments && message.attachments.length > 0) {
        const userName = message.user?.firstName && message.user?.lastName
          ? `${message.user.firstName} ${message.user.lastName}`
          : message.user?.displayName || message.user?.email || 'Unknown'

        for (const attachment of message.attachments) {
          attachments.push({
            attachment,
            uploadedBy: userName,
            uploadedAt: new Date(message.createdAt),
            messageId: message.id,
          })
        }
      }
    }

    // Sort by date, newest first
    return attachments.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
  }, [messages])

  const totalCount = allAttachments.length

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (totalCount === 0) {
    return null
  }

  // Render preview based on file type
  const renderPreview = (item: IAttachmentWithMeta, idx: number) => {
    const category = getFileTypeCategory(item.attachment.mimeType)

    if (category === 'image') {
      return (
        <button
          key={`${item.messageId}-${idx}`}
          className="group relative aspect-square overflow-hidden rounded-lg bg-default-100"
          type="button"
          onClick={() => setSelectedItem(item)}
        >
          <img
            alt={item.attachment.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            src={item.attachment.url}
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <Typography className="truncate text-xs text-white">
              {item.attachment.name}
            </Typography>
            <Typography className="text-[10px] text-white/70">
              {item.uploadedBy}
            </Typography>
          </div>
        </button>
      )
    }

    if (category === 'video') {
      return (
        <button
          key={`${item.messageId}-${idx}`}
          className="group relative aspect-video overflow-hidden rounded-lg bg-default-100"
          type="button"
          onClick={() => setSelectedItem(item)}
        >
          <video
            className="h-full w-full object-cover"
            muted
            preload="metadata"
          >
            <source src={item.attachment.url} type={item.attachment.mimeType} />
          </video>
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/50">
            <div className="rounded-full bg-white/90 p-3">
              <Play className="text-default-700" size={24} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <Typography className="truncate text-xs text-white">
              {item.attachment.name}
            </Typography>
            <Typography className="text-[10px] text-white/70">
              {formatFileSize(item.attachment.size)} • {item.uploadedBy}
            </Typography>
          </div>
        </button>
      )
    }

    // PDF / Documents
    return (
      <a
        key={`${item.messageId}-${idx}`}
        className="flex items-center gap-3 rounded-lg bg-default-100 p-3 transition-colors hover:bg-default-200"
        href={item.attachment.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
          <FileText className="text-red-500" size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <Typography className="truncate text-sm font-medium">
            {item.attachment.name}
          </Typography>
          <Typography className="text-xs text-default-500">
            {formatFileSize(item.attachment.size)} • {item.uploadedBy} • {formatDate(item.uploadedAt)}
          </Typography>
        </div>
        <Download className="flex-shrink-0 text-default-400" size={18} />
      </a>
    )
  }

  return (
    <>
      <Accordion
        className="px-0"
        itemClasses={{
          base: 'py-0',
          title: 'font-medium text-sm',
          trigger: 'py-3 data-[hover=true]:bg-default-50 rounded-lg px-2 -mx-2',
          content: 'pt-0 pb-4',
        }}
        variant="light"
      >
        <AccordionItem
          key="attachments"
          aria-label={translations.title}
          startContent={<Paperclip className="text-default-500" size={18} />}
          title={
            <div className="flex items-center gap-2">
              <span>{translations.title}</span>
              <Chip size="sm" variant="flat">{totalCount}</Chip>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Grid of all attachments */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allAttachments.map((item, idx) => renderPreview(item, idx))}
            </div>
          </div>
        </AccordionItem>
      </Accordion>

      {/* Modal for viewing full content */}
      <MediaModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  )
}
