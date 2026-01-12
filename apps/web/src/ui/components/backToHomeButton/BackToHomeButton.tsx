import { Link } from '@heroui/link'
import { ArrowLeft } from 'lucide-react'

export function BackToHomeButton() {
  return (
    <Link
      className="flex items-center gap-2 text-default-600 hover:text-primary transition-colors"
      href="/"
    >
      <ArrowLeft size={18} />
      <span>Ir a inicio</span>
    </Link>
  )
}
