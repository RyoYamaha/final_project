import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { reportService, type CreateReportDto } from '@/services/report.service'
import { useAuthStore } from '@/stores/auth-store'
import { useNavigate } from 'react-router'

interface ReportModalProps {
  targetType: CreateReportDto['targetType']
  targetId: string
  isOpen: boolean
  onClose: () => void
}

export function ReportModal({ targetType, targetId, isOpen, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [success, setSuccess] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const reportMutation = useMutation({
    mutationFn: (data: CreateReportDto) => reportService.createReport(data),
    onSuccess: () => setSuccess(true),
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }
    reportMutation.mutate({ targetType, targetId, reason, evidence })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-xl font-bold">Báo cáo vi phạm</h2>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm font-medium text-green-600">
              Báo cáo của bạn đã được gửi thành công! Quản trị viên sẽ xem xét sớm nhất.
            </p>
            <Button className="w-full" onClick={onClose}>
              Đóng
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!user && (
              <p className="text-sm text-destructive">
                Bạn cần đăng nhập để gửi báo cáo!
              </p>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do báo cáo *</label>
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Nội dung vi phạm bản quyền, spam, chửi thề..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bằng chứng (Liên kết/Hình ảnh - Không bắt buộc)</label>
              <Input
                maxLength={2000}
                placeholder="Nhập URL dẫn chứng nếu có"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="destructive"
              disabled={reportMutation.isPending || !reason.trim() || reason.length < 5 || !user}
            >
              {reportMutation.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
            
            {reportMutation.isError && (
              <p className="text-sm text-destructive text-center mt-2">
                Có lỗi xảy ra, vui lòng thử lại!
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
