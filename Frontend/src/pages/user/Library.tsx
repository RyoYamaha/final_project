import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ImageOff, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCollection } from '@/hooks/useCollection'
import type { ContentType } from '@/types/content'

const TABS: { id: ContentType; label: string }[] = [
  { id: 'Manga', label: 'Comic list' },
  { id: 'Novel', label: 'Novel list' },
]

export function Library() {
  const user = useAuthStore(s => s.user)
  
  const [activeTab, setActiveTab] = useState<ContentType>('Manga')
  const [searchQuery, setSearchQuery] = useState('')

  if (user?.role !== 'Reader') {
    return <Navigate to="/" replace />
  }
  
  // Lấy dữ liệu (Mặc định dùng bookmarks cho My list)
  const { data, isLoading, isError, refetch, remove } = useCollection('bookmarks')

  // Lọc dữ liệu theo Tab (Manga/Novel) và Search
  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((item) => {
      const matchTab = item.content.type === activeTab
      const matchSearch = item.content.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchTab && matchSearch
    })
  }, [data, activeTab, searchQuery])

  return (
    <div className="mx-auto max-w-5xl space-y-6 w-full animate-in fade-in duration-500 p-4">
      
      {/* Tabs (Mô phỏng mockup) */}
      <div className="flex border-b border-border/50">
        {TABS.map((t) => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-6 py-3 text-sm font-medium transition-all relative ${
                isActive 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              {t.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-sm mt-4 mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 bg-muted/30 border-muted rounded-md focus-visible:ring-1"
        />
      </div>

      {isLoading && (
        <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">
          Đang tải danh sách...
        </div>
      )}

      {isError && (
        <div className="py-10 text-center space-y-3">
          <p className="text-sm text-destructive">Không tải được danh sách.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <div className="w-full">
          {/* Table Header */}
          <div className="grid grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr_50px] gap-4 py-3 px-2 border-b border-border/50 text-sm font-semibold text-muted-foreground">
            <div>Title</div>
            <div className="text-center">Rating</div>
            <div className="text-center">Continue</div>
            <div className="text-center">Status</div>
            <div></div>
          </div>

          {/* Table Body */}
          {filteredData.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground bg-muted/10 rounded-lg mt-2 border border-dashed border-border/50">
              {searchQuery ? 'Không tìm thấy truyện phù hợp.' : 'Chưa có truyện nào trong danh sách này.'}
            </div>
          ) : (
            <ul className="flex flex-col mt-2">
              {filteredData.map((e) => (
                <li 
                  key={e.id} 
                  className="grid grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr_50px] gap-4 items-center py-4 px-2 border-b border-border/30 hover:bg-muted/10 transition-colors rounded-lg group"
                >
                  {/* Title Column */}
                  <Link to={`/content/${e.content.id}`} className="flex items-center gap-4 min-w-0">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
                      {e.content.coverImageUrl ? (
                        <img src={e.content.coverImageUrl} alt={e.content.title} className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {e.content.title}
                      </p>
                      {/* Fake author / meta text line */}
                      <div className="h-2 w-16 bg-muted rounded-full"></div>
                    </div>
                  </Link>

                  {/* Rating Column */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-foreground min-w-[60px]">
                      4.5
                    </span>
                  </div>

                  {/* Continue Column */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-foreground min-w-[80px]">
                      Ch. 1
                    </span>
                  </div>

                  {/* Status Column */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-foreground min-w-[80px] capitalize">
                      {e.content.storyStatus?.toLowerCase() || 'Ongoing'}
                    </span>
                  </div>

                  {/* Action Column */}
                  <div className="flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Xoá khỏi danh sách"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(e.contentId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default Library

