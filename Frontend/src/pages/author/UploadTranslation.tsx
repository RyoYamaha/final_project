import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authorService } from '@/services/author.service'
import { ContentForm } from '@/components/content/ContentForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ContentListItem } from '@/types/content'

export function UploadTranslation() {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<ContentListItem | null>(null)

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
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Chọn truyện bản quyền để dịch</h1>
      <Input placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {list.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {list.isError && <p className="text-sm">Không tải được danh sách.</p>}
      {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Không có truyện phù hợp.</p>}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {list.data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.type}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPicked(c)}>
              Chọn
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
export default UploadTranslation
