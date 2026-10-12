import { useLocation, useNavigate, useParams, Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentService } from '@/services/content.service'
import { adminService } from '@/services/admin.service'
import { ArrowLeft, CheckCircle, Clock, ImageOff } from 'lucide-react'
import { useState } from 'react'

export function ContentDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/admin/content/unpublished'
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')

  const { data: content, isLoading } = useQuery({
    queryKey: ['admin-content-detail', id],
    queryFn: () => contentService.getDetail(id!).then(res => res.data),
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: () => adminService.approveContent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content-detail', id] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: () => adminService.rejectContent(id!, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] })
      navigate(returnTo)
    }
  })

  if (isLoading) return <div className="p-8 text-center text-muted-foreground flex items-center justify-center min-h-[60vh]"><Clock className="w-6 h-6 animate-spin mr-2" /> Đang tải dữ liệu...</div>
  if (!content) return <div className="p-8 text-center text-destructive">Không tìm thấy nội dung</div>

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Link to={returnTo} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </div>

      {/* Header section (Cover + Title) */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
          <div className="w-28 h-40 shrink-0 bg-muted rounded-xl overflow-hidden flex items-center justify-center border shadow-sm">
            {content.coverImageUrl ? (
              <img src={content.coverImageUrl} alt={content.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-muted-foreground/40 flex flex-col items-center gap-2 font-medium text-xs tracking-widest">
                <ImageOff className="w-8 h-8" />
                COVER
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase">{content.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="font-medium text-muted-foreground">{content.type}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="font-medium text-muted-foreground">
                  {content.ownershipTier === 'Licensed' ? 'Licensed Translation' : content.ownershipTier === 'FanTranslation' ? 'Fan Translation' : 'Original Content'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider
                ${content.publicationStatus === 'PendingApproval' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600' 
                : content.publicationStatus === 'Published' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600' 
                : 'bg-muted border border-border text-muted-foreground'}`}>
                {content.publicationStatus === 'PendingApproval' && <Clock className="w-3.5 h-3.5" />}
                {content.publicationStatus === 'Published' && <CheckCircle className="w-3.5 h-3.5" />}
                {content.publicationStatus === 'PendingApproval' ? 'Pending Review' : content.publicationStatus}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground pt-3 flex items-center gap-4 border-t border-border mt-6">
              <p>Uploaded by: <span className="font-bold text-foreground">{content.uploader?.username || 'Unknown'}</span></p>
              <span className="w-1 h-1 rounded-full bg-border" />
              <p>Submitted: {new Date(content.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-card rounded-xl border border-border p-8 shadow-sm space-y-8">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Basic Information</h2>
            
            <div className="grid grid-cols-2 gap-y-8 gap-x-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Title</p>
                <p className="font-bold text-foreground">{content.title}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Slug</p>
                <p className="font-bold text-foreground">{content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Type</p>
                <p className="font-bold text-foreground">{content.type}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Original Language</p>
                <p className="font-bold text-foreground">Vietnamese</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Synopsis</p>
              <div className="bg-muted/40 p-5 rounded-lg text-sm leading-relaxed border border-border/50">
                {content.synopsis || <span className="text-muted-foreground italic">No synopsis provided.</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {content.genres?.map(g => (
                    <span key={g.genre.id} className="px-3 py-1 text-xs rounded border border-border/60 bg-transparent text-foreground font-medium">
                      {g.genre.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {content.tags?.map(t => (
                    <span key={t.tag.id} className="px-3 py-1 text-xs rounded border border-border/60 bg-transparent text-foreground font-medium">
                      {t.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Copyright / Ownership */}
          <div className="bg-card rounded-xl border border-border p-8 shadow-sm space-y-8">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Copyright / Ownership</h2>
            
            <div className="grid grid-cols-2 gap-y-8 gap-x-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Ownership Type</p>
                <p className="font-bold text-foreground">{content.ownershipTier === 'Licensed' ? 'Licensed Translation' : content.ownershipTier}</p>
              </div>
              
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Original Series</p>
                <p className="font-bold text-foreground">{content.parentContent?.title || content.title}</p>
              </div>
              
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Original Publisher</p>
                <p className="font-bold text-foreground">{content.publisher?.organizationName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Publisher Status</p>
                {content.publisher ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Verified</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
               <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Translation Permission</p>
               <div className="flex items-center gap-1.5 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
               </div>
               <div className="flex gap-3">
                  <button className="px-4 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted transition-colors">View Publisher</button>
                  <button className="px-4 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted transition-colors">View Permission Record</button>
               </div>
            </div>
          </div>

          {/* Admin Decision */}
          {content.publicationStatus === 'PendingApproval' && (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-8 space-y-6">
                <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Admin Decision</h2>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Lý do từ chối</p>
                  <textarea 
                    className="w-full bg-background border border-border/50 rounded-lg p-4 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow placeholder:text-muted-foreground/50"
                    placeholder="Nhập phản hồi để người đăng biết nội dung cần chỉnh sửa..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 bg-muted/20 border-t border-border flex justify-between items-center">
                <button 
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                  className="px-6 py-2.5 rounded border border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Từ chối và gửi phản hồi
                </button>
                <button 
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="px-6 py-2.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Publish
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
           {/* Novel Information */}
           <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-6">Content Information</h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Total Chapters</p>
                <p className="font-bold text-foreground text-lg">{content.chapters?.length || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5">Total Views</p>
                <p className="font-bold text-foreground text-lg">0</p>
              </div>
            </div>
          </div>

          {/* Chapters */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">Chapters ({content.chapters?.length || 0})</h2>
            <div className="space-y-2">
              {content.chapters?.map((chapter) => (
                <Link
                  key={chapter.id}
                  to={`/admin/chapters/${chapter.id}`}
                  state={{ returnTo: `/admin/content/${content.id}` }}
                  className="grid grid-cols-12 items-center rounded-md border border-border/50 bg-muted/20 p-3 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="col-span-1 font-medium text-muted-foreground">{chapter.number}</span>
                  <span className="col-span-7 truncate pr-2 font-medium">{chapter.title || `Chapter ${chapter.number}`}</span>
                  <span className="col-span-4 text-right">
                    <span className={`font-semibold ${chapter.moderationStatus === 'Published' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {chapter.moderationStatus}
                    </span>
                  </span>
                </Link>
              ))}
              {(!content.chapters || content.chapters.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-6 italic border rounded-lg border-dashed">No chapters uploaded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContentDetail
