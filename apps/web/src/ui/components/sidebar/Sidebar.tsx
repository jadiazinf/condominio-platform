'use client'

import React from 'react'
import { Accordion, AccordionItem } from '@heroui/accordion'
import {
  Listbox,
  ListboxItem,
  ListboxSection,
  type ListboxProps,
  type ListboxSectionProps,
} from '@heroui/listbox'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'

export enum SidebarItemType {
  Nest = 'nest',
}

export type TSidebarItem = {
  key: string
  title: string
  icon?: React.ReactNode
  href?: string
  type?: SidebarItemType.Nest
  endContent?: React.ReactNode
  items?: TSidebarItem[]
  className?: string
}

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

  // Update selected when defaultSelectedKey changes (e.g., on navigation)
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

  const renderIcon = React.useCallback((icon?: React.ReactNode) => {
    if (!icon) return null

    return (
      <span className="text-default-500 group-data-[selected=true]:text-foreground">{icon}</span>
    )
  }, [])

  const renderCompactContent = React.useCallback(
    (item: TSidebarItem) => (
      <Tooltip content={item.title} placement="right">
        <div className="flex w-full items-center justify-center">{renderIcon(item.icon)}</div>
      </Tooltip>
    ),
    [renderIcon]
  )

  const renderNestItem = React.useCallback(
    (item: TSidebarItem) => {
      const isNestType = item.items && item.items.length > 0 && item.type === SidebarItemType.Nest

      return (
        <ListboxItem
          key={item.key}
          classNames={{
            base: cn(
              { 'h-auto p-0': !isCompact && isNestType },
              { 'inline-block w-11': isCompact && isNestType }
            ),
          }}
          endContent={isCompact || isNestType || hideEndContent ? null : (item.endContent ?? null)}
          href={isNestType ? undefined : item.href}
          startContent={isCompact || isNestType ? null : renderIcon(item.icon)}
          textValue={item.title}
          title={isCompact || isNestType ? null : item.title}
        >
          {isCompact ? renderCompactContent(item) : null}
          {!isCompact && isNestType ? (
            <Accordion className="p-0">
              <AccordionItem
                key={item.key}
                aria-label={item.title}
                classNames={{ heading: 'pr-3', trigger: 'p-0', content: 'py-0 pl-4' }}
                title={
                  <div className="flex h-11 items-center gap-2 px-2 py-1.5">
                    {renderIcon(item.icon)}
                    <span className="text-small text-default-500 font-medium">{item.title}</span>
                  </div>
                }
              >
                {item.items && item.items.length > 0 ? (
                  <Listbox
                    className="mt-0.5"
                    classNames={{ list: 'border-l border-default-200 pl-4' }}
                    items={item.items}
                    variant="flat"
                  >
                    {item.items.map(renderItem)}
                  </Listbox>
                ) : null}
              </AccordionItem>
            </Accordion>
          ) : null}
        </ListboxItem>
      )
    },
    [isCompact, hideEndContent, renderIcon, renderCompactContent]
  )

  const renderItem = React.useCallback(
    (item: TSidebarItem) => {
      const isNestType = item.items && item.items.length > 0 && item.type === SidebarItemType.Nest

      if (isNestType) {
        return renderNestItem(item)
      }

      return (
        <ListboxItem
          key={item.key}
          endContent={isCompact || hideEndContent ? null : (item.endContent ?? null)}
          startContent={isCompact ? null : renderIcon(item.icon)}
          textValue={item.title}
          title={isCompact ? null : item.title}
        >
          {isCompact ? renderCompactContent(item) : null}
        </ListboxItem>
      )
    },
    [isCompact, hideEndContent, renderIcon, renderCompactContent, renderNestItem]
  )

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
          return renderNestItem(item)
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
