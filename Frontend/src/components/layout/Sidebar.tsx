import type { ComponentType } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export interface SidebarItem {
  label: string
  to: string
  icon?: ComponentType<{ className?: string }>
  end?: boolean
}

interface SidebarProps {
  items: SidebarItem[]
  title?: string
}

export function Sidebar({ items, title }: SidebarProps) {
  return (
    <aside className="w-full shrink-0 border-b border-border bg-background/90 md:w-56 md:border-b-0 md:border-r">
      <nav
        className="flex gap-1 overflow-x-auto p-2 md:sticky md:top-14 md:flex-col md:overflow-visible md:p-3"
        aria-label={title ?? 'Điều hướng'}
      >
        {title && (
          <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
            {title}
          </p>
        )}
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors md:w-full',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
