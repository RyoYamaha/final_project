import { Link, useSearchParams, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import type { ContentType } from '@/types/content'
import { contentService } from '@/services/content.service'
import { ContentCard } from '@/components/content/ContentCard'
import { Button } from '@/components/ui/button'

// ==========================================
// TRANG CHỦ & TÌM KIẾM TRUYỆN (HOME PAGE)
// ==========================================
// Chức năng:
// 1. Hiển thị danh sách truyện mới nhất (mặc định)
// 2. Đọc query param `?search=...` từ URL (do Navbar đẩy sang) để tìm kiếm theo tên truyện
// 3. Phân chia giao diện theo các trạng thái: Đang tải, Lỗi, Trống kết quả, và Lưới truyện
export function Home() {
  // ==========================================
  // 1. ĐỌC THAM SỐ TÌM KIẾM TỪ URL
  // ==========================================
  // Navbar sử dụng `navigate('/?search=...')` nên trang Home sẽ dùng `useSearchParams` để đọc
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search')?.trim() ?? ''
  const location = useLocation()

  const typeFilter: ContentType | undefined = location.pathname.includes('/novel')
    ? 'Novel'
    : location.pathname.includes('/manga')
      ? 'Manga'
      : undefined

  // ==========================================
  // 2. GỌI API LẤY DANH SÁCH TRUYỆN
  // ==========================================
  // Query key phụ thuộc vào biến `search` và `typeFilter`: khi thay đổi, React Query tự động refetch
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contents', { search, type: typeFilter }],
    queryFn: async () => {
      const res = await contentService.getAll({
        search: search || undefined,
        type: typeFilter,
        publicationStatus: 'Published', // Độc giả chỉ xem các truyện đã được duyệt (Published)
      })
      return res.data
    },
  })

  const items = data?.items ?? []
  const total = data?.meta.total ?? 0

  // ==========================================
  // 3. HIỂN THỊ GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* 3.1. Tiêu đề mục: Thay đổi linh hoạt theo ngữ cảnh Tìm kiếm hoặc Trang chủ */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {search 
              ? `Kết quả tìm kiếm: "${search}"` 
              : typeFilter === 'Manga'
                ? 'Truyện tranh (Manga)'
                : typeFilter === 'Novel'
                  ? 'Tiểu thuyết (Novel)'
                  : 'Truyện mới cập nhật'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {search
              ? `Tìm thấy ${total} kết quả phù hợp`
              : 'Khám phá các bộ Manga & Novel hấp dẫn được cập nhật liên tục'}
          </p>
        </div>

        {/* Nút quay lại xem tất cả truyện khi đang ở chế độ tìm kiếm */}
        {search && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Xem tất cả truyện</Link>
          </Button>
        )}
      </div>

      {/* 3.2. Trạng thái: Đang tải dữ liệu */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm">Đang tải danh sách truyện...</p>
        </div>
      )}

      {/* 3.3. Trạng thái: Lỗi khi gọi API */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="mt-3 text-sm font-medium text-foreground">Không thể tải danh sách truyện</p>
          <p className="text-xs">Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.</p>
        </div>
      )}

      {/* 3.4. Trạng thái: Không có truyện nào (Danh sách trống hoặc không khớp từ khóa tìm kiếm) */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {search ? `Không tìm thấy truyện nào khớp với từ khóa "${search}"` : 'Chưa có truyện nào'}
          </p>
          <p className="mt-1 text-xs">
            {search ? 'Hãy thử tìm kiếm với từ khóa khác.' : 'Các bộ truyện mới sẽ sớm được cập nhật.'}
          </p>
          {search && (
            <Button variant="outline" size="sm" asChild className="mt-4">
              <Link to="/">Xóa bộ lọc tìm kiếm</Link>
            </Button>
          )}
        </div>
      )}

      {/* 3.5. Hiển thị danh sách truyện dạng lưới (Responsive Grid) */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <ContentCard key={item.id} content={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Home

