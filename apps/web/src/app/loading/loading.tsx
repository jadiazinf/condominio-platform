import { Progress } from '@heroui/progress'

export default function LoadingPageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4 bg-background">
      <Progress
        isIndeterminate
        aria-label="Loading..."
        className="max-w-md"
        color="primary"
        size="sm"
      />
    </div>
  )
}
