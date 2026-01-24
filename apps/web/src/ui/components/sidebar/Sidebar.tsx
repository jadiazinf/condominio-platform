'use client'

import React from 'react'
import {
  Listbox,
  ListboxItem,
  ListboxSection,
  type ListboxProps,
  type ListboxSectionProps,
} from '@heroui/listbox'
import { cn } from '@heroui/theme'

import { SidebarIcon } from './SidebarIcon'
import { SidebarCompactItem } from './SidebarCompactItem'
import { SidebarNestItem } from './SidebarNestItem'
import { SidebarItemType, type TSidebarItem } from './types'

export { SidebarItemType, type TSidebarItem }

export type SidebarProps = Omit<ListboxProps<TSidebarItem>, 'children' | 'onSelect'> & {
  items: TSidebarItem[]
  isCompact?: boolean
  hideEndContent?: boolean
  sectionClasses?: ListboxSectionProps['classNames']
  classNames?: ListboxProps['classNames']
  defaultSelectedKey: string
  onSelect?: (key: string) => void
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    items,
    isCompact,
    defaultSelectedKey,
    onSelect,
    hideEndContent,
    sectionClasses: sectionClassesProp = {},
    itemClasses: itemClassesProp = {},
    classNames,
    className,
    ...props
  },
  ref
) {
  const [selected, setSelected] = React.useState<string>(defaultSelectedKey)

  React.useEffect(() => {
    setSelected(defaultSelectedKey)
  }, [defaultSelectedKey])

  function handleSelectionChange(keys: 'all' | Set<React.Key>) {
    const key = Array.from(keys)[0] as string
    setSelected(key)
    onSelect?.(key)
  }

  const sectionClasses = {
    ...sectionClassesProp,
    base: cn(sectionClassesProp?.base, 'w-full', { 'p-0 max-w-[44px]': isCompact }),
    group: cn(sectionClassesProp?.group, { 'flex flex-col gap-1': isCompact }),
    heading: cn(sectionClassesProp?.heading, { hidden: isCompact }),
  }

  const itemClasses = {
    ...itemClassesProp,
    base: cn(itemClassesProp?.base, { 'w-11 h-11 gap-0 p-0': isCompact }),
  }

  function renderItem(item: TSidebarItem) {
    const isNestType = item.items && item.items.length > 0 && item.type === SidebarItemType.Nest

    if (isNestType) {
      return (
        <SidebarNestItem
          key={item.key}
          hideEndContent={hideEndContent}
          isCompact={isCompact}
          item={item}
        />
      )
    }

    return (
      <ListboxItem
        key={item.key}
        endContent={isCompact || hideEndContent ? null : (item.endContent ?? null)}
        startContent={isCompact ? null : <SidebarIcon icon={item.icon} />}
        textValue={item.title}
        title={isCompact ? null : item.title}
      >
        {isCompact ? <SidebarCompactItem item={item} /> : null}
      </ListboxItem>
    )
  }

  return (
    <Listbox
      key={isCompact ? 'compact' : 'default'}
      ref={ref}
      hideSelectedIcon
      as="nav"
      className={cn('list-none', className)}
      classNames={{ ...classNames, list: cn('items-center', classNames?.list) }}
      color="default"
      itemClasses={{
        ...itemClasses,
        base: cn(
          'px-3 min-h-11 rounded-large h-[44px] data-[selected=true]:bg-default-100',
          itemClasses?.base
        ),
        title: cn(
          'text-small font-medium text-default-500 group-data-[selected=true]:text-foreground',
          itemClasses?.title
        ),
      }}
      items={items}
      selectedKeys={new Set([selected])}
      selectionMode="single"
      variant="flat"
      onSelectionChange={handleSelectionChange}
      {...props}
    >
      {item => {
        if (item.items && item.items.length > 0 && item.type === SidebarItemType.Nest) {
          return (
            <SidebarNestItem
              key={item.key}
              hideEndContent={hideEndContent}
              isCompact={isCompact}
              item={item}
            />
          )
        }

        if (item.items && item.items.length > 0) {
          return (
            <ListboxSection
              key={item.key}
              classNames={sectionClasses}
              showDivider={isCompact}
              title={item.title}
            >
              {item.items.map(renderItem)}
            </ListboxSection>
          )
        }

        return renderItem(item)
      }}
    </Listbox>
  )
})
