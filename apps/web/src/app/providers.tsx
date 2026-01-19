'use client'

import type { ThemeProviderProps } from 'next-themes'
import type { TUser } from '@packages/domain'

import * as React from 'react'
import { HeroUIProvider } from '@heroui/system'
import { useRouter } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryProvider } from '@packages/http-client'

import { AuthProvider, I18nProvider, UserProvider } from '@/contexts'
import { ToastProvider } from '@/ui/components/toast'
import { type TAppLanguages } from '@/locales'

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
  locale?: TAppLanguages
  initialUser?: TUser | null
}

export function Providers({ children, themeProps, locale, initialUser }: ProvidersProps) {
  const router = useRouter()

  return (
    <QueryProvider>
      {/* @ts-ignore */}
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider {...themeProps}>
          <I18nProvider initialLocale={locale}>
            <AuthProvider>
              <UserProvider initialUser={initialUser}>
                {children}
                <ToastProvider position="top-center" />
              </UserProvider>
            </AuthProvider>
          </I18nProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </QueryProvider>
  )
}
