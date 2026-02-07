export function CurrentRatesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-full animate-pulse rounded-lg bg-default-200" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 w-full animate-pulse rounded bg-default-100" />
      ))}
    </div>
  )
}
