import { Skeleton } from '@/ui/components/skeleton'

export function ExpensesTableSkeleton() {
  return (
    <div className="rounded-lg border border-default-200">
      {/* Header */}
      <div className="flex gap-4 border-b border-default-200 bg-default-100 px-4 py-3">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <Skeleton key={i} className="h-4 w-20 rounded" />
        ))}
      </div>
      {/* Rows */}
      {[1, 2, 3, 4, 5].map(row => (
        <div key={row} className="flex gap-4 border-b border-default-100 px-4 py-4 last:border-b-0">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}
