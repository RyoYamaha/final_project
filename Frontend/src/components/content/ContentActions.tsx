import { Bookmark, Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useCollection, type CollectionKind } from '@/hooks/useCollection'

// ==========================================
// 1. COMPONENT NÚT BẤM DÙNG CHUNG (TOGGLE BUTTON)
// ==========================================
// Thành phần này dùng chung cho cả tính năng "Bookmark" và "Yêu thích".
// Nhận vào `kind` (loại), `contentId` (ID truyện) và `Icon` (biểu tượng).
function ToggleButton({
  kind,
  contentId,
  label,
  Icon,
}: {
  kind: CollectionKind
  contentId: string
  label: string
  Icon: typeof Heart
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const { has, add, remove, isLoading } = useCollection(kind)

  // Kiểm tra xem truyện này đã có trong bộ sưu tập chưa
  const active = has(contentId)
  // Disable nút bấm khi đang gọi API tải/đợi thêm/đợi xóa để tránh bấm liên tục (Spam)
  const busy = add.isPending || remove.isPending || (!!user && isLoading)

  const onClick = () => {
    // Nếu chưa đăng nhập -> Đẩy về trang /login và lưu lại đường dẫn hiện tại (location)
    if (!user) return navigate('/login', { state: { from: location } })
    
    // Đã đăng nhập -> Nếu đã lưu thì Xóa, chưa lưu thì Thêm
    if (active) remove.mutate(contentId)
    else add.mutate(contentId)
  }

  return (
    <Button variant={active ? 'default' : 'outline'} size="sm" disabled={busy} onClick={onClick}>
      <Icon className={`mr-1.5 h-4 w-4 ${active ? 'fill-current' : ''}`} />
      {label}
    </Button>
  )
}

// ==========================================
// 2. VÙNG CHỨA CÁC NÚT (ACTIONS CONTAINER)
// ==========================================
// Gói các nút chức năng lại thành 1 cụm để gắn vào trang Chi tiết truyện
export function ContentActions({ contentId }: { contentId: string }) {
  const user = useAuthStore((s) => s.user)
  
  if (user && user.role !== 'Reader') {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ToggleButton kind="bookmarks" contentId={contentId} label="Bookmark" Icon={Bookmark} />
      <ToggleButton kind="favorites" contentId={contentId} label="Yêu thích" Icon={Heart} />
    </div>
  )
}
