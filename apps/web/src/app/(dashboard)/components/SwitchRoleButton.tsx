'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { Tooltip } from '@/ui/components/tooltip'
import { useActiveRole, useTranslation } from '@/contexts'
import { clearActiveRoleCookie } from '@/libs/cookies'

export function SwitchRoleButton() {
  const router = useRouter()
  const { t } = useTranslation()
  const { availableRoles, clearActiveRole } = useActiveRole()

  if (availableRoles.length <= 1) {
    return null
  }

  function handleSwitchRole() {
    clearActiveRole()
    clearActiveRoleCookie()
    router.push('/select-role')
  }

  return (
    <Tooltip content={t('nav.switchRole')}>
      <Button isIconOnly variant="light" onPress={handleSwitchRole}>
        <ArrowLeftRight size={20} />
      </Button>
    </Tooltip>
  )
}
