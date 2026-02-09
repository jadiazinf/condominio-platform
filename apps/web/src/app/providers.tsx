'use client'

import type { ThemeProviderProps } from 'next-themes'
import type { TUser, TUserCondominiumAccess } from '@packages/domain'

import * as React from 'react'
import { HeroUIProvider } from '@heroui/system'
import { useRouter } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryProvider } from '@packages/http-client'
import { Analytics } from '@vercel/analytics/next'

import {
  AuthProvider,
  I18nProvider,
  HttpClientProvider,
} from '@/contexts'
import { SessionInitializer } from '@/contexts/SessionInitializer'
import { ToastProvider } from '@/ui/components/toast'
import { NetworkStatusMonitor } from '@/ui/components/network-status'
import { PushNotificationManager } from '@/components/PushNotificationManager'
import { type TAppLanguages } from '@/locales'

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
  locale?: TAppLanguages
  initialUser?: TUser | null
  initialCondominiums?: TUserCondominiumAccess[]
  initialSelectedCondominium?: TUserCondominiumAccess | null
}

export function Providers({
  children,
  themeProps,
  locale,
  initialUser,
  initialCondominiums,
  initialSelectedCondominium,
}: ProvidersProps) {
  const router = useRouter()

  return (
    <QueryProvider>
      <Analytics />
      {/* @ts-ignore */}
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider {...themeProps}>
          <I18nProvider initialLocale={locale}>
            <AuthProvider>
              <HttpClientProvider>
                <SessionInitializer
                  initialUser={initialUser}
                  initialCondominiums={initialCondominiums}
                  initialSelectedCondominium={initialSelectedCondominium}
                >
                  {children}
                  <ToastProvider position="top-center" />
                  <NetworkStatusMonitor />
                  <PushNotificationManager />
                </SessionInitializer>
              </HttpClientProvider>
            </AuthProvider>
          </I18nProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </QueryProvider>
  )
}
