import { LayoutDashboard, Library, BookUp, FileUp, Languages, ShieldCheck } from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'
import type { SidebarItem } from './Sidebar'

const AUTHOR_ITEMS: SidebarItem[] = [
  { label: 'Bảng điều khiển', to: '/author/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Danh mục truyện', to: '/author/catalog', icon: Library },
  { label: 'Đăng truyện tranh', to: '/author/upload/manga', icon: BookUp },
  { label: 'Đăng tiểu thuyết', to: '/author/upload/novel', icon: FileUp },
  { label: 'Đăng bản dịch (Tranh)', to: '/author/upload-translation-manga', icon: Languages },
  { label: 'Đăng bản dịch (Chữ)', to: '/author/upload-translation-novel', icon: Languages },
  { label: 'Bản quyền & Chính sách', to: '/author/copyright', icon: ShieldCheck },
]

export function AuthorLayout() {
  return <SidebarLayout items={AUTHOR_ITEMS} title="Khu vực Tác giả" />
}

export default AuthorLayout
