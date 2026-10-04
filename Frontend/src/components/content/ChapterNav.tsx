import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { Chapter } from '@/types/chapter'

interface Props {
  contentId: string
  prev?: Chapter
  next?: Chapter
  readSegment: 'read-manga' | 'read-novel'
}

export function ChapterNav({ contentId, prev, next, readSegment }: Props) {
  const to = (c: Chapter) => `/content/${contentId}/${readSegment}/${c.id}`
  return (
    <div className="flex items-center justify-between gap-2">
      {prev ? (
        <Button asChild variant="outline" size="sm">
          <Link to={to(prev)}>← Chương trước</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>← Chương trước</Button>
      )}
      <Button asChild variant="ghost" size="sm">
        <Link to={`/content/${contentId}`}>Mục lục</Link>
      </Button>
      {next ? (
        <Button asChild variant="outline" size="sm">
          <Link to={to(next)}>Chương sau →</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>Chương sau →</Button>
      )}
    </div>
  )
}
