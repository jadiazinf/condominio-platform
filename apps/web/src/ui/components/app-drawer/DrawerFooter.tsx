'use client'

import { DrawerFooter as HeroUIDrawerFooter } from '@heroui/drawer'
import { Button } from '@heroui/button'
import { Divider } from '@heroui/divider'
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
    <HeroUIDrawerFooter className="flex-col gap-2 p-4">
      <Divider className="mb-2" />
      <Button
        className="w-full justify-start text-danger"
        startContent={<LogOut size={18} />}
        variant="light"
        onPress={handleLogout}
      >
        {t('nav.logout')}
      </Button>
    </HeroUIDrawerFooter>
  )
}
