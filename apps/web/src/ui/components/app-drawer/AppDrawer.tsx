'use client'

import { Drawer, DrawerContent, DrawerBody } from '@heroui/drawer'

import { DrawerHeader } from './DrawerHeader'
import { DrawerFooter } from './DrawerFooter'

export interface IBadgeConfig {
  label: string
  icon?: React.ReactNode
}

interface IAppDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  badge?: IBadgeConfig
  children: React.ReactNode
}

export function AppDrawer({ isOpen, onOpenChange, onClose, badge, children }: IAppDrawerProps) {
  return (
    <Drawer
      classNames={{
        base: 'max-w-[300px]',
        body: 'p-0',
        footer: 'border-t border-divider',
      }}
      hideCloseButton
      isOpen={isOpen}
      placement="left"
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader badge={badge} onClose={onClose} />
        <DrawerBody className="py-4 px-3">{children}</DrawerBody>
        <DrawerFooter onClose={onClose} />
      </DrawerContent>
    </Drawer>
  )
}
