'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { Select, type ISelectItem } from '@/ui/components/select'

interface INotificationsFiltersProps {
  category: string
  readFilter: string
  translations: {
    filters: {
      category: string
      readStatus: string
      all: string
      read: string
      unread: string
    }
    categories: {
      payment: string
      quota: string
      announcement: string
      reminder: string
      alert: string
      system: string
    }
  }
}

export function NotificationsFilters({
  category,
  readFilter,
  translations,
}: INotificationsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === 'all' && key !== 'read') {
        params.delete(key)
      } else if (key === 'read' && value === 'unread') {
        // 'unread' is the default, remove from URL
        params.delete(key)
      } else {
        params.set(key, value)
      }
      // Reset to page 1 when filters change
      params.delete('page')
      router.push(`/dashboard/notifications?${params.toString()}`)
    },
    [router, searchParams]
  )

  const categoryItems: ISelectItem[] = [
    { key: 'all', label: translations.filters.all },
    { key: 'payment', label: translations.categories.payment },
    { key: 'quota', label: translations.categories.quota },
    { key: 'announcement', label: translations.categories.announcement },
    { key: 'reminder', label: translations.categories.reminder },
    { key: 'alert', label: translations.categories.alert },
    { key: 'system', label: translations.categories.system },
  ]

  const readItems: ISelectItem[] = [
    { key: 'all', label: translations.filters.all },
    { key: 'read', label: translations.filters.read },
    { key: 'unread', label: translations.filters.unread },
  ]

  return (
    <>
      <Select
        aria-label={translations.filters.category}
        className="sm:max-w-[200px]"
        items={categoryItems}
        value={category}
        onChange={key => updateParams('category', key ?? 'all')}
      />
      <Select
        aria-label={translations.filters.readStatus}
        className="sm:max-w-[200px]"
        items={readItems}
        value={readFilter}
        onChange={key => updateParams('read', key ?? 'unread')}
      />
    </>
  )
}
