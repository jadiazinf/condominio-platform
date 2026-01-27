export function TicketDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-default-200" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-default-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info Card */}
          <div className="rounded-lg border border-default-200 p-6 space-y-4">
            <div className="space-y-3">
              <div className="h-6 w-3/4 animate-pulse rounded bg-default-200" />
              <div className="flex gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-default-200" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-default-200" />
              </div>
            </div>

            <div className="h-px bg-default-200" />

            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-default-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-default-200" />
            </div>

            <div className="h-px bg-default-200" />

            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
                  <div className="space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-default-200" />
                    <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages Card */}
          <div className="rounded-lg border border-default-200 p-6 space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-default-200" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-default-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-default-200" />
                    <div className="h-16 w-full animate-pulse rounded-lg bg-default-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-default-200 p-6 space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-default-200" />
            <div className="space-y-2">
              <div className="h-8 w-full animate-pulse rounded-lg bg-default-200" />
              <div className="h-8 w-full animate-pulse rounded-lg bg-default-200" />
              <div className="h-8 w-full animate-pulse rounded-lg bg-default-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
