'use client'

import { CheckCircle } from 'lucide-react'
import { Button } from '@/ui/components/button'

export interface ISubmissionSuccessTranslations {
  title: string
  message: string
  submitAnother: string
  viewRequests: string
}

interface ISubmissionSuccessProps {
  translations: ISubmissionSuccessTranslations
  onSubmitAnother: () => void
  onViewRequests: () => void
}

export function SubmissionSuccess({
  translations,
  onSubmitAnother,
  onViewRequests,
}: ISubmissionSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center">
        <CheckCircle size={32} className="text-success" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold">{translations.title}</p>
        <p className="text-sm text-default-500">{translations.message}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="flat" onPress={onSubmitAnother}>
          {translations.submitAnother}
        </Button>
        <Button color="success" onPress={onViewRequests}>
          {translations.viewRequests}
        </Button>
      </div>
    </div>
  )
}
