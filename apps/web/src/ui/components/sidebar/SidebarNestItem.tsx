'use client'

import { Accordion, AccordionItem } from '@heroui/accordion'
import { Listbox, ListboxItem } from '@heroui/listbox'
import { cn } from '@heroui/theme'

import { SidebarIcon } from './SidebarIcon'
import { SidebarCompactItem } from './SidebarCompactItem'
import { SidebarItemType, type TSidebarItem } from './types'

interface SidebarNestItemProps {
  item: TSidebarItem
  isCompact?: boolean
  hideEndContent?: boolean
}

export function SidebarNestItem({ item, isCompact, hideEndContent }: SidebarNestItemProps) {
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
      startContent={isCompact || isNestType ? null : <SidebarIcon icon={item.icon} />}
      textValue={item.title}
      title={isCompact || isNestType ? null : item.title}
    >
      {isCompact ? <SidebarCompactItem item={item} /> : null}
      {!isCompact && isNestType ? (
        <Accordion className="p-0">
          <AccordionItem
            key={item.key}
            aria-label={item.title}
            classNames={{ heading: 'pr-3', trigger: 'p-0', content: 'py-0 pl-4' }}
            title={
              <div className="flex h-11 items-center gap-2 px-2 py-1.5">
                <SidebarIcon icon={item.icon} />
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
                {(nestedItem: TSidebarItem) => (
                  <ListboxItem
                    key={nestedItem.key}
                    endContent={isCompact || hideEndContent ? null : (nestedItem.endContent ?? null)}
                    startContent={isCompact ? null : <SidebarIcon icon={nestedItem.icon} />}
                    textValue={nestedItem.title}
                    title={isCompact ? null : nestedItem.title}
                  >
                    {isCompact ? <SidebarCompactItem item={nestedItem} /> : null}
                  </ListboxItem>
                )}
              </Listbox>
            ) : null}
          </AccordionItem>
        </Accordion>
      ) : null}
    </ListboxItem>
  )
}
