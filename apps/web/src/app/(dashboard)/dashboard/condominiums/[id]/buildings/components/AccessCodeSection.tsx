'use client'

import type { TCondominiumAccessCode } from '@packages/domain'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, RefreshCw } from 'lucide-react'

import { GenerateCodeModal } from './GenerateCodeModal'

import { Button } from '@/ui/components/button'
import { useDisclosure } from '@/ui/components/modal'
import { CodeSnippet } from '@/ui/components/code-snippet'

interface IAccessCodeSectionProps {
  condominiumId: string
  initialCode: TCondominiumAccessCode | null
  translations: {
    title: string
    noCode: string
    generate: string
    regenerate: string
    expiresLabel: string
    copiedMessage: string
    modal: {
      title: string
      warning: string
      validity: string
      validityOptions: {
        '1_day': string
        '7_days': string
        '1_month': string
        '1_year': string
      }
      cancel: string
      generate: string
      generating: string
      success: string
      error: string
    }
  }
}

export function AccessCodeSection({
  condominiumId,
  initialCode,
  translations,
}: IAccessCodeSectionProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [code, setCode] = useState<TCondominiumAccessCode | null>(initialCode)
  const router = useRouter()

  const handleGenerated = (newCode: TCondominiumAccessCode) => {
    setCode(newCode)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-default-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="text-success" size={18} />
          <span className="text-sm font-semibold">{translations.title}</span>
        </div>
        <Button
          size="sm"
          startContent={code ? <RefreshCw size={14} /> : <KeyRound size={14} />}
          variant={code ? 'flat' : 'bordered'}
          onPress={onOpen}
        >
          {code ? translations.regenerate : translations.generate}
        </Button>
      </div>

      {code ? (
        <CodeSnippet
          code={code.code}
          copiedMessage={translations.copiedMessage}
          expiresAt={
            typeof code.expiresAt === 'string' ? code.expiresAt : code.expiresAt.toISOString()
          }
          expiresLabel={translations.expiresLabel}
        />
      ) : (
        <p className="text-sm text-default-400">{translations.noCode}</p>
      )}

      <GenerateCodeModal
        condominiumId={condominiumId}
        hasExistingCode={!!code}
        isOpen={isOpen}
        translations={translations.modal}
        onClose={onClose}
        onGenerated={handleGenerated}
      />
    </div>
  )
}
