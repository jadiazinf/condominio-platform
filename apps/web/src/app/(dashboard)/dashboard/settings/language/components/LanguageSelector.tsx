'use client'

import { RadioGroup, Radio } from '@heroui/radio'

import { useI18n } from '@/contexts'
import { EAppLanguages, SUPPORTED_LANGUAGES, type TAppLanguages } from '@/locales'

const LANGUAGE_OPTIONS: Record<
  TAppLanguages,
  { label: string; flag: string; description: string }
> = {
  [EAppLanguages.ES]: {
    label: 'Español',
    flag: '🇪🇸',
    description: 'Español de España y Latinoamérica',
  },
  [EAppLanguages.EN]: {
    label: 'English',
    flag: '🇺🇸',
    description: 'English (United States)',
  },
}

export function LanguageSelector() {
  const { locale, setLocale } = useI18n()

  function handleLanguageChange(value: string) {
    const selectedLanguage = value as TAppLanguages

    if (SUPPORTED_LANGUAGES.includes(selectedLanguage)) {
      setLocale(selectedLanguage)
    }
  }

  return (
    <RadioGroup value={locale} onValueChange={handleLanguageChange}>
      {SUPPORTED_LANGUAGES.map(language => (
        <LanguageOption key={language} language={language} />
      ))}
    </RadioGroup>
  )
}

function LanguageOption({ language }: { language: TAppLanguages }) {
  const option = LANGUAGE_OPTIONS[language]

  return (
    <Radio
      classNames={{
        base: 'inline-flex flex-row-reverse justify-between items-center max-w-full w-full cursor-pointer rounded-lg gap-4 p-4 border-2 border-default-200 data-[selected=true]:border-primary bg-default-50 dark:bg-default-100/50 m-0',
        wrapper: 'group-data-[selected=true]:border-primary',
        labelWrapper: 'ml-0',
      }}
      description={option.description}
      value={language}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{option.flag}</span>
        <span className="font-medium">{option.label}</span>
      </div>
    </Radio>
  )
}
