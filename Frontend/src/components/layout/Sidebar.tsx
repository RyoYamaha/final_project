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
    <aside className="hidden w-56 shrink-0 border-r border-border bg-background md:block">
      <nav className="sticky top-14 flex flex-col gap-1 p-3" aria-label={title ?? 'Điều hướng'}>
        {title && (
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
        )}
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
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
