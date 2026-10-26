import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Check,
  Ban,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminService } from '@/services/admin.service'
import { useAppDialog } from '@/components/common/AppDialogProvider'

interface WarningAuditItem {
  id: string
  novelTitle: string
  chapterNumber: number
  chapterTitle?: string
  authorName: string
  source: 'DirectText' | 'PdfExtracted'
  matchedKeywords: string[]
  snippet: string
  createdAt: string
  status: 'PendingReview' | 'Dismissed' | 'ActionTaken'
}

const MOCK_WARNING_AUDITS: WarningAuditItem[] = [
  {
    id: 'warn-1',
    novelTitle: 'Huyết Nguyệt Tiên Đồ',
    chapterNumber: 14,
    chapterTitle: 'Tàn sát Huyết Tông',
    authorName: 'Thiên Ma Tu',
    source: 'PdfExtracted',
    matchedKeywords: ['bạo lực cực độ', 'máu me'],
    snippet: '...đao phong chém ngang qua, máu me văng tung tóe khắp tứ phía trong cảnh tượng bạo lực cực độ khiến quần hùng kinh hãi...',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'PendingReview',
  },
  {
    id: 'warn-2',
    novelTitle: 'Ký Ức Thành Phố Đêm',
    chapterNumber: 5,
    chapterTitle: 'Bóng Đêm Thâm Sâu',
    authorName: 'Nguyệt Dạ Dạ',
    source: 'DirectText',
    matchedKeywords: ['18+', 'khiêu dâm'],
    snippet: '...căn phòng tối om, những cử chỉ thân mật vượt quá giới hạn 18+ khiến bầu không khí trở nên ngột ngạt...',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'PendingReview',
  },
  {
    id: 'warn-3',
    novelTitle: 'Ma Đạo Tông Sư Luân Hồi',
    chapterNumber: 28,
    chapterTitle: 'Quyết Chiến Vong Hồn Cốc',
    authorName: 'Bạch Vân Cư Sĩ',
    source: 'PdfExtracted',
    matchedKeywords: ['xuyên tạc'],
    snippet: '...lời đồn trong giang hồ đã bị xuyên tạc qua nhiều thế hệ nhằm che đậy sự thật lịch sử của hoàng triều...',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'Dismissed',
  },
]

