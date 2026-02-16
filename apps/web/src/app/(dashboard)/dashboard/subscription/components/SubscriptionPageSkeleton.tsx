import { Card } from '@/ui/components/card'

export function SubscriptionPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Plan header card */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-default-200 rounded-lg" />
          <div>
            <div className="h-6 w-48 bg-default-200 rounded" />
            <div className="h-4 w-24 bg-default-200 rounded mt-1" />
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="h-3 w-20 bg-default-200 rounded mb-1" />
          <div className="h-8 w-32 bg-default-200 rounded" />
        </div>

        {/* Dates */}
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 bg-default-200 rounded" />
              <div>
                <div className="h-3 w-28 bg-default-200 rounded mb-1" />
                <div className="h-4 w-36 bg-default-200 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Limits */}
        <div className="space-y-4">
          <div className="h-5 w-32 bg-default-200 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-default-200 rounded" />
                <div className="h-4 w-16 bg-default-200 rounded" />
              </div>
              <div className="h-2 w-full bg-default-200 rounded-full" />
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
