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

  // Apply the theme class to document.body so HeroUI portals (Modals, Tooltips, Popovers)
  // rendered outside this div also inherit the correct dashboard theme colors.
  useEffect(() => {
    document.body.classList.remove('dashboard-light', 'dashboard-dark')
    document.body.classList.add(themeClass)
    return () => {
      document.body.classList.remove('dashboard-light', 'dashboard-dark')
    }
  }, [themeClass])

  return <div className={themeClass}>{children}</div>
}