export function NovelModeration() {
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const [activeTab, setActiveTab] = useState<'keywords' | 'audit'>('keywords')
  const [keyword, setKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [auditList, setAuditList] = useState<WarningAuditItem[]>(MOCK_WARNING_AUDITS)

  const keywordsQuery = useQuery({
    queryKey: ['admin-novel-moderation-keywords'],
    queryFn: adminService.getNovelModerationKeywords,
  })
  const keywords = keywordsQuery.data ?? []

  const addKeywordMutation = useMutation({
    mutationFn: adminService.addNovelModerationKeyword,
    onSuccess: async () => {
      setKeyword('')
      await queryClient.invalidateQueries({ queryKey: ['admin-novel-moderation-keywords'] })
    },
  })

  const removeKeywordMutation = useMutation({
    mutationFn: adminService.removeNovelModerationKeyword,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-novel-moderation-keywords'] }),
  })

  const addKeyword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedKeyword = keyword.trim()
    if (trimmedKeyword) addKeywordMutation.mutate(trimmedKeyword)
  }

  const removeKeyword = async (id: string, value: string) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa từ khóa cảnh báo',
      description: `Xóa "${value}" khỏi danh sách cảnh báo? Hệ thống sẽ ngừng phát cảnh báo cho từ này trong các chương Novel mới.`,
      confirmLabel: 'Xóa từ khóa',
      tone: 'destructive',
    })
    if (confirmed) removeKeywordMutation.mutate(id)
  }

  const handleDismissWarning = async (item: WarningAuditItem) => {
    const confirmed = await confirm({
      title: 'Bỏ qua cảnh báo & Đánh dấu an toàn',
      description: `Xác nhận nội dung chương ${item.chapterNumber} của "${item.novelTitle}" là hợp lệ và bỏ qua cảnh báo này?`,
      confirmLabel: 'Xác nhận bỏ qua',
    })
    if (confirmed) {
      setAuditList((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'Dismissed' } : i))
      )
    }
  }

  const handleTakeAction = async (item: WarningAuditItem) => {
    const confirmed = await confirm({
      title: 'Xử lý vi phạm nội dung',
      description: `Gửi thông báo yêu cầu tác giả "${item.authorName}" chỉnh sửa chương ${item.chapterNumber} của "${item.novelTitle}" do chứa từ khóa nhạy cảm: ${item.matchedKeywords.join(', ')}?`,
      confirmLabel: 'Gửi yêu cầu chỉnh sửa',
      tone: 'destructive',
    })
    if (confirmed) {
      setAuditList((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'ActionTaken' } : i))
      )
    }
  }

  const filteredAudits = auditList.filter((item) => {
    if (filterStatus === 'all') return true
    return item.status === filterStatus
  })

  const pendingCount = auditList.filter((i) => i.status === 'PendingReview').length

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* 1. HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Hệ Thống Cảnh Báo Novel</h1>
              <p className="text-xs text-muted-foreground">
                Quét từ khóa nhạy cảm tự động trên Text nhập trực tiếp và Text trích xuất từ PDF
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-xl border border-white/10 bg-[#252f3b] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('keywords')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'keywords'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            Từ khóa quét ({keywords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <span>Rà soát cảnh báo</span>
            {pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. TAB 1: KEYWORD MANAGEMENT */}
      {activeTab === 'keywords' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#252f3b] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Thêm từ khóa cảnh báo mới</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Hệ thống tự động loại bỏ dấu tiếng Việt và chuẩn hóa chữ thường để quét chính xác. Khi phát hiện khớp từ khóa, chương novel vẫn được lưu bình thường và hệ thống gửi cảnh báo vào hàng rà soát để Admin thẩm định thủ công (không tự động chặn chương).
              </p>
            </div>

            <form onSubmit={addKeyword} className="flex gap-2">
              <Input
                required
                maxLength={200}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Nhập từ hoặc cụm từ nhạy cảm (VD: 18+, bạo lực, cấm kỵ...)"
                aria-label="Từ khóa cảnh báo"
                className="h-11 rounded-xl border-white/10 bg-[#1e2631] text-sm focus-visible:ring-primary"
              />
              <Button type="submit" disabled={addKeywordMutation.isPending} className="h-11 rounded-xl px-5 font-semibold">
                <Plus className="mr-1.5 h-4 w-4" />
                {addKeywordMutation.isPending ? 'Đang thêm...' : 'Thêm từ khóa'}
              </Button>
            </form>

            {addKeywordMutation.isError && (
              <p className="text-xs text-destructive">Không thêm được từ khóa. Vui lòng thử lại.</p>
            )}
          </div>

          {/* Keywords List */}
          <div className="rounded-2xl border border-white/10 bg-[#252f3b] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Danh sách từ khóa đang hoạt động ({keywords.length})</h2>
            </div>

            {keywordsQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tải danh sách từ khóa...</p>
            ) : keywords.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chưa có từ khóa cảnh báo nào trong hệ thống.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {keywords.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e2631] px-3.5 py-2 shadow-sm transition-all hover:border-destructive/40"
                  >
                    <span className="text-xs font-semibold text-foreground">{item.keyword}</span>
                    <button
                      type="button"
                      onClick={() => void removeKeyword(item.id, item.keyword)}
                      disabled={removeKeywordMutation.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      aria-label={`Xóa từ khóa ${item.keyword}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB 2: AUDIT REVIEW QUEUE */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#252f3b] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>Lọc trạng thái rà soát:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Tất cả cảnh báo' },
                { value: 'PendingReview', label: `Chờ rà soát (${pendingCount})` },
                { value: 'Dismissed', label: 'Đã bỏ qua / Hợp lệ' },
                { value: 'ActionTaken', label: 'Đã xử lý / Cảnh cáo' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilterStatus(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    filterStatus === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-white/10 bg-[#1e2631] text-muted-foreground hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents Table */}
          <div className="space-y-3">
            {filteredAudits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#252f3b]/50 py-16 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400/50" />
                <p className="mt-3 text-base font-semibold text-white">Không có cảnh báo nào trong mục này</p>
                <p className="mt-1 text-xs">Các chương tiểu thuyết đều an toàn hoặc đã được duyệt hoàn tất.</p>
              </div>
            ) : (
              filteredAudits.map((item) => {
                const isPending = item.status === 'PendingReview'
                const isDismissed = item.status === 'Dismissed'

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#252f3b] p-5 shadow-sm space-y-4 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-white">{item.novelTitle}</h3>
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-300">
                            Chương {item.chapterNumber} {item.chapterTitle && `: ${item.chapterTitle}`}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.source === 'PdfExtracted'
                                ? 'border border-purple-500/30 bg-purple-500/10 text-purple-400'
                                : 'border border-sky-500/30 bg-sky-500/10 text-sky-400'
                            }`}
                          >
                            {item.source === 'PdfExtracted' ? 'Trích xuất từ PDF' : 'Text nhập trực tiếp'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tác giả: <span className="font-semibold text-slate-200">{item.authorName}</span> ·{' '}
                          Thời gian phát hiện: {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                            <Clock className="h-3.5 w-3.5" /> Chờ rà soát
                          </span>
                        ) : isDismissed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                            <Check className="h-3.5 w-3.5" /> Đã duyệt an toàn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400">
                            <Ban className="h-3.5 w-3.5" /> Đã yêu cầu chỉnh sửa
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Matched Keywords Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Từ khóa phát hiện:</span>
                      {item.matchedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400"
                        >
                          ⚠ {kw}
                        </span>
                      ))}
                    </div>

                    {/* Snippet preview */}
                    <div className="rounded-xl border border-white/5 bg-[#1e2631] p-3.5 text-xs leading-relaxed text-slate-300 italic">
                      "{item.snippet}"
                    </div>

                    {/* Admin Action Buttons */}
                    {isPending && (
                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-white/5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissWarning(item)}
                          className="rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Bỏ qua & Cho phép
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTakeAction(item)}
                          className="rounded-xl font-semibold"
                        >
                          <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Yêu cầu tác giả chỉnh sửa
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NovelModeration
