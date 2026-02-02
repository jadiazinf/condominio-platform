export function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-10 w-full animate-pulse rounded bg-default-200 sm:max-w-xs" />
        <div className="h-10 w-full animate-pulse rounded bg-default-200 sm:w-40" />
        <div className="h-10 w-full animate-pulse rounded bg-default-200 sm:w-48" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-default-200">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-default-200 bg-default-50 px-4 py-3">
          <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-default-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-default-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
        </div>

        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-default-100 px-4 py-4 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-default-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
            </div>
            <div className="h-4 w-40 animate-pulse rounded bg-default-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
            <div className="flex gap-1">
              <div className="h-6 w-20 animate-pulse rounded-full bg-default-200" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-default-200" />
          <div className="h-8 w-8 animate-pulse rounded bg-default-200" />
          <div className="h-8 w-8 animate-pulse rounded bg-default-200" />
        </div>
      </div>
    </div>
  )
}
