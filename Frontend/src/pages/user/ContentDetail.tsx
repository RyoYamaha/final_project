import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ImageOff } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

// Import khuôn (DTO) để ép kiểu dữ liệu trả về từ API
import type { ContentDetailData } from '@/types/content'

export function ContentDetail() {
  // ==========================================
  // 1. LẤY ID TRUYỆN TỪ URL
  // ==========================================
  // useParams() tự động bóc lấy chữ 'id' trên thanh địa chỉ. Ví dụ URL là /content/123 -> id = '123'
  const { id } = useParams<{ id: string }>()

  // ==========================================
  // 2. GỌI API BẰNG REACT-QUERY ĐỂ LẤY DỮ LIỆU
  // ==========================================
  // useQuery giúp tự động fetch data, lưu cache, và cung cấp sẵn các biến trạng thái (isLoading, isError)
  const { data, isLoading, isError, error, refetch } = useQuery({
    // Đặt tên cho truy vấn này là ['content', id] để react-query biết đường lưu cache
    queryKey: ['content', id],

    // enabled: !!id nghĩa là "chỉ chạy API khi nào có id"
    enabled: !!id,

    // Nếu bị lỗi mạng thì thử lại tối đa 2 lần. Nhưng nếu là lỗi 404 (Không tìm thấy truyện) thì KHÔNG thử lại (vô ích).
    retry: (count, err) => !(isAxiosError(err) && err.response?.status === 404) && count < 2,

    // Hàm thực sự đi gọi API. Kết quả lấy về sẽ được ép chặt vào khuôn ContentDetailData
    queryFn: async () => (await api.get<ContentDetailData>(`/content/${id}`)).data,
  })

  // ==========================================
  // 3. XỬ LÝ CÁC TRẠNG THÁI (LOADING / ERROR)
  // ==========================================

  // Trạng thái 1: Đang chờ mạng tải về
  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>

  // Trạng thái 2: Mạng bị lỗi hoặc Backend báo lỗi
  if (isError) {
    const notFound = isAxiosError(error) && error.response?.status === 404
    return (
      <div className="space-y-3">
        <p>{notFound ? 'Không tìm thấy truyện.' : 'Không tải được thông tin truyện.'}</p>
        {!notFound && (
          // Nút thử lại gọi hàm refetch() của react-query để fetch lại API
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        )}
      </div>
    )
  }

  // Trạng thái 3: Nếu không có lỗi nhưng data bị rỗng (đề phòng) thì không hiển thị gì cả
  if (!data) return null

  // ==========================================
  // 4. CHUẨN BỊ DỮ LIỆU ĐỂ HIỂN THỊ
  // ==========================================

  // Lớp phòng thủ Frontend: Backend (có thể) đã trả về cả những chương chưa xuất bản (bị ẩn, chờ duyệt...).
  // Do đó, ta PHẢI LỌC lại: Chỉ lấy những chương có moderationStatus === 'Published'.
  // Sau đó sắp xếp theo thứ tự số chương từ bé đến lớn.
  const chapters = data.chapters
    .filter((c) => c.moderationStatus === 'Published')
    .sort((a, b) => a.number - b.number)

  // Hàm sinh ra link để đọc truyện. Tùy thuộc truyện là Manga hay Novel mà chèn chữ tương ứng vào link.
  const readPath = (chapterId: string) =>
    `/content/${data.id}/${data.type === 'Manga' ? 'read-manga' : 'read-novel'}/${chapterId}`

  // ==========================================
  // 5. RENDER GIAO DIỆN CHÍNH
  // ==========================================
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* --- PHẦN 1: ẢNH BÌA VÀ THÔNG TIN CƠ BẢN --- */}
      <div className="flex flex-col gap-6 sm:flex-row">

        {/* Khung Ảnh Bìa */}
        <div className="aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {data.coverImageUrl ? (
            <img src={data.coverImageUrl} alt={data.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Cụm Chữ Thông Tin (Tên, Thể loại, Tác giả...) */}
        <div className="min-w-0 space-y-3">
          <h1 className="text-2xl font-bold">{data.title}</h1>

          <p className="text-sm text-muted-foreground">
            {data.type} · {data.storyStatus} · Đăng bởi {data.uploader.username}
            {data.publisher && ` · NXB ${data.publisher.organizationName}`}
          </p>

          {/* Nếu truyện này là bản dịch (Fan Translation), hiện link trỏ về bản gốc */}
          {data.parentContent && (
            <p className="text-sm">
              Bản dịch của{' '}
              <Link to={`/content/${data.parentContent.id}`} className="underline underline-offset-4">
                {data.parentContent.title}
              </Link>
            </p>
          )}

          {/* Hiển thị Thể Loại (Genres) và Tags */}
          <div className="flex flex-wrap gap-2">
            {data.genres.map(({ genre }) => (
              <span key={genre.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                {genre.name}
              </span>
            ))}
            {data.tags.map(({ tag }) => (
              <span key={tag.id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                #{tag.name}
              </span>
            ))}
          </div>

          {/* Nút Đọc từ đầu (Lấy ID của chương đầu tiên trong mảng chapters đã lọc) */}
          {chapters.length > 0 && (
            <Button asChild>
              <Link to={readPath(chapters[0].id)}>Đọc từ đầu</Link>
            </Button>
          )}
        </div>
      </div>

      {/* --- PHẦN 2: TÓM TẮT TRUYỆN (SYNOPSIS) --- */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Giới thiệu</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {data.synopsis || 'Chưa có giới thiệu.'}
        </p>
      </section>

      {/* --- PHẦN 3: DANH SÁCH CHƯƠNG --- */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Danh sách chương ({chapters.length})</h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có chương nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {chapters.map((c) => (
              <li key={c.id}>
                {/* Mỗi một dòng là một Link bấm vào sẽ nhảy sang trang đọc truyện tương ứng */}
                <Link to={readPath(c.id)} className="flex justify-between gap-4 px-4 py-2.5 text-sm hover:bg-muted">
                  <span className="truncate">
                    Chương {c.number}
                    {c.title ? `: ${c.title}` : ''}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {/* Hiển thị ngày đăng dưới dạng chuẩn Việt Nam */}
                    {(c.publishedAt || c.createdAt)
                      ? new Date(c.publishedAt ?? c.createdAt!).toLocaleDateString('vi-VN')
                      : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ContentDetail
