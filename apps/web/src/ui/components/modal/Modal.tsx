'use client'

import {
  Modal as HeroUIModal,
  ModalContent as HeroUIModalContent,
  ModalHeader as HeroUIModalHeader,
  ModalBody as HeroUIModalBody,
  ModalFooter as HeroUIModalFooter,
  useDisclosure as useHeroUIDisclosure,
} from '@heroui/modal'
import { cn } from '@heroui/theme'
import { ReactNode, createContext, useContext, useRef } from 'react'

// Context to share the modal body ref with child components (e.g., DatePicker)
// so they can render their popovers inside the modal DOM and avoid
// triggering the modal's "interact outside" dismiss behavior.
const ModalPortalContext = createContext<React.RefObject<HTMLElement | null> | null>(null)

export function useModalPortalContainer() {
  return useContext(ModalPortalContext)
}

type TModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
type TModalPlacement = 'auto' | 'top' | 'center' | 'bottom'

interface IModalProps {
  children: ReactNode
  isOpen: boolean
  onOpenChange?: (isOpen: boolean) => void
  onClose?: () => void
  size?: TModalSize
  placement?: TModalPlacement
  backdrop?: 'transparent' | 'opaque' | 'blur'
  scrollBehavior?: 'inside' | 'outside'
  hideCloseButton?: boolean
  isDismissable?: boolean
  isKeyboardDismissDisabled?: boolean
  className?: string
}

interface IModalContentProps {
  children: ReactNode | ((onClose: () => void) => ReactNode)
  className?: string
}

interface IModalHeaderProps {
  children: ReactNode
  className?: string
}

interface IModalBodyProps {
  children: ReactNode
  className?: string
}

interface IModalFooterProps {
  children: ReactNode
  className?: string
}

export function Modal({
  children,
  isOpen,
  onOpenChange,
  onClose,
  size = 'md',
  placement = 'center',
  backdrop = 'opaque',
  scrollBehavior = 'inside',
  hideCloseButton = false,
  isDismissable = true,
  isKeyboardDismissDisabled = false,
  className,
}: IModalProps) {
  return (
    <HeroUIModal
      backdrop={backdrop}
      className={cn(className)}
      hideCloseButton={hideCloseButton}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={isKeyboardDismissDisabled}
      isOpen={isOpen}
      placement={placement}
      scrollBehavior={scrollBehavior}
      size={size}
      onClose={onClose}
      onOpenChange={onOpenChange}
    >
      {children}
    </HeroUIModal>
  )
}

export function ModalContent({ children, className }: IModalContentProps) {
  return <HeroUIModalContent className={cn(className)}>{children}</HeroUIModalContent>
}

export function ModalHeader({ children, className }: IModalHeaderProps) {
  return <HeroUIModalHeader className={cn(className)}>{children}</HeroUIModalHeader>
}

export function ModalBody({ children, className }: IModalBodyProps) {
  const portalRef = useRef<HTMLDivElement>(null)

  return (
    <ModalPortalContext.Provider value={portalRef}>
      <HeroUIModalBody className={cn(className)}>
        {children}
        <div ref={portalRef} />
      </HeroUIModalBody>
    </ModalPortalContext.Provider>
  )
}

export function ModalFooter({ children, className }: IModalFooterProps) {
  return <HeroUIModalFooter className={cn(className)}>{children}</HeroUIModalFooter>
}

export function useDisclosure() {
  return useHeroUIDisclosure()
}

export type {
  IModalProps,
  IModalContentProps,
  IModalHeaderProps,
  IModalBodyProps,
  IModalFooterProps,
}
