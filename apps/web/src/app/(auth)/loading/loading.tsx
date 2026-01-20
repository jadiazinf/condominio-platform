import { Progress } from '@heroui/progress'

export default function LoadingPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 bg-background">
      <Progress
        aria-label="Loading..."
        className="max-w-md"
        color="primary"
        isIndeterminate
        size="sm"
      />
    </div>
  )
}
