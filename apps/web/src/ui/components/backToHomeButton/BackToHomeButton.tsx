'use client'

import { Home } from 'lucide-react'

import { Button } from '@/ui/components/button'

interface BackToHomeButtonProps {
  className?: string
}

export function BackToHomeButton({ className }: BackToHomeButtonProps) {
  return (
    <Button className={className} href="/" isIconOnly size="sm" variant="light">
      <Home className="w-5 h-5" />
    </Button>
  )
}
