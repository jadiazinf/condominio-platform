'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Progress } from '@/ui/components/progress'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)

  // Reset navigation state when route changes complete
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname, searchParams])

  // Intercept clicks on links to show loading state
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor) {
        const href = anchor.getAttribute('href')
        const isInternal = href?.startsWith('/') && !href?.startsWith('//')
        const isSameOrigin = anchor.origin === window.location.origin

        if ((isInternal || isSameOrigin) && href !== pathname) {
          setIsNavigating(true)
        }
      }
    }

    // Intercept programmatic navigation
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)

    history.pushState = (...args) => {
      setIsNavigating(true)
      return originalPushState(...args)
    }

    history.replaceState = (...args) => {
      setIsNavigating(true)
      return originalReplaceState(...args)
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
    }
  }, [pathname])

  if (!isNavigating) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4 bg-background">
      <Progress aria-label="Loading..." className="max-w-md" color="primary" isIndeterminate />
    </div>
  )
}
