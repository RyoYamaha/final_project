import { Home, Library, History, ShieldCheck, MessageSquare, BookOpen, LayoutDashboard, ListChecks, Flag, ClipboardList, Users, Languages, Wallet, Banknote, ChartNoAxesCombined, Settings, ShieldAlert } from 'lucide-react'
import { Navigate } from 'react-router'
import { SidebarLayout } from './SidebarLayout'
import type { SidebarItem } from './Sidebar'
import { useAuthStore } from '@/stores/auth-store'

export const MainLayout = () => {
  const user = useAuthStore((s) => s.user)

  if (user?.role === 'Reader' && !user.onboardingCompletedAt) {
    return <Navigate to="/onboarding" replace />
  }
  
  const USER_ITEMS: SidebarItem[] = [
    { label: 'Trang chủ', to: '/', icon: Home, end: true },
  ]

  if (user?.role === 'Reader') {
    USER_ITEMS.push({ label: 'Ví coin', to: '/wallet', icon: Wallet })
  }

  // Chỉ hiển thị Thư viện cho Reader
  if (user?.role === 'Reader') {
    USER_ITEMS.push(
      { label: 'Thư viện', to: '/library', icon: Library },
      { label: 'Lịch sử đọc', to: '/history', icon: History },
      { label: 'Sở thích thể loại', to: '/settings/preferences', icon: Settings },
    )
  }

  // Các mục chung cho tất cả
  if (user && user.role !== 'Admin' && user.role !== 'Author') {
    USER_ITEMS.push({ label: 'Báo cáo của tôi', to: '/my-reports', icon: ClipboardList })
  }

  if (user?.role !== 'Admin' && user?.role !== 'Publisher' && user?.role !== 'Author') {
    USER_ITEMS.push({ label: 'Hỗ trợ', to: '/support', icon: MessageSquare })
  }

  if (user?.role === 'Author') {
    USER_ITEMS.push(
      { label: 'Dashboard Tác giả', to: '/author/dashboard', icon: LayoutDashboard },
      { label: 'Tạo truyện', to: '/author/create', icon: BookOpen },
      { label: 'Đăng bản dịch', to: '/author/upload/translation', icon: Languages },
      { label: 'Doanh thu và rút coin', to: '/earnings', icon: ChartNoAxesCombined }
    )
  } else if (user?.role === 'Publisher') {
    USER_ITEMS.push(
      { label: 'Dashboard Analytics', to: '/publisher/dashboard', icon: LayoutDashboard },
      { label: 'Quản lý danh mục', to: '/publisher/catalog', icon: Library, end: true },
      { label: 'Tạo truyện', to: '/publisher/create', icon: BookOpen },
      { label: 'Compliance Center', to: '/publisher/compliance', icon: ShieldCheck },
      { label: 'Doanh thu và rút coin', to: '/earnings', icon: ChartNoAxesCombined }
    )
  } else if (user?.role === 'Admin') {
    USER_ITEMS.push(
      { label: 'Dashboard Admin', to: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Truyện đã xuất bản', to: '/admin/content/published', icon: LayoutDashboard },
      { label: 'Truyện chưa xuất bản', to: '/admin/content/unpublished', icon: ListChecks },
      { label: 'Báo cáo vi phạm', to: '/admin/reports', icon: Flag },
      { label: 'Từ khóa cảnh báo Novel', to: '/admin/novel-moderation', icon: ShieldAlert },
      { label: 'Quản lý người dùng', to: '/admin/users', icon: Users },
      { label: 'Yêu cầu hỗ trợ', to: '/admin/tickets', icon: MessageSquare },
      { label: 'Quản lý nạp coin', to: '/admin/payments', icon: Banknote },
      { label: 'Quản lý payout', to: '/admin/payouts', icon: ChartNoAxesCombined }
    )
  }

  return <SidebarLayout items={USER_ITEMS} />
}
export default MainLayout
