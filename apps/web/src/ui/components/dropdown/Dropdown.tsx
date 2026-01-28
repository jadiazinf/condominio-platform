'use client'

import {
  Dropdown as HeroUIDropdown,
  DropdownTrigger as HeroUIDropdownTrigger,
  DropdownMenu as HeroUIDropdownMenu,
  DropdownItem as HeroUIDropdownItem,
  DropdownSection as HeroUIDropdownSection,
} from '@heroui/dropdown'
import { cn } from '@heroui/theme'
import { ReactNode, Key } from 'react'

type TDropdownPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'

interface IDropdownProps {
  children: ReactNode
  placement?: TDropdownPlacement
  isDisabled?: boolean
  closeOnSelect?: boolean
  shouldBlockScroll?: boolean
  className?: string
}

interface IDropdownTriggerProps {
  children: ReactNode
}

interface IDropdownMenuProps {
  children: ReactNode
  'aria-label': string
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  selectionMode?: 'none' | 'single' | 'multiple'
  selectedKeys?: Set<Key>
  disabledKeys?: Set<Key>
  onAction?: (key: Key) => void
  onSelectionChange?: (keys: Set<Key>) => void
}

interface IDropdownItemProps {
  children: ReactNode
  key: string
  description?: string
  startContent?: ReactNode
  endContent?: ReactNode
  shortcut?: string
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  isDisabled?: boolean
  isReadOnly?: boolean
  className?: string
  onPress?: () => void
}

interface IDropdownSectionProps {
  children: ReactNode
  title?: string
  showDivider?: boolean
}

export function Dropdown({
  children,
  placement = 'bottom',
  isDisabled = false,
  closeOnSelect = true,
  shouldBlockScroll = true,
  className,
}: IDropdownProps) {
  return (
    <HeroUIDropdown
      className={cn(className)}
      closeOnSelect={closeOnSelect}
      isDisabled={isDisabled}
      placement={placement}
      shouldBlockScroll={shouldBlockScroll}
    >
      {children}
    </HeroUIDropdown>
  )
}

export function DropdownTrigger({ children }: IDropdownTriggerProps) {
  return <HeroUIDropdownTrigger>{children}</HeroUIDropdownTrigger>
}

export function DropdownMenu({
  children,
  'aria-label': ariaLabel,
  variant = 'solid',
  color = 'default',
  selectionMode = 'none',
  selectedKeys,
  disabledKeys,
  onAction,
  onSelectionChange,
}: IDropdownMenuProps) {
  return (
    <HeroUIDropdownMenu
      aria-label={ariaLabel}
      color={color}
      disabledKeys={disabledKeys}
      selectedKeys={selectedKeys}
      selectionMode={selectionMode}
      variant={variant}
      onAction={onAction}
      onSelectionChange={(keys) => onSelectionChange?.(keys as Set<Key>)}
    >
      {children}
    </HeroUIDropdownMenu>
  )
}

export function DropdownItem({
  children,
  key,
  description,
  startContent,
  endContent,
  shortcut,
  color = 'default',
  isDisabled = false,
  isReadOnly = false,
  className,
  onPress,
}: IDropdownItemProps) {
  return (
    <HeroUIDropdownItem
      className={cn(className)}
      color={color}
      description={description}
      endContent={endContent}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      key={key}
      shortcut={shortcut}
      startContent={startContent}
      onPress={onPress}
    >
      {children}
    </HeroUIDropdownItem>
  )
}

export function DropdownSection({ children, title, showDivider }: IDropdownSectionProps) {
  return (
    <HeroUIDropdownSection showDivider={showDivider} title={title}>
      {children}
    </HeroUIDropdownSection>
  )
}

export type {
  TDropdownPlacement,
  IDropdownProps,
  IDropdownTriggerProps,
  IDropdownMenuProps,
  IDropdownItemProps,
  IDropdownSectionProps,
}
