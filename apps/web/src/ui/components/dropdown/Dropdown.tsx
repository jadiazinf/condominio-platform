'use client'

import {
  Dropdown as HeroUIDropdown,
  DropdownTrigger as HeroUIDropdownTrigger,
  DropdownMenu as HeroUIDropdownMenu,
  DropdownItem as HeroUIDropdownItem,
  DropdownSection as HeroUIDropdownSection,
} from '@heroui/dropdown'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

// HeroUI compatible key type (excludes bigint to match @react-types/shared)
type DropdownKey = string | number

// Selection type compatible with HeroUI
type Selection = 'all' | Set<DropdownKey>

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
  children: ReactNode[]
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
  selectedKeys?: Selection
  disabledKeys?: Selection
  disallowEmptySelection?: boolean
  onAction?: (key: DropdownKey) => void
  onSelectionChange?: (keys: Selection) => void
}

// IDropdownItemProps - use HeroUI's props directly since we re-export the component
type IDropdownItemProps = React.ComponentProps<typeof HeroUIDropdownItem>

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
  disallowEmptySelection,
  onAction,
  onSelectionChange,
}: IDropdownMenuProps) {
  return (
    <HeroUIDropdownMenu
      aria-label={ariaLabel}
      color={color}
      disabledKeys={disabledKeys}
      disallowEmptySelection={disallowEmptySelection}
      selectedKeys={selectedKeys}
      selectionMode={selectionMode}
      variant={variant}
      onAction={onAction}
      onSelectionChange={(keys) => onSelectionChange?.(keys as Selection)}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- HeroUI requires CollectionChildren type */}
      {children as any}
    </HeroUIDropdownMenu>
  )
}

// Re-export HeroUI DropdownItem directly - wrapping it breaks React's key handling
// which is essential for dropdown menu items to work correctly
export const DropdownItem = HeroUIDropdownItem

export function DropdownSection({ children, title, showDivider }: IDropdownSectionProps) {
  return (
    <HeroUIDropdownSection showDivider={showDivider} title={title}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- HeroUI requires CollectionChildren type */}
      {children as any}
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
