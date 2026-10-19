import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { readingProgressService, type ReadingHistoryItem } from '@/services/reading-progress.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, ImageOff, Search } from 'lucide-react'

const FILTERS = [
  { id: 'All', label: 'Tất cả' },
  { id: 'Manga', label: 'Manga' },
  { id: 'Novel', label: 'Novel' },
] as const

type HistoryFilter = (typeof FILTERS)[number]['id']

function getReaderPath(item: ReadingHistoryItem) {
  const reader = item.content.type === 'Manga' ? 'read-manga' : 'read-novel'
  return `/content/${item.content.id}/${reader}/${item.lastChapter.id}`
}

function formatReadDate(date: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function History() {
  const user = useAuthStore((state) => state.user)
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reading-progress', 'history'],
    enabled: user?.role === 'Reader',
    queryFn: async () => (await readingProgressService.getMyHistory()).data,
  })

  const filteredHistory = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    return (data ?? []).filter((item) => {
      const matchesType = activeFilter === 'All' || item.content.type === activeFilter
      const matchesTitle = item.content.title.toLocaleLowerCase().includes(normalizedQuery)
      return matchesType && matchesTitle
    })
  }, [activeFilter, data, searchQuery])

  if (user?.role !== 'Reader') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Lịch sử đọc</h1>
        <p className="text-sm text-muted-foreground">
          Những bộ truyện bạn đã đọc gần đây, sắp xếp theo thời gian đọc mới nhất.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex border-b border-border/50" aria-label="Lọc lịch sử theo thể loại">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={activeFilter === filter.id}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              {filter.label}
              {activeFilter === filter.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-foreground" />
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm tên truyện..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-muted-foreground" role="status">
          Đang tải lịch sử đọc...
        </p>
      )}

      {isError && (
        <div className="space-y-3 py-12 text-center">
          <p className="text-sm text-destructive">Không tải được lịch sử đọc.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {!isLoading && !isError && filteredHistory.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 py-16 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {searchQuery.trim()
              ? 'Không tìm thấy truyện phù hợp.'
              : data?.length
                ? 'Chưa có truyện nào trong mục này.'
                : 'Bạn chưa có lịch sử đọc. Hãy bắt đầu đọc một bộ truyện nhé!'}
          </p>
        </div>
      )}

      {!isLoading && !isError && filteredHistory.length > 0 && (
        <ul className="divide-y divide-border/50">
          {filteredHistory.map((item) => (
            <li
              key={item.contentId}
              className="flex flex-col gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center"
            >
              <Link
                to={`/content/${item.content.id}`}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {item.content.coverImageUrl ? (
                    <img
                      src={item.content.coverImageUrl}
                      alt={item.content.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="truncate font-semibold">{item.content.title}</h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.lastChapter.title || `Chương ${item.lastChapter.number}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Đọc lần cuối: {formatReadDate(item.lastReadAt)}
                  </p>
                </div>
              </Link>

              <Button asChild size="sm" className="shrink-0">
                <Link to={getReaderPath(item)}>Đọc tiếp</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default History
