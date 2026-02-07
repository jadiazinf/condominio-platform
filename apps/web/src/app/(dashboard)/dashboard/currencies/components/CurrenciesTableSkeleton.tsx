export function CurrenciesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-40 animate-pulse rounded bg-default-200" />
      <div className="rounded-lg border border-default-200">
        <div className="flex gap-4 border-b border-default-200 p-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 flex-1 animate-pulse rounded bg-default-200" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-default-100 p-4 last:border-b-0">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 animate-pulse rounded bg-default-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
