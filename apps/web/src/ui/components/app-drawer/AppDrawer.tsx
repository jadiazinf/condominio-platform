'use client'

import { Drawer, DrawerContent, DrawerBody } from '@heroui/drawer'

import { DrawerHeader } from './DrawerHeader'
import { DrawerFooter } from './DrawerFooter'

interface IAppDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  children: React.ReactNode
}

export function AppDrawer({ isOpen, onOpenChange, onClose, children }: IAppDrawerProps) {
  return (
    <Drawer
      classNames={{
        base: 'max-w-[280px] bg-background',
        body: 'p-0',
        footer: 'p-0',
      }}
      hideCloseButton
      isOpen={isOpen}
      placement="left"
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader onClose={onClose} />
        <DrawerBody className="py-3 px-0">{children}</DrawerBody>
        <DrawerFooter onClose={onClose} />
      </DrawerContent>
    </Drawer>
  )
}
