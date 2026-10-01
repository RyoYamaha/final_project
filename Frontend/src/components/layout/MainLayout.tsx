import { Home, BookOpen, Library, Inbox } from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'
import type { SidebarItem } from './Sidebar'

// TẠM: mình chưa đọc được chữ trong wireframe. Bạn thay bằng đúng danh sách gốc.
const USER_ITEMS: SidebarItem[] = [
  { label: 'Trang chủ', to: '/', icon: Home, end: true },
  { label: 'Truyện', to: '/browse', icon: BookOpen },
  { label: 'Thư viện', to: '/library', icon: Library },
  { label: 'Hộp thư', to: '/inbox', icon: Inbox },
]

export function MainLayout() {
  return <SidebarLayout items={USER_ITEMS} />
}

export default MainLayout
