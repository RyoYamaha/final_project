import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { chapterService } from '@/services/chapter.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, ImagePlus, Loader2, ArrowLeft, Clock } from 'lucide-react'

const schema = z.object({
  title: z.string().trim().max(255, 'Tối đa 255 ký tự').optional(),
  textBody: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type PageItem = 
  | { type: 'existing'; id: string; url: string }
  | { type: 'new'; id: string; file: File; url: string }

export function EditChapter() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [items, setItems] = useState<PageItem[]>([])
  const [deletedPageIds, setDeletedPageIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null)

  // Fetch content info
  const content = useQuery({
    queryKey: ['content', id],
    queryFn: async () => (await contentService.getDetail(id!)).data,
  })

  // Fetch existing chapter pages (author endpoint — works even when PendingReview)
  const chapterPagesQuery = useQuery({
    queryKey: ['chapter-pages-author', chapterId],
    queryFn: async () => await chapterService.getMangaPagesForAuthor(chapterId!),
    enabled: !!chapterId && content.data?.type === 'Manga',
  })

  // Fetch novel text (author endpoint — works even when PendingReview)
  const novelChapterQuery = useQuery({
    queryKey: ['novel-chapter-text-author', chapterId],
    queryFn: async () => await chapterService.getNovelChapterTextForAuthor(chapterId!),
    enabled: !!chapterId && content.data?.type === 'Novel',
  })

  useEffect(() => {
    if (chapterPagesQuery.data) {
      const existingItems: PageItem[] = chapterPagesQuery.data.map((p: any) => ({
        type: 'existing',
        id: p.id,
        url: p.imageUrl,
      }))
      setItems(existingItems)
    }
  }, [chapterPagesQuery.data])

  const currentChapter = content.data?.chapters?.find((c: any) => c.id === chapterId)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ 
    resolver: zodResolver(schema),
    values: {
      title: currentChapter?.title || '',
      textBody: novelChapterQuery.data?.textBody || '',
    }
  })

  if (content.isLoading || chapterPagesQuery.isLoading || novelChapterQuery.isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  if (content.isError || !content.data || !id || !chapterId) return <p>Không tải được dữ liệu.</p>

  const type = content.data.type

  const onPickImages = (list: FileList | null) => {
    if (!list) return
    const newFiles = Array.from(list)
    const newItems: PageItem[] = newFiles.map(file => ({
      type: 'new',
      id: `new-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }))
    
    setItems(prev => [...prev, ...newItems])
  }

  const removeItem = (index: number) => {
    setItems(prev => {
      const newItems = [...prev]
      const removed = newItems[index]
      if (removed.type === 'existing') {
        setDeletedPageIds(d => [...d, removed.id])
      }
      newItems.splice(index, 1)
      return newItems
    })
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedItemIndex === null || draggedItemIndex === index) return
    setDragOverItemIndex(index)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedItemIndex === null || draggedItemIndex === index) {
      setDragOverItemIndex(null)
      setDraggedItemIndex(null)
      return
    }

    setItems(prev => {
      const newItems = [...prev]
      const draggedItem = newItems[draggedItemIndex]
      newItems.splice(draggedItemIndex, 1)
      newItems.splice(index, 0, draggedItem)
      return newItems
    })

    setDragOverItemIndex(null)
    setDraggedItemIndex(null)
  }

  const onSubmit = async (v: FormValues) => {
    setError(null)
    if (type === 'Manga' && items.length === 0) {
      setError('Chapter phải có ít nhất 1 trang ảnh.')
      return
    }
    
    try {
      // 1. Luôn gọi update chapter để backend set content về PendingApproval
      await chapterService.update(type, chapterId, { title: v.title })

      if (type === 'Manga') {
        // 2. Xóa các trang bị loại bỏ
        if (deletedPageIds.length > 0) {
          await Promise.all(deletedPageIds.map(pageId => chapterService.deleteMangaPage(chapterId, pageId)))
        }

        // 3. Upload các trang mới
        const newItems = items.filter(i => i.type === 'new') as (PageItem & { type: 'new' })[]
        let createdPages: any[] = []
        if (newItems.length > 0) {
          const files = newItems.map(i => i.file)
          createdPages = await chapterService.uploadMangaPages(chapterId, files)
        }

        // 4. Lấy ID cuối cùng để reorder
        const finalPageIds = items.map(item => {
          if (item.type === 'existing') return item.id
          // Nếu là new, tìm index của nó trong mảng newItems để map sang createdPages
          const newIndex = newItems.findIndex(ni => ni.id === item.id)
          return createdPages[newIndex].id
        })

        // 5. Gọi API Reorder
        await chapterService.reorderMangaPages(chapterId, finalPageIds)
      } else {
        if (v.textBody !== novelChapterQuery.data?.textBody) {
          await chapterService.setNovelText(chapterId, v.textBody || '')
        }
      }

      await qc.invalidateQueries({ queryKey: ['chapter-pages-author', chapterId] })
      await qc.invalidateQueries({ queryKey: ['author-contents'] })
      await qc.invalidateQueries({ queryKey: ['contents'] })
      if (type === 'Novel') {
        await qc.invalidateQueries({ queryKey: ['novel-chapter-text-author', chapterId] })
      }
      setSaveSuccess(true)
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu chapter. Vui lòng thử lại.')
      console.error(err)
    }
  }

  // Màn hình thông báo thành công — nội dung đã về PendingApproval
  if (saveSuccess) {
    return (
      <div className="mx-auto max-w-lg py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Đã lưu thay đổi!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            Nội dung của bạn đã được cập nhật và chuyển về trạng thái
            <span className="font-semibold text-amber-500"> Chờ duyệt</span>.
            Truyện sẽ tạm thời <span className="font-semibold">bị ẩn khỏi trang chính</span> cho đến khi Admin xem xét và duyệt lại.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="outline" onClick={() => setSaveSuccess(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục chỉnh sửa
          </Button>
          <Button variant="outline" onClick={() => navigate(`/author/content/${id}/edit`)}>
            Về trang quản lý
          </Button>
          <Button onClick={() => navigate('/author/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/author/content/${id}/edit`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight">Edit Chapter {currentChapter?.number}</h1>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>
          
          <div className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Chapter Information</h2>
            <div className="flex gap-6">
              <div className="space-y-2 shrink-0 w-32">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Chapter No.</Label>
                <Input value={currentChapter?.number || ''} disabled className="bg-muted/50 border-border" />
              </div>

              <div className="space-y-2 flex-1">
                <Label htmlFor="title" className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Chapter Title</Label>
                <Input 
                  id="title" 
                  placeholder="Enter chapter name (e.g. Awakening)" 
                  className="bg-transparent border-border"
                  {...register('title')} 
                />
              </div>
            </div>
          </div>

          {type === 'Manga' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Pages Management (Drag to Reorder)</h2>
              
              <div className="flex flex-wrap gap-4">
                {items.map((item, i) => (
                  <div 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={() => setDragOverItemIndex(null)}
                    onDrop={(e) => handleDrop(e, i)}
                    className={`flex flex-col items-center gap-2 cursor-move transition-all duration-200 ${
                      draggedItemIndex === i ? 'opacity-50 scale-95' : 'opacity-100'
                    } ${
                      dragOverItemIndex === i ? 'scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : ''
                    }`}
                  >
                    <span className="text-xs font-bold text-muted-foreground">
                      {i + 1} {item.type === 'new' && <span className="text-blue-500">(Mới)</span>}
                    </span>
                    <div className="relative w-28 h-40 bg-muted/40 rounded-lg border border-border flex items-center justify-center overflow-hidden group">
                      <img src={item.url} alt={`Page ${i+1}`} className="w-full h-full object-cover pointer-events-none" />
                      <button 
                        type="button" 
                        onClick={() => removeItem(i)} 
                        className="absolute top-1 right-1 bg-background/80 hover:bg-destructive hover:text-white p-1 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="flex flex-col items-center gap-2 justify-end">
                  <label htmlFor="pages" className="w-28 h-40 border-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <ImagePlus className="w-6 h-6 mb-2 text-primary/70 group-hover:text-primary transition-colors" />
                    <span className="text-xs font-bold">Add Page</span>
                  </label>
                  <input
                    id="pages"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickImages(e.target.files)}
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'Novel' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Chapter Content</h2>
              <div className="space-y-2">
                <Label htmlFor="textBody" className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Nội dung</Label>
                <textarea
                  id="textBody"
                  className="flex min-h-[400px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Nhập nội dung chương..."
                  {...register('textBody')}
                />
              </div>
            </div>
          )}

          {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg font-medium border border-destructive/20">{error}</div>}

          <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
            <Button type="submit" disabled={isSubmitting} className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</> : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default EditChapter
