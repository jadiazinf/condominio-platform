export function CompanySubscriptionDetailsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-lg border border-default-200 p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-lg bg-default-200" />
              <div className="space-y-2">
                <div className="h-6 w-48 animate-pulse rounded bg-default-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-default-200" />
              </div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-default-200" />
          </div>

          {/* Divider */}
          <div className="h-px bg-default-200" />

          {/* Content */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-default-200" />
                <div className="h-5 w-32 animate-pulse rounded bg-default-200" />
              </div>
            </div>

            <div className="h-px bg-default-200" />

            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-default-200" />
                    <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-lg border border-default-200 p-6 space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-default-200" />
            <div className="h-px bg-default-200" />
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-lg bg-default-200" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-default-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
