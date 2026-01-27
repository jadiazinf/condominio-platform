export function SupportTicketsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-default-200" />
          <div className="h-10 w-48 animate-pulse rounded-lg bg-default-200" />
        </div>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-default-200" />
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-default-200 p-4"
          >
            <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
              <div className="h-3 w-64 animate-pulse rounded bg-default-200" />
            </div>
            <div className="h-4 w-20 animate-pulse rounded bg-default-200" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-default-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-default-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
