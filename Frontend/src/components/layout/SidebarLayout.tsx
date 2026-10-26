import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { Sidebar, type SidebarItem } from './Sidebar'

interface Props {
  items: SidebarItem[]
  title?: string
}

export function SidebarLayout({ items, title }: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar items={items} title={title} />
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default SidebarLayout
