'use client'

import { RadioGroup, Radio } from '@/ui/components/radio'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

import { useTranslation } from '@/contexts'

import type { LucideIcon } from 'lucide-react'

interface IThemeOption {
  value: string
  icon: LucideIcon
  labelKey: string
  descriptionKey: string
}

const THEME_OPTIONS: IThemeOption[] = [
  {
    value: 'light',
    icon: Sun,
    labelKey: 'settings.appearance.lightMode',
    descriptionKey: 'settings.appearance.lightModeDescription',
  },
  {
    value: 'dark',
    icon: Moon,
    labelKey: 'settings.appearance.darkMode',
    descriptionKey: 'settings.appearance.darkModeDescription',
  },
  {
    value: 'system',
    icon: Monitor,
    labelKey: 'settings.appearance.systemMode',
    descriptionKey: 'settings.appearance.systemModeDescription',
  },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <RadioGroup value={theme} onValueChange={setTheme}>
      {THEME_OPTIONS.map(option => (
        <ThemeOption
          key={option.value}
          icon={option.icon}
          label={t(option.labelKey)}
          description={t(option.descriptionKey)}
          value={option.value}
        />
      ))}
    </RadioGroup>
  )
}

interface IThemeOptionProps {
  icon: LucideIcon
  label: string
  description: string
  value: string
}

function ThemeOption({ icon: Icon, label, description, value }: IThemeOptionProps) {
  return (
    <Radio
      classNames={{
        base: 'inline-flex flex-row-reverse justify-between items-center max-w-full w-full cursor-pointer rounded-lg gap-4 p-4 border-2 border-default-200 data-[selected=true]:border-primary bg-default-50 dark:bg-default-100/50 m-0',
        wrapper: 'group-data-[selected=true]:border-primary',
        labelWrapper: 'ml-0',
      }}
      description={description}
      value={value}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-default-100">
          <Icon className="w-5 h-5 text-default-600" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
    </Radio>
  )
}
