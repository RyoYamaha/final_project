import { Home, Inbox, Library, ShieldCheck, MessageSquare, BookUp, FileUp, LayoutDashboard, ListChecks, Flag, ClipboardList, Users } from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'
import type { SidebarItem } from './Sidebar'
import { useAuthStore } from '@/stores/auth-store'

export const MainLayout = () => {
  const user = useAuthStore((s) => s.user)
  
  const USER_ITEMS: SidebarItem[] = [
    { label: 'Trang chủ', to: '/', icon: Home, end: true },
  ]

  // Chỉ hiển thị Thư viện cho Reader
  if (user?.role === 'Reader') {
    USER_ITEMS.push({ label: 'Thư viện', to: '/library', icon: Library })
  }

  // Các mục chung cho tất cả
  USER_ITEMS.push({ label: 'Thông báo', to: '/inbox', icon: Inbox })
  if (user && user.role !== 'Admin') {
    USER_ITEMS.push({ label: 'Báo cáo của tôi', to: '/my-reports', icon: ClipboardList })
  }

  if (user?.role !== 'Admin' && user?.role !== 'Publisher') {
    USER_ITEMS.push({ label: 'Hỗ trợ', to: '/support', icon: MessageSquare })
  }

  if (user?.role === 'Author') {
    USER_ITEMS.push(
      { label: 'Dashboard Tác giả', to: '/author/dashboard', icon: LayoutDashboard },
      { label: 'Tạo truyện tranh', to: '/author/upload/manga', icon: BookUp },
      { label: 'Tạo truyện chữ', to: '/author/upload/novel', icon: FileUp }
    )
  } else if (user?.role === 'Publisher') {
    USER_ITEMS.push(
      { label: 'Registration & Verification', to: '/publisher/register', icon: ShieldCheck },
      { label: 'Dashboard Analytics', to: '/publisher/dashboard', icon: LayoutDashboard },
      { label: 'Quản lý danh mục', to: '/publisher/catalog', icon: Library, end: true },
      { label: 'Tạo truyện tranh', to: '/publisher/upload/manga', icon: BookUp },
      { label: 'Tạo truyện chữ', to: '/publisher/upload/novel', icon: FileUp },
      { label: 'Compliance Center', to: '/publisher/compliance', icon: ShieldCheck }
    )
  } else if (user?.role === 'Admin') {
    USER_ITEMS.push(
      { label: 'Dashboard Admin', to: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Truyện đã xuất bản', to: '/admin/content/published', icon: LayoutDashboard },
      { label: 'Truyện chưa xuất bản', to: '/admin/content/unpublished', icon: ListChecks },
      { label: 'Báo cáo vi phạm', to: '/admin/reports', icon: Flag },
      { label: 'Quản lý người dùng', to: '/admin/users', icon: Users },
      { label: 'Yêu cầu hỗ trợ', to: '/admin/tickets', icon: MessageSquare }
    )
  }

  return <SidebarLayout items={USER_ITEMS} />
}
export default MainLayout
