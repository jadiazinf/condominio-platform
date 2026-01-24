import type { ReactNode } from 'react'

export enum SidebarItemType {
  Nest = 'nest',
}

export type TSidebarItem = {
  key: string
  title: string
  icon?: ReactNode
  href?: string
  type?: SidebarItemType.Nest
  endContent?: ReactNode
  items?: TSidebarItem[]
  className?: string
}
