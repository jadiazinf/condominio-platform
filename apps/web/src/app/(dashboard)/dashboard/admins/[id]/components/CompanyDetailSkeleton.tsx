import { Card, CardHeader, CardBody } from '@heroui/card'
import { Divider } from '@heroui/divider'

export function CompanyDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-lg bg-default-200" />
              <div>
                <div className="h-6 w-48 animate-pulse rounded bg-default-200" />
                <div className="mt-1 h-4 w-32 animate-pulse rounded bg-default-200" />
              </div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-default-200" />
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
                  <div>
                    <div className="h-3 w-16 animate-pulse rounded bg-default-200" />
                    <div className="mt-1 h-4 w-32 animate-pulse rounded bg-default-200" />
                  </div>
                </div>
              ))}
            </div>
            <Divider />
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
              <div>
                <div className="h-3 w-16 animate-pulse rounded bg-default-200" />
                <div className="mt-1 h-4 w-64 animate-pulse rounded bg-default-200" />
              </div>
            </div>
            <Divider />
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded bg-default-200" />
              <div>
                <div className="h-3 w-24 animate-pulse rounded bg-default-200" />
                <div className="mt-1 h-4 w-40 animate-pulse rounded bg-default-200" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-5 w-20 animate-pulse rounded bg-default-200" />
          </CardHeader>
          <Divider />
          <CardBody className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded bg-default-200" />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
