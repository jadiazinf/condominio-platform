'use client'

import { DrawerFooter as HeroUIDrawerFooter } from '@heroui/drawer'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useTranslation } from '@/contexts'

interface IDrawerFooterProps {
  onClose: () => void
}

export function DrawerFooter({ onClose }: IDrawerFooterProps) {
  const router = useRouter()
  const { t } = useTranslation()

  function handleLogout() {
    onClose()
    router.push('/loading?signout=true')
  }

  return (
    <HeroUIDrawerFooter className="flex-col gap-0 p-0">
      <div className="h-px w-full bg-divider" />
      <button
        className="flex items-center gap-3 w-full px-5 py-3.5 text-danger/70 hover:text-danger hover:bg-danger/5 transition-colors"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        <span className="text-small font-medium">{t('nav.logout')}</span>
      </button>
    </HeroUIDrawerFooter>
  )
}
