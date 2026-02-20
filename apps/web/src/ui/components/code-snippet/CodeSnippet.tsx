'use client'

import { useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import { useState } from 'react'

interface ICodeSnippetProps {
  code: string
  label?: string
  expiresAt?: string
  expiresLabel?: string
  copiedMessage?: string
  className?: string
}

export function CodeSnippet({
  code,
  label,
  expiresAt,
  expiresLabel,
  copiedMessage = 'Copied!',
  className = '',
}: ICodeSnippetProps) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success(copiedMessage)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      toast.success(copiedMessage)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code, copiedMessage, toast])

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-default-500">{label}</span>
      )}
      <div className="inline-flex items-center gap-2 rounded-lg bg-default-100 border border-default-200 px-4 py-2.5">
        <code className="font-mono text-lg font-bold tracking-widest text-foreground select-all">
          {code}
        </code>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={handleCopy}
          aria-label="Copy code"
          className="ml-2"
        >
          {copied ? (
            <Check size={16} className="text-success" />
          ) : (
            <Copy size={16} className="text-default-500" />
          )}
        </Button>
      </div>
      {formattedExpiry && (
        <span className="text-xs text-default-400">
          {expiresLabel ? `${expiresLabel} ${formattedExpiry}` : formattedExpiry}
        </span>
      )}
    </div>
  )
}
