'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, RefreshCw } from 'lucide-react'
import type { TCondominiumAccessCode } from '@packages/domain'

import { Button } from '@/ui/components/button'
import { useDisclosure } from '@/ui/components/modal'
import { CodeSnippet } from '@/ui/components/code-snippet'
import { GenerateCodeModal } from './GenerateCodeModal'

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
          <KeyRound size={18} className="text-success" />
          <span className="text-sm font-semibold">{translations.title}</span>
        </div>
        <Button
          size="sm"
          variant={code ? 'flat' : 'bordered'}
          startContent={code ? <RefreshCw size={14} /> : <KeyRound size={14} />}
          onPress={onOpen}
        >
          {code ? translations.regenerate : translations.generate}
        </Button>
      </div>

      {code ? (
        <CodeSnippet
          code={code.code}
          expiresAt={
            typeof code.expiresAt === 'string' ? code.expiresAt : code.expiresAt.toISOString()
          }
          expiresLabel={translations.expiresLabel}
          copiedMessage={translations.copiedMessage}
        />
      ) : (
        <p className="text-sm text-default-400">{translations.noCode}</p>
      )}

      <GenerateCodeModal
        isOpen={isOpen}
        onClose={onClose}
        condominiumId={condominiumId}
        hasExistingCode={!!code}
        translations={translations.modal}
        onGenerated={handleGenerated}
      />
    </div>
  )
}
