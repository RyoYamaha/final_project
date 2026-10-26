import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  History,
  Loader2,
  Play,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import type { ContentType, RankingCategory } from '@/types/content'
import { contentService } from '@/services/content.service'
import { readingProgressService } from '@/services/reading-progress.service'
import { ContentCard } from '@/components/content/ContentCard'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

const PAGE_SIZE = 18

const rankingOptions: { value: RankingCategory; label: string }[] = [
  { value: 'ongoing', label: '🔥 Đang theo dõi' },
  { value: 'popular-manga', label: '📖 Manga nổi bật' },
  { value: 'popular-novel', label: '✨ Novel nổi bật' },
]

const selectClassName =
  'h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#252f3b] px-3 text-sm text-foreground transition-colors hover:border-white/20 focus:border-primary focus:outline-none sm:w-auto sm:flex-none'

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
  const user = useAuthStore((state) => state.user)

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

  const recommendationsQuery = useQuery({
    queryKey: ['content-recommendations', user?.id],
    enabled: user?.role === 'Reader',
    queryFn: async () => (await contentService.getRecommendations({ page: 1, limit: 6 })).data,
  })

  const continueReadingQuery = useQuery({
    queryKey: ['reading-history', user?.id],
    enabled: !!user && user.role === 'Reader',
    queryFn: async () => (await readingProgressService.getMyHistory()).data,
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
  const historyList = continueReadingQuery.data ?? []

  const featuredContent =
    rankingItems.find((item) => !typeFilter || item.type === typeFilter) ??
    items[0] ??
    rankingItems[0]

  return (
    <div className="container mx-auto space-y-10 px-3 py-4 sm:px-6 sm:py-8">
      {/* 1. HERO BILLBOARD / SHOWCASE (Netflix Style) */}
      {!search && featuredContent && (
        <section
          aria-label="Truyện nổi bật"
          className="relative isolate min-h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#18202b] via-[#1e2631] to-[#252f3b] shadow-2xl sm:min-h-[380px]"
        >
          {featuredContent.coverImageUrl && (
            <div className="absolute inset-y-0 right-0 z-0 w-full sm:w-2/3 md:w-1/2">
              <img
                src={featuredContent.coverImageUrl}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover object-top opacity-35 filter brightness-90 sm:opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#18202b] via-[#18202b]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#18202b] via-transparent to-transparent" />
            </div>
          )}

          <div className="relative z-10 flex min-h-[300px] max-w-2xl flex-col items-start justify-center p-6 sm:min-h-[380px] sm:p-12">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Flame className="h-3.5 w-3.5" />
                Thịnh hành nhất
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
                {featuredContent.type}
              </span>
              {featuredContent.ownershipTier === 'Licensed' && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  Bản quyền chính thức
                </span>
              )}
            </div>

            <h1 className="line-clamp-2 text-2xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              {featuredContent.title}
            </h1>

            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Đăng bởi <span className="font-semibold text-white">{featuredContent.uploader.username}</span>
              {featuredContent.genres.length > 0 &&
                ` · ${featuredContent.genres.slice(0, 3).map((g) => g.genre.name).join(' · ')}`}
            </p>

            <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Trải nghiệm đọc đỉnh cao với hình ảnh chất lượng cao và giao diện tối ưu hóa cho cả máy tính lẫn điện thoại.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-xl px-6 font-semibold shadow-lg shadow-primary/20">
                <Link to={`/content/${featuredContent.id}`}>
                  <Play className="mr-2 h-4 w-4 fill-current" /> Đọc ngay
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-white/15 bg-white/5 px-5 backdrop-blur-md hover:bg-white/10">
                <Link to={`/content/${featuredContent.id}`}>
                  Xem chi tiết
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 2. CONTINUE READING RAIL (Tiếp tục đọc - Comick/Netflix Style) */}
      {user?.role === 'Reader' && historyList.length > 0 && !search && (
        <section className="space-y-4 rounded-2xl border border-white/5 bg-[#252f3b]/50 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Tiếp tục đọc</h2>
                <p className="text-xs text-muted-foreground">Theo dõi tiến trình các chương bạn đang đọc dở</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <Link to="/history">Xem lịch sử</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historyList.slice(0, 3).map((item) => {
              const readUrl = `/content/${item.content.id}/${
                item.content.type === 'Manga' ? 'read-manga' : 'read-novel'
              }/${item.lastChapter.id}`

              return (
                <div
                  key={item.contentId}
                  className="group flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:bg-[#2a3644]"
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.content.coverImageUrl ? (
                      <img
                        src={item.content.coverImageUrl}
                        alt={item.content.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {item.content.type}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold group-hover:text-primary">
                      {item.content.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chương {item.lastChapter.number} {item.lastChapter.title && `· ${item.lastChapter.title}`}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {new Date(item.lastReadAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <Button asChild size="sm" className="shrink-0 rounded-lg px-3">
                    <Link to={readUrl}>
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 3. PERSONALIZED RECOMMENDATIONS RAIL */}
      {user?.role === 'Reader' && !search && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gợi ý dành riêng cho bạn</h2>
                <p className="text-xs text-muted-foreground">
                  {recommendationsQuery.data?.fallback
                    ? 'Dựa trên các tác phẩm được đọc nhiều nhất trong cộng đồng'
                    : 'Được tuyển chọn dựa trên thể loại yêu thích của bạn'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-xl border-white/10 text-xs">
              <Link to="/settings/preferences">Tùy chỉnh sở thích</Link>
            </Button>
          </div>

          {recommendationsQuery.isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang cá nhân hóa nội dung...
            </div>
          )}

          {recommendationsQuery.isError && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Không thể tải gợi ý lúc này.
            </p>
          )}

          {!recommendationsQuery.isLoading &&
            !recommendationsQuery.isError &&
            recommendationsQuery.data?.items.length === 0 && (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Chưa có gợi ý phù hợp. Khám phá các truyện đang thịnh hành phía dưới.
              </p>
            )}

          {!!recommendationsQuery.data?.items.length && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {recommendationsQuery.data.items.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <ContentCard content={item} />
                  <span className="mt-1 px-1 text-[11px] font-medium text-purple-300/80">
                    {item.matchingGenres
                      ? `✨ ${item.matchingGenres} thể loại hợp gu`
                      : `🔥 ${item.activeReaders} người đọc gần đây`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. TOP RANKINGS (Podium Badges) */}
      {!search && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bảng Xếp Hạng</h2>
                <p className="text-xs text-muted-foreground">
                  Xếp hạng dựa trên lượt đọc thực tế trong 7 ngày gần nhất
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/5 bg-[#252f3b] p-1" aria-label="Danh mục xếp hạng">
              {rankingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRankingCategory(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    rankingCategory === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {rankingQuery.isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tính toán bảng xếp hạng...
            </div>
          )}

          {rankingItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {rankingItems.map((item, index) => {
                const rank = index + 1
                const medalBg =
                  rank === 1
                    ? 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-black shadow-amber-500/30'
                    : rank === 2
                      ? 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-black shadow-slate-400/30'
                      : rank === 3
                        ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-stone-700 text-white shadow-orange-500/30'
                        : 'bg-[#252f3b] text-foreground border border-white/10'

                return (
                  <div key={item.id} className="relative">
                    <span
                      className={`absolute -left-2 -top-2 z-20 flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-black shadow-lg ${medalBg}`}
                    >
                      #{rank}
                    </span>
                    <ContentCard content={item} />
                    <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                      {item.activeReaders} lượt đọc tuần này
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. SEARCH & FILTER CONTROLS */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {search
                ? `Kết quả tìm kiếm cho: "${search}"`
                : typeFilter === 'Manga'
                  ? 'Tất cả Truyện Tranh (Manga)'
                  : typeFilter === 'Novel'
                    ? 'Tất cả Tiểu Thuyết (Novel)'
                    : 'Khám Phá Tất Cả Tác Phẩm'}
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {meta ? `Tổng cộng ${meta.total} tác phẩm đã duyệt và phát hành.` : 'Đang cập nhật'}
            </p>
          </div>
          {search && (
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <Link to="/">Quay về trang chủ</Link>
            </Button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/10 bg-[#252f3b]/70 p-3 backdrop-blur-md">
          <div className="mr-1 flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Bộ lọc:</span>
          </div>

          <label className="sr-only" htmlFor="genre-filter">Thể loại</label>
          <select
            id="genre-filter"
            aria-label="Lọc theo thể loại"
            className={selectClassName}
            value={genreId}
            onChange={(event) => updateFilters({ genreId: event.target.value })}
          >
            <option value="">Tất cả Thể loại</option>
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
            <option value="">Tất cả Thẻ</option>
            {(allTagsQuery.data ?? []).map((tag) => (
              <option key={tag.id} value={tag.id}>#{tag.name}</option>
            ))}
          </select>

          {hasFilters && (
            <Button
              className="h-10 rounded-xl px-3 text-xs"
              variant="ghost"
              size="sm"
              onClick={() => updateFilters({ genreId: '', tagId: '' })}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* 6. CONTENT GRID */}
        {contentsQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium">Đang tải danh sách tác phẩm...</p>
          </div>
        )}

        {contentsQuery.isError && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 py-12 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="mt-3 text-base font-semibold text-foreground">Không thể tải danh sách truyện</p>
            <Button className="mt-3 rounded-xl" variant="outline" size="sm" onClick={() => contentsQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        )}

        {!contentsQuery.isLoading && !contentsQuery.isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#252f3b]/30 py-16 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-base font-semibold text-foreground">
              {search ? `Không tìm thấy truyện phù hợp với "${search}"` : 'Không có truyện nào phù hợp bộ lọc'}
            </p>
            <p className="mt-1 text-xs">Thử thay đổi từ khóa hoặc xóa bớt tiêu chí lọc.</p>
          </div>
        )}

        {!contentsQuery.isLoading && !contentsQuery.isError && items.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => (
                <ContentCard key={item.id} content={item} />
              ))}
            </div>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-white/10 px-4"
                  disabled={page <= 1}
                  onClick={() => updateFilters({ page: String(page - 1) })}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Trang trước
                </Button>
                <span className="rounded-xl border border-white/5 bg-[#252f3b] px-4 py-1.5 text-xs font-semibold tabular-nums text-foreground">
                  {page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-white/10 px-4"
                  disabled={page >= meta.totalPages}
                  onClick={() => updateFilters({ page: String(page + 1) })}
                >
                  Trang sau <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 7. POPULAR TAGS & PUBLISHERS FOOTER RAILS */}
      <section className="grid gap-6 border-t border-white/10 pt-8 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Thẻ thịnh hành</h3>
          <div className="flex flex-wrap gap-2">
            {(popularTagsQuery.data ?? []).slice(0, 12).map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => updateFilters({ tagId: tagId === tag.id ? '' : tag.id })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  tagId === tag.id
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'border border-white/10 bg-[#252f3b] text-muted-foreground hover:border-white/20 hover:text-foreground'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Nhà xuất bản đối tác</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(popularPublishersQuery.data ?? []).slice(0, 4).map((pub) => (
              <li key={pub.id} className="rounded-xl border border-white/10 bg-[#252f3b] p-3 shadow-sm">
                <p className="truncate text-sm font-semibold text-foreground">{pub.organizationName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pub.publishedContentCount} tác phẩm phát hành
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

export default Home
