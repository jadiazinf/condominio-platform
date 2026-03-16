'use client'

import { Globe } from 'lucide-react'

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Button } from '@/ui/components/button'
import { useI18n } from '@/contexts'
import { EAppLanguages, SUPPORTED_LANGUAGES, type TAppLanguages } from '@/locales'

const languageLabels: Record<TAppLanguages, string> = {
  [EAppLanguages.ES]: 'Español',
  [EAppLanguages.EN]: 'English',
}

const languageFlags: Record<TAppLanguages, string> = {
  [EAppLanguages.ES]: '🇪🇸',
  [EAppLanguages.EN]: '🇺🇸',
}

interface ILanguageSwitcherProps {
  variant?: 'icon' | 'text' | 'full'
  size?: 'sm' | 'md' | 'lg'
}

export function LanguageSwitcher({ variant = 'icon', size = 'sm' }: ILanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n()

  const handleLanguageChange = (key: string | number) => {
    const newLocale = key as TAppLanguages

    if (SUPPORTED_LANGUAGES.includes(newLocale)) {
      setLocale(newLocale)
    }
  }

  const renderTrigger = () => {
    switch (variant) {
      case 'text':
        return (
          <Button size={size} variant="light">
            {languageFlags[locale]} {languageLabels[locale]}
          </Button>
        )
      case 'full':
        return (
          <Button size={size} startContent={<Globe className="w-4 h-4" />} variant="bordered">
            {languageLabels[locale]}
          </Button>
        )
      case 'icon':
      default:
        return (
          <Button isIconOnly aria-label={t('language.select')} size={size} variant="light">
            <Globe size={20} />
          </Button>
        )
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger>{renderTrigger()}</DropdownTrigger>
      <DropdownMenu
        disallowEmptySelection
        aria-label={t('language.select')}
        selectedKeys={new Set([locale])}
        selectionMode="single"
        onAction={handleLanguageChange}
      >
        {SUPPORTED_LANGUAGES.map(lang => (
          <DropdownItem key={lang} startContent={<span>{languageFlags[lang]}</span>}>
            {languageLabels[lang]}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
