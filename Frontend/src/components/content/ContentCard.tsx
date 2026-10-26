import { useState } from 'react'
import { Link } from 'react-router'
import { ImageOff, Coins, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentListItem } from '@/types/content'

// Pick needed data from ContentListItem + optional extra fields
type ContentCardData = Pick<
  ContentListItem,
  'id' | 'title' | 'type' | 'coverImageUrl' | 'uploader' | 'genres'
> & {
  priceCoins?: number | null
  ownershipTier?: string | null
  ranking?: number
  activeReaders?: number
}

interface ContentCardProps {
  content: ContentCardData
  className?: string
  priority?: boolean
}

export function ContentCard({ content, className, priority }: ContentCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = content.coverImageUrl && !imgFailed
  
  const genreNames = content.genres.slice(0, 2).map((g) => g.genre.name)
  const isNovel = content.type === 'Novel'

  return (
    <Link
      to={`/content/${content.id}`}
      className={cn(
        'group relative flex flex-col gap-2 rounded-2xl p-1.5 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {/* 1. COVER IMAGE CONTAINER */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-[#252f3b] shadow-md transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10">
        {showImage ? (
          <img
            src={content.coverImageUrl!}
            alt={content.title}
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/40 bg-gradient-to-b from-[#252f3b] to-[#1e2631]">
            <ImageOff className="h-8 w-8" aria-label="Không có ảnh bìa" />
            <span className="text-[10px] font-medium tracking-wide">NOVA MANGA</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 items-start z-10">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md',
              isNovel
                ? 'border border-emerald-400/30 bg-emerald-950/80 text-emerald-300'
                : 'border border-sky-400/30 bg-sky-950/80 text-sky-300'
            )}
          >
            {content.type}
          </span>
          {content.ownershipTier === 'Licensed' && (
            <span className="rounded-md border border-amber-400/30 bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 backdrop-blur-md">
              Bản quyền
            </span>
          )}
        </div>

        {/* Coin / Free Badge (Top Right) */}
        {typeof content.priceCoins === 'number' && content.priceCoins > 0 && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-amber-400/40 bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-md">
            <Coins className="h-3 w-3" />
            <span>{content.priceCoins}</span>
          </div>
        )}

        {/* Gradient shadow overlay on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1e2631] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-80" />

        {/* Quick View Button on Hover */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-center justify-center translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
            <BookOpen className="h-3.5 w-3.5" /> Đọc ngay
          </span>
        </div>
      </div>

      {/* 2. TEXT INFO */}
      <div className="min-w-0 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground/90 transition-colors group-hover:text-primary">
          {content.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground/80">
          {content.uploader?.username || 'Tác giả'}
        </p>
        {genreNames.length > 0 && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
            {genreNames.join(' · ')}
          </p>
        )}
      </div>
    </Link>
  )
}

export default ContentCard

