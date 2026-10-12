import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ArrowLeft, Clock, PauseCircle, RefreshCw, XCircle } from 'lucide-react'
import { publisherService } from '@/services/publisher.service'
import type { Publisher, PublisherVerificationStatus } from '@/types/publisher'

type PendingStatus = Exclude<PublisherVerificationStatus, 'Approved'>

interface StatusConfig {
  badge: string
  badgeClass: string
  icon: ReactNode
  title: string
  description: string
}

// Backend không lưu lý do, nên chỉ dùng nội dung trung tính
const STATUS_CONFIG: Record<PendingStatus, StatusConfig> = {
  Pending: {
    badge: 'Đang xét duyệt',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: <Clock className="h-14 w-14 text-amber-500" />,
    title: 'Hồ sơ đang chờ xét duyệt',
    description:
      'Hồ sơ Publisher của bạn đã được gửi và đang chờ quản trị viên xét duyệt. Bạn sẽ dùng được các tính năng Publisher sau khi được chấp thuận.',
  },
  Rejected: {
    badge: 'Bị từ chối',
    badgeClass: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: <XCircle className="h-14 w-14 text-red-500" />,
    title: 'Hồ sơ chưa được phê duyệt',
    description: 'Hồ sơ Publisher của bạn chưa được chấp thuận. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.',
  },
  Suspended: {
    badge: 'Tạm ngưng',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    icon: <PauseCircle className="h-14 w-14 text-orange-500" />,
    title: 'Quyền Publisher đang bị tạm ngưng',
    description: 'Quyền Publisher của bạn đang bị tạm ngưng. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.',
  },
}

export function PublisherStatus() {
  const location = useLocation()
  const initial = (location.state as { publisher?: Publisher } | null)?.publisher

  const [publisher, setPublisher] = useState<Publisher | null>(initial ?? null)
  const [isLoading, setIsLoading] = useState(!initial)
  const [notRegistered, setNotRegistered] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (publisher) return
    let cancelled = false
    publisherService
      .getMe()
      .then((res) => !cancelled && setPublisher(res.data))
      .catch((err) => {
        if (cancelled) return
        if (err.response?.status === 404) setNotRegistered(true)
        else setErrorMessage('Lỗi kết nối tới máy chủ khi kiểm tra hồ sơ.')
      })
      .finally(() => !cancelled && setIsLoading(false))

    return () => {
      cancelled = true
    }
  }, [publisher])

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Đang tải thông tin hồ sơ Publisher...</p>
      </div>
    )
  }

  if (notRegistered) return <Navigate to="/publisher/register" replace />

  if (errorMessage || !publisher) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <XCircle className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Không thể tải thông tin hồ sơ</h2>
        <p className="text-sm text-muted-foreground">{errorMessage ?? 'Đã có lỗi xảy ra.'}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
      </div>
    )
  }

  if (publisher.verificationStatus === 'Approved') {
    return <Navigate to="/publisher/dashboard" replace />
  }

  const config = STATUS_CONFIG[publisher.verificationStatus]
  if (!config) return <Navigate to="/" replace /> // phòng khi backend thêm trạng thái mới

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted/60 p-4">{config.icon}</div>
          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>
            {config.badge}
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tổ chức: <span className="font-semibold text-foreground">{publisher.organizationName}</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{config.description}</p>

        {/* Các nút hành động: Về trang chủ & Nộp lại hồ sơ nếu bị Rejected */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>

          {publisher.verificationStatus === 'Rejected' && (
            <Link
              to="/publisher/register"
              className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nộp lại hồ sơ
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublisherStatus
