import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authorService } from '@/services/author.service'
import { ContentForm } from '@/components/content/ContentForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LicensedBrowseItem } from '@/types/content'

export function UploadTranslation() {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<LicensedBrowseItem | null>(null)

  const list = useQuery({
    queryKey: ['browse-licensed', search],
    enabled: !picked,
    queryFn: () => authorService.browseLicensed(search.trim() || undefined),
  })

  if (picked) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Đăng bản dịch</h1>
          <p className="text-sm text-muted-foreground">
            Dịch từ: <span className="font-medium text-foreground">{picked.title}</span>{' '}
            <button className="underline" onClick={() => setPicked(null)}>
              Đổi
            </button>
          </p>
        </div>
        <ContentForm type={picked.type} parentContentId={picked.id} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Đăng bản dịch</h1>
        <p className="text-sm text-muted-foreground">
          Chọn truyện Publisher đã xuất bản mà bạn được phép dịch. Sau đó điền thông tin cho bản dịch của mình.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="licensed-search" className="text-sm font-medium">Tìm truyện Publisher</label>
        <Input
          id="licensed-search"
          placeholder="Nhập tên truyện..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.isLoading && <p className="text-sm text-muted-foreground">Đang tải danh sách truyện...</p>}
      {list.isError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-destructive">Không tải được danh sách truyện. Vui lòng thử lại.</p>
          <Button size="sm" variant="outline" onClick={() => void list.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      {!list.isLoading && !list.isError && list.data?.length === 0 && (
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          {search.trim()
            ? 'Không tìm thấy truyện phù hợp với từ khóa này.'
            : 'Hiện chưa có truyện Publisher nào đủ điều kiện để dịch.'}
        </p>
      )}

      {!!list.data?.length && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.data.map((content) => (
            <li key={content.id} className="flex min-w-0 gap-3 rounded-lg border border-border p-3">
              {content.coverImageUrl ? (
                <img
                  src={content.coverImageUrl}
                  alt=""
                  className="h-24 w-16 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  Không có ảnh
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <p className="line-clamp-1 font-semibold">{content.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{content.type === 'Manga' ? 'Truyện tranh' : 'Truyện chữ'}</p>
                {content.synopsis && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{content.synopsis}</p>
                )}
                <Button className="mt-auto pt-2" size="sm" variant="outline" onClick={() => setPicked(content)}>
                  Chọn truyện này
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export default UploadTranslation
