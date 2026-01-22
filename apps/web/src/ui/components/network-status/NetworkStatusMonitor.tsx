'use client'

import { useEffect, useRef } from 'react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

export function NetworkStatusMonitor() {
  const { isOnline, wasOffline } = useNetworkStatus()
  const toast = useToast()
  const { t } = useTranslation()
  const offlineToastId = useRef<string | null>(null)
  const hasShownOffline = useRef(false)

  useEffect(() => {
    if (!isOnline && !hasShownOffline.current) {
      // Show offline toast and keep it visible
      offlineToastId.current = toast.error(t('network.offline'), {
        duration: Infinity,
        id: 'network-offline',
        position: 'bottom-right',
      })
      hasShownOffline.current = true
    } else if (isOnline && wasOffline && hasShownOffline.current) {
      // Dismiss offline toast and show reconnected message
      if (offlineToastId.current) {
        toast.dismiss('network-offline')
        offlineToastId.current = null
      }
      toast.success(t('network.online'), {
        duration: 3000,
        position: 'bottom-right',
      })
      hasShownOffline.current = false
    }
  }, [isOnline, wasOffline, toast, t])

  return null
}
