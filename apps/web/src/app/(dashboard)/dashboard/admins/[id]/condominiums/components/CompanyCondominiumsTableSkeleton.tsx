export function CompanyCondominiumsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-default-200" />
          <div className="h-8 w-40 animate-pulse rounded-lg bg-default-200" />
        </div>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-default-200" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-4 rounded-lg border border-default-200 bg-default-50 p-3">
          <div className="h-4 w-32 animate-pulse rounded bg-default-300" />
          <div className="h-4 w-20 animate-pulse rounded bg-default-300" />
          <div className="h-4 w-40 animate-pulse rounded bg-default-300" />
          <div className="h-4 w-32 animate-pulse rounded bg-default-300" />
          <div className="h-4 w-16 animate-pulse rounded bg-default-300" />
          <div className="h-4 w-20 animate-pulse rounded bg-default-300" />
        </div>

        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-default-200 p-4"
          >
            <div className="flex items-center gap-2 w-32">
              <div className="h-4 w-4 animate-pulse rounded bg-default-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-default-200" />
            <div className="flex items-center gap-1 w-40">
              <div className="h-3 w-3 animate-pulse rounded bg-default-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
            </div>
            <div className="flex flex-col gap-1 w-32">
              <div className="h-3 w-28 animate-pulse rounded bg-default-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-default-200" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between mt-4">
        <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
        </div>
      </div>
    </div>
  )
}
