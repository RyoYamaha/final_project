import { LayoutDashboard, Library, ShieldCheck } from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'
import type { SidebarItem } from './Sidebar'

const PUBLISHER_ITEMS: SidebarItem[] = [
  { label: 'Bảng điều khiển', to: '/publisher/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Quản lý Catalog', to: '/publisher/catalog', icon: Library },
  { label: 'Thông tin Bản quyền', to: '/publisher/compliance', icon: ShieldCheck },
]

export function PublisherLayout() {
  return <SidebarLayout items={PUBLISHER_ITEMS} title="Khu vực Nhà xuất bản" />
}

export default PublisherLayout
