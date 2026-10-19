import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import type { ContentType, RankingCategory } from '@/types/content'
import { contentService } from '@/services/content.service'
import { ContentCard } from '@/components/content/ContentCard'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 18

const rankingOptions: { value: RankingCategory; label: string }[] = [
  { value: 'ongoing', label: 'Đang theo dõi' },
  { value: 'popular-manga', label: 'Manga phổ biến' },
  { value: 'popular-novel', label: 'Novel phổ biến' },
]

const selectClassName =
  'h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:flex-none'

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rankingCategory, setRankingCategory] = useState<RankingCategory>(() => {
    const initial = searchParams.get('ranking')
    return rankingOptions.find((option) => option.value === initial)?.value ?? 'ongoing'
  })
  const search = searchParams.get('search')?.trim() ?? ''
  const genreId = searchParams.get('genreId') ?? ''
  const tagId = searchParams.get('tagId') ?? ''
  const pageValue = Number(searchParams.get('page') ?? 1)
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const location = useLocation()

  const typeFilter: ContentType | undefined = location.pathname.includes('/novel')
    ? 'Novel'
    : location.pathname.includes('/manga')
      ? 'Manga'
      : undefined

  const contentsQuery = useQuery({
    queryKey: ['contents', { search, type: typeFilter, genreId, tagId, page }],
    queryFn: async () => {
      const response = await contentService.getAll({
        search: search || undefined,
        type: typeFilter,
        genreId: genreId || undefined,
        tagId: tagId || undefined,
        page,
        limit: PAGE_SIZE,
        publicationStatus: 'Published',
      })
      return response.data
    },
  })

  const rankingQuery = useQuery({
    queryKey: ['content-rankings', rankingCategory],
    queryFn: async () =>
      (await contentService.getRankings({ category: rankingCategory, limit: 6 })).data,
  })

  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: async () => (await contentService.getGenres()).data,
  })

  const popularTagsQuery = useQuery({
    queryKey: ['tags', 'popular'],
    queryFn: async () => (await contentService.getTags('popular')).data,
  })

  const allTagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await contentService.getTags()).data,
  })

  const popularPublishersQuery = useQuery({
    queryKey: ['publishers', 'popular'],
    queryFn: async () => (await contentService.getPublishers('popular')).data,
  })

  const updateFilters = (updates: Record<string, string>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      if (!Object.hasOwn(updates, 'page')) next.delete('page')
      return next
    })
  }

  const items = contentsQuery.data?.items ?? []
  const meta = contentsQuery.data?.meta
  const rankingItems = rankingQuery.data?.items ?? []
  const hasFilters = Boolean(genreId || tagId)

  return (
    <div className="container mx-auto space-y-10 px-4 py-8">
      <section className="space-y-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {search
                ? `Kết quả tìm kiếm: "${search}"`
                : typeFilter === 'Manga'
                  ? 'Truyện tranh (Manga)'
                  : typeFilter === 'Novel'
                    ? 'Tiểu thuyết (Novel)'
                    : 'Khám phá truyện'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {search
                ? `Tìm thấy ${meta?.total ?? 0} kết quả phù hợp`
                : 'Tìm truyện theo thể loại, thẻ hoặc khám phá các nội dung đang được quan tâm.'}
            </p>
          </div>
          {search && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Xem tất cả truyện</Link>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
          <div className="mr-1 flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Bộ lọc</span>
          </div>
          <label className="sr-only" htmlFor="genre-filter">Thể loại</label>
          <select
            id="genre-filter"
            aria-label="Lọc theo thể loại"
            className={selectClassName}
            value={genreId}
            onChange={(event) => updateFilters({ genreId: event.target.value })}
          >
            <option value="">Tất cả thể loại</option>
            {(genresQuery.data ?? []).map((genre) => (
              <option key={genre.id} value={genre.id}>{genre.name}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="tag-filter">Thẻ</label>
          <select
            id="tag-filter"
            aria-label="Lọc theo thẻ"
            className={selectClassName}
            value={tagId}
            onChange={(event) => updateFilters({ tagId: event.target.value })}
          >
            <option value="">Tất cả thẻ</option>
            {(allTagsQuery.data ?? []).map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          {hasFilters && (
            <Button
              className="h-9 px-3"
              variant="ghost"
              size="sm"
              onClick={() => updateFilters({ genreId: '', tagId: '' })}
            >
              Xóa lọc
            </Button>
          )}
          {genresQuery.isError && (
            <span className="px-1 text-xs text-destructive">Không thể tải thể loại.</span>
          )}
          {allTagsQuery.isError && (
            <span className="px-1 text-xs text-destructive">Không thể tải danh sách thẻ.</span>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold">Bảng xếp hạng</h2>
              <p className="text-xs text-muted-foreground">
                Dựa trên hoạt động đọc trong 7 ngày gần nhất
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Danh mục xếp hạng">
            {rankingOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={rankingCategory === option.value ? 'default' : 'outline'}
                aria-pressed={rankingCategory === option.value}
                onClick={() => setRankingCategory(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {rankingQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải bảng xếp hạng...
          </div>
        )}
        {rankingQuery.isError && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Không thể tải bảng xếp hạng.
          </p>
        )}
        {!rankingQuery.isLoading && !rankingQuery.isError && rankingItems.length === 0 && (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu đọc để xếp hạng trong khoảng thời gian này.
          </p>
        )}
        {rankingItems.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rankingItems.map((item, index) => (
              <div key={item.id} className="relative">
                <span className="absolute -left-2 -top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <ContentCard content={item} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.activeReaders} người đọc gần đây
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {hasFilters ? 'Truyện phù hợp' : search ? 'Kết quả tìm kiếm' : 'Mới cập nhật'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} truyện` : 'Các truyện đã được duyệt'}
            </p>
          </div>
        </div>

        {contentsQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Đang tải danh sách truyện...</p>
          </div>
        )}
        {contentsQuery.isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="mt-3 text-sm font-medium text-foreground">Không thể tải danh sách truyện</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => contentsQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        )}
        {!contentsQuery.isLoading && !contentsQuery.isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">
              {search ? `Không tìm thấy truyện khớp với "${search}"` : 'Không có truyện phù hợp'}
            </p>
            <p className="mt-1 text-xs">Thử thay đổi từ khóa hoặc bộ lọc.</p>
          </div>
        )}
        {!contentsQuery.isLoading && !contentsQuery.isError && items.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => <ContentCard key={item.id} content={item} />)}
            </div>
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateFilters({ page: String(page - 1) })}
                >
                  <ChevronLeft />
                  Trước
                </Button>
                <span className="text-sm text-muted-foreground">
                  Trang {page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => updateFilters({ page: String(page + 1) })}
                >
                  Tiếp
                  <ChevronRight />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="grid gap-8 border-t pt-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Thẻ phổ biến</h2>
          {popularTagsQuery.isError ? (
            <p className="text-sm text-destructive">Không thể tải danh sách thẻ.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(popularTagsQuery.data ?? []).slice(0, 12).map((tag) => (
                <Button
                  key={tag.id}
                  type="button"
                  size="sm"
                  variant={tagId === tag.id ? 'default' : 'outline'}
                  onClick={() => updateFilters({ tagId: tagId === tag.id ? '' : tag.id })}
                >
                  {tag.name}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Nhà xuất bản nổi bật</h2>
          {popularPublishersQuery.isError ? (
            <p className="text-sm text-destructive">Không thể tải danh sách nhà xuất bản.</p>
          ) : (popularPublishersQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có nhà xuất bản với truyện đã xuất bản.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(popularPublishersQuery.data ?? []).slice(0, 6).map((publisher) => (
                <li key={publisher.id} className="rounded-md border px-3 py-2">
                  <p className="truncate text-sm font-medium">{publisher.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {publisher.publishedContentCount} truyện · {publisher.activeReads} người đọc gần đây
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home
