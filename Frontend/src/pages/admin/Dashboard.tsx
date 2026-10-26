import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ListChecks,
  Building2,
  Flag,
  ShieldAlert,
  Users,
  MessageSquare,
  Banknote,
  ChartNoAxesCombined,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { adminService } from '@/services/admin.service'
import { reportService } from '@/services/report.service'
import { ticketService } from '@/services/ticket.service'

export function AdminDashboard() {
  const { data: queueData, isLoading: isQueueLoading } = useQuery({
    queryKey: ['admin-review-queue'],
    queryFn: adminService.getReviewQueue,
  })

  const { data: reportsData } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => (await reportService.getAllReports()).data,
  })

  const { data: ticketsData } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => (await ticketService.getAllTickets()).data,
  })

  const pendingContentCount = queueData?.pendingContent.length ?? 0
  const pendingPublisherCount = queueData?.pendingPublisher.length ?? 0
  const pendingReportsCount = (reportsData ?? []).filter((r) => r.status === 'Pending').length
  const openTicketsCount = (ticketsData ?? []).filter((t) => t.status === 'Open').length

  const quickStats = [
    {
      label: 'Truyện chờ duyệt',
      count: pendingContentCount,
      icon: ListChecks,
      link: '/admin/content/unpublished',
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      tag: 'Nội dung mới',
    },
    {
      label: 'Publisher chờ xác minh',
      count: pendingPublisherCount,
      icon: Building2,
      link: '/admin/content/unpublished',
      color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
      tag: 'Pháp lý / Hồ sơ',
    },
    {
      label: 'Báo cáo vi phạm',
      count: pendingReportsCount,
      icon: Flag,
      link: '/admin/reports',
      color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30',
      tag: 'Cần kiểm tra',
    },
    {
      label: 'Yêu cầu hỗ trợ mở',
      count: openTicketsCount,
      icon: MessageSquare,
      link: '/admin/tickets',
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
      tag: 'Support Ticket',
    },
  ]

  const managementModules = [
    {
      title: 'Hàng chờ kiểm duyệt nội dung',
      desc: 'Phê duyệt, từ chối hoặc yêu cầu sửa đổi Manga và Novel trước khi xuất bản.',
      link: '/admin/content/unpublished',
      icon: ListChecks,
    },
    {
      title: 'Truyện đã xuất bản',
      desc: 'Quản lý toàn bộ danh mục truyện công khai, ẩn/khôi phục nội dung trên toàn sàn.',
      link: '/admin/content/published',
      icon: Layers,
    },
    {
      title: 'Quét từ khóa cảnh báo Novel',
      desc: 'Giám sát nội dung nhạy cảm từ Text và PDF trích xuất, rà soát thủ công các cảnh báo.',
      link: '/admin/novel-moderation',
      icon: ShieldAlert,
    },
    {
      title: 'Quản lý Người dùng & Phân quyền',
      desc: 'Khóa/mở khóa tài khoản, điều chỉnh vai trò Reader, Author, Publisher, Admin.',
      link: '/admin/users',
      icon: Users,
    },
    {
      title: 'Đối soát nạp coin tự động (SePay)',
      desc: 'Theo dõi đơn nạp QR ngân hàng, xử lý đối soát thủ công các giao dịch sai thông tin.',
      link: '/admin/payments',
      icon: Banknote,
    },
    {
      title: 'Duyệt yêu cầu rút tiền (Payouts)',
      desc: 'Xác nhận chuyển khoản VietQR cho Tác giả & NXB, quản lý mức rút tối thiểu và chặn payout.',
      link: '/admin/payouts',
      icon: ChartNoAxesCombined,
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Trung Tâm Điều Hành Quản Trị</h1>
          <p className="text-xs text-muted-foreground sm:text-sm mt-1">
            Tổng hợp các hàng đợi kiểm duyệt, đối soát tài chính và an toàn hệ thống Nova Manga.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Hệ thống hoạt động ổn định
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.link}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${item.color} p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {item.tag}
                </span>
                <Icon className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-white">{isQueueLoading ? '...' : item.count}</p>
                <p className="mt-1 text-xs font-semibold text-foreground/80">{item.label}</p>
              </div>

              <div className="mt-3 flex items-center text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Xử lý ngay <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* 3. MANAGEMENT MODULES GRID */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Các phân hệ quản trị hệ thống</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managementModules.map((m) => {
            const Icon = m.icon
            return (
              <Link
                key={m.title}
                to={m.link}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#252f3b] p-5 shadow-sm transition-all hover:border-primary/40 hover:bg-[#2c3746]"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center text-xs font-semibold text-primary pt-2 border-t border-white/5">
                  Truy cập phân hệ <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
