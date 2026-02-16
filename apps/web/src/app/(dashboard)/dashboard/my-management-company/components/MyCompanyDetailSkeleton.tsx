import { Card } from '@/ui/components/card'

export function MyCompanyDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-32 bg-default-200 rounded" />
        <div className="h-4 w-64 bg-default-200 rounded mt-2" />
      </div>

      {/* Basic Information Card */}
      <Card className="p-6">
        <div className="h-6 w-48 bg-default-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-default-200 rounded mb-1" />
              <div className="h-5 w-40 bg-default-200 rounded" />
            </div>
          ))}
        </div>
      </Card>

      {/* Contact Information Card */}
      <Card className="p-6">
        <div className="h-6 w-56 bg-default-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-default-200 rounded mb-1" />
              <div className="h-5 w-40 bg-default-200 rounded" />
            </div>
          ))}
        </div>
      </Card>

      {/* Metadata Card */}
      <Card className="p-6">
        <div className="h-6 w-44 bg-default-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="h-3 w-24 bg-default-200 rounded mb-1" />
            <div className="h-5 w-40 bg-default-200 rounded" />
          </div>
        </div>
      </Card>
    </div>
  )
}
