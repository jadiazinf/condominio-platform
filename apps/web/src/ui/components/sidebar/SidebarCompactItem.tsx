import type { TSidebarItem } from './types'

import { SidebarIcon } from './SidebarIcon'

import { Tooltip } from '@/ui/components/tooltip'

interface SidebarCompactItemProps {
  item: TSidebarItem
}

export function SidebarCompactItem({ item }: SidebarCompactItemProps) {
  return (
    <Tooltip content={item.title} placement="right">
      <div className="flex w-full items-center justify-center">
        <SidebarIcon icon={item.icon} />
      </div>
    </Tooltip>
  )
}
