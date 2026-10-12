import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { chapterService } from '@/services/chapter.service'
import { publisherService } from '@/services/publisher.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, ImagePlus, FileText, UploadCloud, Loader2 } from 'lucide-react'

const schema = z.object({
  number: z.number({ message: 'Nhập số chương' }).int().min(1, 'Tối thiểu 1'),
  title: z.string().trim().max(255, 'Tối đa 255 ký tự').optional(),
})
type FormValues = z.infer<typeof schema>

export function PublisherUploadChapter() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [files, setFiles] = useState<File[]>([])
  const [novelMode, setNovelMode] = useState<'text' | 'pdf'>('text')
  const [textBody, setTextBody] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [chapterId, setChapterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null)

  const content = useQuery({
    queryKey: ['content', id],
    queryFn: async () => (await publisherService.getContentDetail(id!)).data,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (content.isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>
  if (content.isError || !content.data || !id) return <p>Không tải được truyện.</p>

  const contentData = content.data
  const type = contentData.type
  const nextNumber = Math.max(0, ...contentData.chapters.map((c: any) => c.number)) + 1

  const onPickImages = (list: FileList | null) => {
    if (!list) return
    const newFiles = Array.from(list)
    setFiles(prev => {
      const arr = [...prev, ...newFiles]
      return arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    })
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
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
    setFiles(prev => {
      const newFiles = [...prev]
      const draggedFile = newFiles[draggedItemIndex]
      newFiles.splice(draggedItemIndex, 1)
      newFiles.splice(index, 0, draggedFile)
      return newFiles
    })
    setDragOverItemIndex(null)
    setDraggedItemIndex(null)
  }

  const contentReady =
    type === 'Manga' ? files.length > 0 : novelMode === 'text' ? textBody.trim() !== '' : !!pdf

  const onSubmit = async (v: FormValues) => {
    setError(null)
    if (!contentReady) {
      setError('Hãy thêm nội dung chương trước khi gửi.')
      return
    }
    let chapterCreated = false
    try {
      let cid = chapterId
      if (!cid) {
        const ch = await chapterService.create(type, id, { number: v.number, title: v.title || undefined })
        cid = ch.id
        setChapterId(cid)
        chapterCreated = true
      }
      if (type === 'Manga') await chapterService.uploadMangaPages(cid, files)
      else if (novelMode === 'text') await chapterService.setNovelText(cid, textBody)
      else await chapterService.uploadNovelPdf(cid, pdf!)

      await qc.invalidateQueries({ queryKey: ['content', id] })
      navigate(`/publisher/content/${id}/edit`, { replace: true })
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      setError(
        status === 409
          ? 'Số chương này đã tồn tại.'
          : status === 403
            ? 'Bạn không phải chủ sở hữu truyện này.'
            : chapterCreated || chapterId
              ? 'Đã tạo chương nhưng upload nội dung thất bại. Bấm gửi lại để thử tiếp.'
              : 'Không thể tạo chương. Thử lại sau.',
      )
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Upload chapter</h1>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>

          {/* CHAPTER INFORMATION */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Chapter Information</h2>
            <div className="flex gap-6">
              <div className="space-y-2 shrink-0 w-32">
                <Label htmlFor="number" className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Chapter No.</Label>
                <Input
                  id="number"
                  type="number"
                  defaultValue={nextNumber}
                  disabled={!!chapterId}
                  className="bg-transparent border-border"
                  {...register('number', { valueAsNumber: true })}
                />
                {errors.number && <p className="text-[10px] text-red-500 font-medium">{errors.number.message}</p>}
              </div>

              <div className="space-y-2 flex-1">
                <Label htmlFor="title" className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Chapter Title</Label>
                <Input
                  id="title"
                  disabled={!!chapterId}
                  placeholder="Enter chapter name (e.g. Awakening)"
                  className="bg-transparent border-border"
                  {...register('title')}
                />
              </div>
            </div>
          </div>

          {/* PAGES MANAGEMENT */}
          {type === 'Manga' ? (
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Pages Management (Drag to Reorder)</h2>

              <div className="flex flex-wrap gap-4">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${i}`}
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
                    <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <div className="relative w-28 h-40 bg-muted/40 rounded-lg border border-border flex items-center justify-center overflow-hidden group">
                      <img src={URL.createObjectURL(file)} alt={`Page ${i+1}`} className="w-full h-full object-cover pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
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

              {files.length > 200 && <p className="text-xs text-red-500 font-medium mt-2">Vượt quá 200 ảnh.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Content Management</h2>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={novelMode === 'text' ? 'default' : 'outline'} onClick={() => setNovelMode('text')} className="font-semibold text-xs">
                  <FileText className="w-4 h-4 mr-1.5" /> Nhập văn bản
                </Button>
                <Button type="button" size="sm" variant={novelMode === 'pdf' ? 'default' : 'outline'} onClick={() => setNovelMode('pdf')} className="font-semibold text-xs">
                  <UploadCloud className="w-4 h-4 mr-1.5" /> Tải lên PDF
                </Button>
              </div>
              {novelMode === 'text' ? (
                <textarea
                  rows={16}
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/50 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow placeholder:text-muted-foreground/50"
                  placeholder="Bắt đầu viết nội dung chương tại đây..."
                />
              ) : (
                <div className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                  <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium mb-1">Kéo thả file PDF vào đây</p>
                  <p className="text-xs">hoặc</p>
                  <Label htmlFor="pdf-upload" className="mt-2 text-primary hover:underline cursor-pointer font-semibold text-sm">Duyệt file từ máy tính</Label>
                  <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
                  {pdf && <p className="text-xs text-emerald-500 font-medium mt-3">Đã chọn: {pdf.name}</p>}
                </div>
              )}
            </div>
          )}

          {/* PUBLISHER COMMENT */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Publisher Comment</h2>
            <textarea
              rows={4}
              placeholder="Write a note to your readers regarding this chapter release..."
              className="w-full bg-background border border-border/50 rounded-lg p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow placeholder:text-muted-foreground/50"
            />
          </div>

          {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg font-medium border border-destructive/20">{error}</div>}

          <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
            <Button type="submit" disabled={isSubmitting || files.length > 200} className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải lên...</> : chapterId ? 'Gửi lại nội dung' : 'Publish Chapter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default PublisherUploadChapter
