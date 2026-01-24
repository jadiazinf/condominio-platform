import type { ReactNode } from 'react'

interface SidebarIconProps {
  icon?: ReactNode
}

export function SidebarIcon({ icon }: SidebarIconProps) {
  if (!icon) return null

  return (
    <span className="text-default-500 group-data-[selected=true]:text-foreground">{icon}</span>
  )
}
