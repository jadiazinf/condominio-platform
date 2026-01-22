import { Skeleton } from '@heroui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="py-8 space-y-4">
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-6 w-96 rounded-lg" />
    </div>
  )
}

export function SuperadminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 rounded-lg" />
        <Skeleton className="h-5 w-48 rounded-lg" />
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>

      {/* Activity and Status Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
