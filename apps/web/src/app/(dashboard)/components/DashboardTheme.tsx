'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface DashboardThemeProps {
  children: React.ReactNode
}

export function DashboardTheme({ children }: DashboardThemeProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const themeClass = mounted
    ? resolvedTheme === 'dark' ? 'dashboard-dark' : 'dashboard-light'
    : 'dashboard-light'

  return <div className={themeClass}>{children}</div>
}
