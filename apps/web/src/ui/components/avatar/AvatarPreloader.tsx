'use client'

import { useEffect, useRef } from 'react'

import { useUser } from '@/contexts'

/**
 * Preloads the user's avatar image when it becomes available.
 * This ensures the image is cached in the browser before it's displayed,
 * preventing the "flash" effect when navigating between pages.
 *
 * Place this component once in your app layout.
 */
export function AvatarPreloader() {
  const { user } = useUser()
  const preloadedUrl = useRef<string | null>(null)

  useEffect(() => {
    const photoUrl = user?.photoUrl

    // Skip if no photo URL or already preloaded this URL
    if (!photoUrl || photoUrl === preloadedUrl.current) {
      return
    }

    // Preload the image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = photoUrl

    img.onload = () => {
      preloadedUrl.current = photoUrl
      if (process.env.NODE_ENV === 'development') {
        console.log('[AvatarPreloader] Image preloaded:', photoUrl)
      }
    }

    img.onerror = () => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AvatarPreloader] Failed to preload image:', photoUrl)
      }
    }
  }, [user?.photoUrl])

  // Also add a preload link for the image
  useEffect(() => {
    const photoUrl = user?.photoUrl
    if (!photoUrl) return

    // Check if preload link already exists
    const existingLink = document.querySelector(`link[href="${photoUrl}"]`)
    if (existingLink) return

    // Create preload link
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = photoUrl
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)

    return () => {
      // Cleanup on unmount or URL change
      link.remove()
    }
  }, [user?.photoUrl])

  return null
}
