import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Clock, XCircle, PauseCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import type { Publisher, PublisherVerificationStatus } from '@/types/publisher'

// ==========================================
// CẤU HÌNH GIAO DIỆN THEO TRẠNG THÁI
// ==========================================
interface StatusConfig {
  badge: string
  badgeClass: string
  icon: ReactNode
  title: string
  description: string
  actionHint?: string
}

const STATUS_CONFIG: Record<Exclude<PublisherVerificationStatus, 'Approved'>, StatusConfig> = {
  //Record<Khóa, Giá trị> Hãy tạo một cuốn từ điển, bắt buộc phải có đủ 3 mục (Pending, Rejected, Suspended) loại trừ 
  // approve ra vì PublisherVerificationStatus có 4 trạng thái: 'Pending', 'Approved', 'Rejected', 'Suspended'. 
  // mỗi mục chứa icon và màu sắc tương ứng
  Pending: {
    badge: 'Đang xét duyệt',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: <Clock className="h-14 w-14 text-amber-500 animate-pulse" />,
    title: 'Hồ sơ đang chờ xét duyệt',
    description:
      'Hồ sơ đăng ký Publisher của bạn đã được gửi lên hệ thống và đang chờ Ban quản trị kiểm duyệt. Bạn sẽ có thể sử dụng các tính năng đăng tải và quản lý ngay khi được phê duyệt.',
    actionHint: 'Quá trình xét duyệt thường diễn ra trong vòng 24 - 48 giờ làm việc.',
  },
  Rejected: {
    badge: 'Bị từ chối',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    icon: <XCircle className="h-14 w-14 text-red-500" />,
    title: 'Hồ sơ không được phê duyệt',
    description:
      'Rất tiếc, hồ sơ đăng ký Publisher của bạn chưa đáp ứng đủ điều kiện hoặc thông tin chưa chính xác. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.',
    actionHint: 'Bạn có thể liên hệ qua email quản trị viên để được hỗ trợ kiểm tra lại.',
  },
  Suspended: {
    badge: 'Tạm ngưng',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    icon: <PauseCircle className="h-14 w-14 text-orange-500" />,
    title: 'Quyền Publisher bị tạm ngưng',
    description:
      'Tài khoản Publisher của bạn hiện đang tạm dừng hoạt động do vi phạm điều khoản dịch vụ hoặc đang trong diện kiểm tra.',
    actionHint: 'Vui lòng liên hệ bộ phận CSKH để giải quyết vấn đề tạm ngưng này.',
  },
}

interface LocationState {
  publisher?: Publisher
}

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export function PublisherStatus() {
  const location = useLocation() //ở trang trước publisherroute kiểm tra tài khoản 
  //khi nó chuyển sang status thì nó nhét và locationstate, dòng này đơn giản là lấy thông tin hồ sơ được gửi 
  //từ trang trước sang 
  const initialPublisher = (location.state as LocationState | null)?.publisher

  const [publisher, setPublisher] = useState<Publisher | null>(initialPublisher ?? null)
  const [isLoading, setIsLoading] = useState<boolean>(!initialPublisher)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Nếu người dùng F5 hoặc mở link trực tiếp (mất state), tự động fetch lại từ API
  useEffect(() => {
    if (publisher) return
    //lúc bắt đầu gọi Api đặt cờ là chưa hủy 
    let cancelled = false
    setIsLoading(true)

    api
      .get<Publisher>('/publisher/me')
      .then((res) => {
        //sau khi api trả về nếu chưa bị hủy thì set publisher 
        if (!cancelled) {
          setPublisher(res.data)
        }
      })
      //khi gọi api thất bại nếu chưa hủy thì set lỗi 
      .catch((err) => {
        if (!cancelled) {
          if (err.response?.status === 404) {
            setFetchError('not_registered')
          } else {
            setFetchError('Lỗi kết nối tới máy chủ khi kiểm tra hồ sơ.')
          }
        }
      })
      // Bất kể là lấy được dữ liệu hay bị lỗi, cứ hễ xong việc thì tắt cái vòng xoay
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    // khi component unmount hoặc dependency thay đổi thì hủy request
    return () => {
      cancelled = true
    }
  }, [publisher])

  // Đang tải dữ liệu khi F5
  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Đang tải thông tin hồ sơ Publisher...</p>
      </div>
    )
  }

  // Chưa đăng ký Publisher -> chuyển hướng sang trang đăng ký
  if (fetchError === 'not_registered') {
    return <Navigate to="/publisher/register" replace />
  }

  // Lỗi mạng hoặc server
  if (fetchError || !publisher) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Không thể tải thông tin hồ sơ</h2>
        <p className="text-sm text-muted-foreground">
          {fetchError || 'Có lỗi xảy ra trong quá trình xác thực.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
      </div>
    )
  }

  // Nếu tài khoản đã được Approved -> chuyển thẳng vào Dashboard
  if (publisher.verificationStatus === 'Approved') {
    return <Navigate to="/publisher/dashboard" replace />
  }

  const config =
    publisher.verificationStatus in STATUS_CONFIG
      ? STATUS_CONFIG[publisher.verificationStatus as Exclude<PublisherVerificationStatus, 'Approved'>]
      : null

  if (!config) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        {/* Icon & Badge */}
        <div className="mb-4 flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted/60 p-4">{config.icon}</div>
          <span
            className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${config.badgeClass}`}
          >
            {config.badge}
          </span>
        </div>

        {/* Tiêu đề & Thông tin tổ chức */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{config.title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          Tổ chức: <span className="font-semibold text-foreground">{publisher.organizationName}</span>
        </div>

        {/* Mô tả chi tiết */}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{config.description}</p>

        {/* Gợi ý hành động */}
        {config.actionHint && (
          <div className="mt-5 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            {config.actionHint}
          </div>
        )}

        {/* Nút hành động */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>
          {publisher.verificationStatus === 'Rejected' && (
            <Link
              to="/publisher/register"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Nộp lại hồ sơ mới
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublisherStatus
