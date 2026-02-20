'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface NoCondominiumsProps {
  onContactSupport?: () => void
}

export function NoCondominiums({ onContactSupport }: NoCondominiumsProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [accessCode, setAccessCode] = useState('')

  const handleEnterCode = () => {
    if (accessCode.length >= 6) {
      router.push(`/dashboard/join-condominium?code=${accessCode.toUpperCase()}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-default-100 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-default-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <Typography color="default" variant="h3">
          {t('condominium.selection.noCondominiums')}
        </Typography>
        <Typography color="muted" variant="body2">
          {t('condominium.selection.noCondominiumsDescription')}
        </Typography>
      </div>

      {/* Access code entry */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Typography color="default" variant="body2" className="font-medium">
          {t('condominium.selection.enterAccessCode')}
        </Typography>
        <Typography color="muted" variant="caption">
          {t('condominium.selection.enterCodeDescription')}
        </Typography>
        <div className="flex gap-2">
          <Input
            value={accessCode}
            onValueChange={(val) => setAccessCode(val.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="font-mono tracking-widest"
            startContent={<KeyRound size={16} className="text-default-400" />}
            onKeyDown={(e) => e.key === 'Enter' && handleEnterCode()}
          />
          <Button
            color="primary"
            onPress={handleEnterCode}
            isDisabled={accessCode.length < 6}
          >
            {t('condominium.selection.validateCode')}
          </Button>
        </div>
      </div>

      {onContactSupport && (
        <Button color="default" variant="flat" onPress={onContactSupport}>
          {t('condominium.selection.contactSupport')}
        </Button>
      )}
    </div>
  )
}
