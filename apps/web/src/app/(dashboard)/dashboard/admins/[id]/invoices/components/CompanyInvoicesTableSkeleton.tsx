export function CompanyInvoicesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-default-200" />
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-default-200 p-4"
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-default-200" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-default-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-default-200" />
            <div className="flex gap-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
