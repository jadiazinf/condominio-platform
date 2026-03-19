'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { Pagination } from '@/ui/components/pagination'

interface INotificationsPaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
}

export function NotificationsPagination({
  page,
  totalPages,
  total,
  limit,
}: INotificationsPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())

      if (newPage === 1) {
        params.delete('page')
      } else {
        params.set('page', String(newPage))
      }
      router.push(`/dashboard/notifications?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      const params = new URLSearchParams(searchParams.toString())

      params.set('limit', String(newLimit))
      params.delete('page')
      router.push(`/dashboard/notifications?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <Pagination
      limit={limit}
      page={page}
      total={total}
      totalPages={totalPages}
      onLimitChange={handleLimitChange}
      onPageChange={handlePageChange}
    />
  )
}
