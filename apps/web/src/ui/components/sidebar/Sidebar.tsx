'use client'

import React from 'react'
import { cn } from '@heroui/theme'

import { SidebarItemType, type TSidebarItem } from './types'

export { SidebarItemType, type TSidebarItem }

export type SidebarProps = {
  items: TSidebarItem[]
  isCompact?: boolean
  hideEndContent?: boolean
  defaultSelectedKey: string
  onSelect?: (key: string) => void
  className?: string
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { items, isCompact, defaultSelectedKey, onSelect, hideEndContent, className },
  ref
) {
  const [selected, setSelected] = React.useState<string>(defaultSelectedKey)
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setSelected(defaultSelectedKey)
  }, [defaultSelectedKey])

  function handleSelect(key: string) {
    setSelected(key)
    onSelect?.(key)
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <nav ref={ref} className={cn('flex flex-col gap-0.5 px-2', className)}>
      {items.map(item => {
        // Section with children (group header)
        if (item.items && item.items.length > 0 && item.type !== SidebarItemType.Nest) {
          return (
            <div key={item.key} className="mt-4 first:mt-0">
              {!isCompact && (
                <span className="text-tiny font-semibold text-default-300 px-3 mb-1.5 block">
                  {item.title}
                </span>
              )}
              <div className="flex flex-col gap-0.5">
                {item.items.map(child => (
                  <SidebarItem
                    key={child.key}
                    item={child}
                    isSelected={selected === child.key}
                    isCompact={isCompact}
                    hideEndContent={hideEndContent}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )
        }

        // Nest type (accordion)
        if (item.items && item.items.length > 0 && item.type === SidebarItemType.Nest) {
          const isExpanded = expandedSections.has(item.key)
          return (
            <div key={item.key}>
              <button
                className="flex items-center gap-3 w-full px-3 py-2 text-default-500 hover:bg-default-100 transition-colors cursor-pointer group"
                onClick={() => toggleSection(item.key)}
              >
                {item.icon && (
                  <span className="text-default-400 group-hover:text-default-500 transition-colors">
                    {item.icon}
                  </span>
                )}
                {!isCompact && (
                  <>
                    <span className="text-small font-medium flex-1 text-left">{item.title}</span>
                    <svg
                      className={cn(
                        'w-3.5 h-3.5 text-default-300 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
              {isExpanded && !isCompact && (
                <div className="ml-4 pl-3 border-l-2 border-default-200 flex flex-col gap-0.5 my-1">
                  {item.items.map(child => (
                    <SidebarItem
                      key={child.key}
                      item={child}
                      isSelected={selected === child.key}
                      isCompact={isCompact}
                      hideEndContent={hideEndContent}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        }

        // Regular item
        return (
          <SidebarItem
            key={item.key}
            item={item}
            isSelected={selected === item.key}
            isCompact={isCompact}
            hideEndContent={hideEndContent}
            onSelect={handleSelect}
          />
        )
      })}
    </nav>
  )
})

/* ──────────── Sidebar Item ──────────── */

interface SidebarItemProps {
  item: TSidebarItem
  isSelected: boolean
  isCompact?: boolean
  hideEndContent?: boolean
  onSelect: (key: string) => void
}

function SidebarItem({ item, isSelected, isCompact, hideEndContent, onSelect }: SidebarItemProps) {
  if (isCompact) {
    return (
      <button
        className={cn(
          'flex items-center justify-center w-11 h-11 transition-colors cursor-pointer',
          isSelected
            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
            : 'text-default-400 hover:text-default-600 hover:bg-default-100'
        )}
        onClick={() => onSelect(item.key)}
        title={item.title}
      >
        {item.icon}
      </button>
    )
  }

  return (
    <button
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 transition-colors cursor-pointer group',
        isSelected
          ? 'bg-emerald-500/10 text-foreground'
          : 'text-default-500 hover:text-foreground hover:bg-default-100'
      )}
      onClick={() => onSelect(item.key)}
    >
      {item.icon && (
        <span
          className={cn(
            'transition-colors',
            isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-default-400 group-hover:text-default-500'
          )}
        >
          {item.icon}
        </span>
      )}

      <span className="text-small font-medium flex-1 text-left">{item.title}</span>

      {!hideEndContent && item.endContent && (
        <span className="text-default-300">{item.endContent}</span>
      )}
    </button>
  )
}
