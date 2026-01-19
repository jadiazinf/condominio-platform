'use client'

import type { ThemeProviderProps } from 'next-themes'

import * as React from 'react'
import { HeroUIProvider } from '@heroui/system'
import { useRouter } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

import { AuthProvider, I18nProvider } from '@/contexts'
import { ToastProvider } from '@/ui/components/toast'
import { type TAppLanguages } from '@/locales'

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
  locale?: TAppLanguages
}

export function Providers({ children, themeProps, locale }: ProvidersProps) {
  const router = useRouter()

  return (
    // @ts-ignore
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <I18nProvider initialLocale={locale}>
          <AuthProvider>
            {children}
            <ToastProvider position="top-center" />
          </AuthProvider>
        </I18nProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  )
}
