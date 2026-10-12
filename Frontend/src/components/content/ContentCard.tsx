import { useState } from 'react'
import { Link } from 'react-router'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentListItem } from '@/types/content'

// ==========================================
// COMPONENT THẺ TRUYỆN (Dùng ở Trang chủ, Thư viện, Tìm kiếm...)
// ==========================================

// Chọn lọc ra những dữ liệu cần thiết nhất để hiển thị thẻ truyện từ ContentListItem
type ContentCardData = Pick<
  ContentListItem,
  'id' | 'title' | 'type' | 'coverImageUrl' | 'uploader' | 'genres'
>

interface ContentCardProps {
  content: ContentCardData
  className?: string
}

export function ContentCard({ content, className }: ContentCardProps) {
  // Xử lý lỗi load ảnh: Nếu ảnh bị lỗi 404 thì sẽ hiển thị icon ImageOff
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = content.coverImageUrl && !imgFailed
  
  // Chỉ lấy tối đa 2 thể loại đầu tiên để hiển thị cho gọn
  const genreNames = content.genres.slice(0, 2).map((g) => g.genre.name)

  return (
    <Link
      to={`/content/${content.id}`}
      className={cn(
        'group flex flex-col gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {/* 1. KHU VỰC ẢNH BÌA */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted">
        {showImage ? (
          <img
            src={content.coverImageUrl!}
            alt={content.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" aria-label="Không có ảnh bìa" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
          {content.type}
        </span>
      </div>

      {/* 2. KHU VỰC CHỮ (Tiêu đề, Tác giả, Thể loại) */}
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {content.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">{content.uploader.username}</p>
        {genreNames.length > 0 && (
          <p className="truncate text-xs text-muted-foreground/80">{genreNames.join(' · ')}</p>
        )}
      </div>
    </Link>
  )
}

export default ContentCard
