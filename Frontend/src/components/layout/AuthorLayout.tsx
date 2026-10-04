import { LayoutDashboard, BookUp, FileUp } from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'
import type { SidebarItem } from './Sidebar'

const AUTHOR_ITEMS: SidebarItem[] = [
  { label: 'Bảng điều khiển', to: '/author/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Đăng truyện tranh', to: '/author/upload/manga', icon: BookUp },
  { label: 'Đăng tiểu thuyết', to: '/author/upload/novel', icon: FileUp },
]

export function AuthorLayout() {
  return <SidebarLayout items={AUTHOR_ITEMS} title="Khu vực Tác giả" />
}

export default AuthorLayout
