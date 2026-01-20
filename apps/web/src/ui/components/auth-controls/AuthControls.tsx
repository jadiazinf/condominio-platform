'use client'

import { LanguageSwitcher } from '@/ui/components/language-switcher'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'

export function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <ThemeSwitch />
      <LanguageSwitcher variant="icon" />
    </div>
  )
}
