export function ExchangeRateHistoryTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="h-14 w-48 animate-pulse rounded-lg bg-default-200" />
        <div className="h-14 w-48 animate-pulse rounded-lg bg-default-200" />
        <div className="h-14 w-44 animate-pulse rounded-lg bg-default-200" />
        <div className="h-14 w-44 animate-pulse rounded-lg bg-default-200" />
      </div>
      {/* Table skeleton */}
      <div className="h-12 w-full animate-pulse rounded-lg bg-default-200" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 w-full animate-pulse rounded bg-default-100" />
      ))}
    </div>
  )
}
