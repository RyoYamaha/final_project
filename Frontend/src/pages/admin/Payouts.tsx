import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { financeService, type PayoutRequest } from '@/services/finance.service'
import { useAppDialog } from '@/components/common/AppDialogProvider'

const VND_PER_COIN = 1_000

function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`
}

function getPayoutTransferCode(requestId: string) {
  const compactId = requestId.replaceAll('-', '').toUpperCase()
  return `NOVAPAY-${compactId.slice(0, 16)}`
}

function getPayoutQrUrl(request: PayoutRequest) {
  const amountVnd = request.amountCoins * VND_PER_COIN
  if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
    return null
  }

  const query = new URLSearchParams({
    amount: String(amountVnd),
    addInfo: getPayoutTransferCode(request.id),
    accountName: request.bankAccountName,
  })

  return `https://img.vietqr.io/image/${encodeURIComponent(request.bankBin)}-${encodeURIComponent(request.bankAccountNumber)}-compact2.png?${query.toString()}`
}

function formatCoins(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) {
      return message.join(', ')
    }
    if (message) {
      return message
    }
  }

  return fallback
}

export function Payouts() {
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const [minimumInput, setMinimumInput] = useState('')
  const [blockUserId, setBlockUserId] = useState('')
  const [shouldBlockUser, setShouldBlockUser] = useState(true)
  const [selectedRejectId, setSelectedRejectId] = useState('')
  const [selectedTransferId, setSelectedTransferId] = useState('')
  const [copiedTransferCode, setCopiedTransferCode] = useState('')
  const [copyError, setCopyError] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const requestsQuery = useQuery({
    queryKey: ['admin', 'payout-requests'],
    queryFn: async () => (await financeService.getAdminPayoutRequests()).data,
    refetchInterval: 10_000,
  })

  const minimumQuery = useQuery({
    queryKey: ['admin', 'payout-minimum'],
    queryFn: async () => (await financeService.getAdminPayoutMinimum()).data,
  })

  const refreshPayoutData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout-minimum'] }),
    ])
  }

  const updateMinimumMutation = useMutation({
    mutationFn: (minimumCoins: number) =>
      financeService.updateAdminPayoutMinimum(minimumCoins),
    onSuccess: async () => {
      setMinimumInput('')
      setSuccessMessage('Đã cập nhật mức rút tối thiểu.')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payout-minimum'] })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (requestId: string) => financeService.markPayoutPaid(requestId),
    onSuccess: async () => {
      setSuccessMessage('Đã đánh dấu yêu cầu là đã chuyển khoản.')
      await refreshPayoutData()
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      financeService.rejectPayout(selectedRejectId, rejectReason.trim()),
    onSuccess: async () => {
      setSelectedRejectId('')
      setRejectReason('')
      setSuccessMessage('Đã từ chối yêu cầu và giải phóng số coin đã giữ.')
      await refreshPayoutData()
    },
  })

  const blockMutation = useMutation({
    mutationFn: (values: { userId: string; payoutBlocked: boolean }) =>
      financeService.setPayoutBlocked(values.userId, values.payoutBlocked),
    onSuccess: async (_data, values) => {
      setBlockUserId('')
      if (values.payoutBlocked) {
        setSuccessMessage('Đã chặn yêu cầu payout cho tài khoản này.')
      } else {
        setSuccessMessage('Đã gỡ chặn payout cho tài khoản này.')
      }
    },
  })

  const submitMinimum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const minimumCoins = Number(minimumInput)
    if (!Number.isSafeInteger(minimumCoins) || minimumCoins < 10) {
      return
    }
    if (minimumQuery.data !== minimumCoins) {
      const confirmed = await confirm({
        title: 'Xác nhận thay đổi mức rút tối thiểu',
        description: `Đặt mức rút tối thiểu mới là ${formatCoins(minimumCoins)} coin? Thay đổi này sẽ ảnh hưởng đến các yêu cầu payout tiếp theo.`,
        confirmLabel: 'Cập nhật mức tối thiểu',
      })
      if (!confirmed) return
    }
    setSuccessMessage('')
    updateMinimumMutation.mutate(minimumCoins)
  }

  const submitBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (blockUserId.trim()) {
      const blocking = shouldBlockUser
      const confirmed = await confirm({
        title: blocking ? 'Xác nhận chặn payout' : 'Xác nhận gỡ chặn payout',
        description: `${blocking ? 'Chặn' : 'Gỡ chặn'} payout cho user ID "${blockUserId.trim()}"?`,
        confirmLabel: blocking ? 'Chặn payout' : 'Gỡ chặn',
        tone: blocking ? 'destructive' : 'default',
      })
      if (!confirmed) return
      setSuccessMessage('')
      blockMutation.mutate({
        userId: blockUserId.trim(),
        payoutBlocked: blocking,
      })
    }
  }

  const submitReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedRejectId && rejectReason.trim().length >= 3) {
      const confirmed = await confirm({
        title: 'Xác nhận từ chối payout',
        description: 'Từ chối yêu cầu payout này và giải phóng số coin đang giữ?',
        confirmLabel: 'Từ chối yêu cầu',
        tone: 'destructive',
      })
      if (!confirmed) return
      setSuccessMessage('')
      rejectMutation.mutate()
    }
  }

  const markPaid = async (requestId: string) => {
    const confirmed = await confirm({
      title: 'Xác nhận đã chuyển khoản',
      description: 'Bạn đã chuyển khoản ngoài hệ thống và kiểm tra đúng tài khoản người nhận chưa? Chỉ xác nhận sau khi ngân hàng báo giao dịch thành công.',
      confirmLabel: 'Xác nhận đã chuyển',
    })
    if (confirmed) {
      setSuccessMessage('')
      markPaidMutation.mutate(requestId)
    }
  }

  const copyTransferCode = async (requestId: string) => {
    try {
      await navigator.clipboard.writeText(getPayoutTransferCode(requestId))
      setCopiedTransferCode(requestId)
      setCopyError('')
    } catch {
      setCopiedTransferCode('')
      setCopyError('Không thể sao chép nội dung chuyển khoản trên trình duyệt này.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý payout</h1>
        <p className="text-sm text-muted-foreground">
          Xử lý yêu cầu nhận tiền của Author và Publisher sau khi chuyển khoản thủ công.
        </p>
      </header>

      {successMessage && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {successMessage}
        </p>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMinimum} className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-semibold">Mức rút tối thiểu</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cấu hình được lưu trong SystemSetting. Giá trị nhỏ nhất là 10 coin.
            </p>
          </div>
          <div className="flex max-w-md gap-2">
            <Input
              type="number"
              min={10}
              step={1}
              value={minimumInput || (minimumQuery.data !== undefined ? String(minimumQuery.data) : '')}
              onChange={(event) => setMinimumInput(event.target.value)}
              aria-label="Mức payout tối thiểu"
              required
            />
            <Button type="submit" disabled={updateMinimumMutation.isPending}>
              {updateMinimumMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
          {minimumQuery.isError && (
            <p className="text-sm text-destructive">Không tải được mức payout hiện tại.</p>
          )}
          {updateMinimumMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getErrorMessage(updateMinimumMutation.error, 'Không lưu được mức tối thiểu.')}
            </p>
          )}
        </form>

        <form onSubmit={submitBlock} className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Chặn hoặc gỡ chặn payout theo user ID
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dùng khi cần tạm giữ thanh toán do tranh chấp hoặc gỡ chặn sau khi rà soát.
            </p>
          </div>
          <div className="flex max-w-lg gap-2">
            <Input
              value={blockUserId}
              onChange={(event) => setBlockUserId(event.target.value)}
              placeholder="User ID"
              aria-label="User ID cần chặn payout"
              required
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={shouldBlockUser ? 'block' : 'unblock'}
              onChange={(event) => setShouldBlockUser(event.target.value === 'block')}
              aria-label="Thao tác chặn payout"
            >
              <option value="block">Chặn</option>
              <option value="unblock">Gỡ chặn</option>
            </select>
            <Button type="submit" variant={shouldBlockUser ? 'destructive' : 'default'} disabled={blockMutation.isPending}>
              {blockMutation.isPending ? 'Đang cập nhật...' : shouldBlockUser ? 'Chặn payout' : 'Gỡ chặn'}
            </Button>
          </div>
          {blockMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getErrorMessage(blockMutation.error, 'Không chặn được payout.')}
            </p>
          )}
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Yêu cầu đang chờ</h2>
            <p className="text-sm text-muted-foreground">
              Mở QR để chuyển đúng số tiền đến tài khoản đã đăng ký. Quy đổi payout:
              1 coin = 1.000 VND.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void requestsQuery.refetch()} disabled={requestsQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 ${requestsQuery.isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
        {requestsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải yêu cầu payout...</p>
        ) : requestsQuery.isError ? (
          <p className="rounded-lg border border-border p-4 text-center text-sm text-destructive">Không tải được yêu cầu payout.</p>
        ) : (requestsQuery.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Không có yêu cầu payout đang chờ.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Tác giả / Publisher</th>
                  <th className="p-3 font-medium">Tài khoản nhận</th>
                  <th className="p-3 text-right font-medium">Coin</th>
                  <th className="p-3 font-medium">Ngày gửi</th>
                  <th className="p-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requestsQuery.data?.items.flatMap((request) => {
                  const requestRow = (
                    <tr key={request.id}>
                      <td className="p-3">
                        <p className="font-medium">{request.user?.username ?? request.userId}</p>
                        <p className="text-xs text-muted-foreground">{request.user?.email}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{request.bankAccountName}</p>
                        <p className="text-xs text-muted-foreground">{request.bankName} · {request.bankBin}</p>
                        <p className="font-mono text-xs">{request.bankAccountNumber}</p>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right font-semibold">{formatCoins(request.amountCoins)}</td>
                      <td className="whitespace-nowrap p-3">{formatDate(request.requestedAt)}</td>
                      <td className="space-y-2 p-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={selectedTransferId === request.id ? 'secondary' : 'default'}
                            onClick={() =>
                              setSelectedTransferId((currentId) =>
                                currentId === request.id ? '' : request.id,
                              )
                            }
                          >
                            <QrCode className="h-4 w-4" />
                            {selectedTransferId === request.id ? 'Đóng QR' : 'Mở QR chuyển khoản'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRejectId(request.id)
                              setRejectReason('')
                            }}
                          >
                            <X className="h-4 w-4" />
                            Từ chối
                          </Button>
                        </div>
                        {selectedRejectId === request.id && (
                          <form onSubmit={submitReject} className="flex gap-2">
                            <Input
                              value={rejectReason}
                              onChange={(event) => setRejectReason(event.target.value)}
                              placeholder="Lý do từ chối"
                              minLength={3}
                              maxLength={500}
                              required
                            />
                            <Button type="submit" size="sm" variant="destructive" disabled={rejectMutation.isPending}>
                              Xác nhận
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setSelectedRejectId('')}>
                              Hủy
                            </Button>
                          </form>
                        )}
                        {rejectMutation.isError && selectedRejectId === request.id && (
                          <p className="text-xs text-destructive" role="alert">
                            {getErrorMessage(rejectMutation.error, 'Không từ chối được yêu cầu.')}
                          </p>
                        )}
                      </td>
                    </tr>
                  )

                  if (selectedTransferId !== request.id) {
                    return [requestRow]
                  }

                  const qrUrl = getPayoutQrUrl(request)
                  const transferCode = getPayoutTransferCode(request.id)
                  const amountVnd = request.amountCoins * VND_PER_COIN
                  const transferRow = (
                    <tr key={`${request.id}-transfer`}>
                      <td colSpan={5} className="border-t border-border bg-muted/20 p-4 sm:p-6">
                        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
                          <div className="space-y-4">
                            <div>
                              <h3 className="flex items-center gap-2 font-semibold">
                                <QrCode className="h-4 w-4 text-primary" />
                                QR chuyển payout
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Quét bằng ứng dụng ngân hàng; thông tin người nhận, số tiền và nội dung đã được điền sẵn.
                              </p>
                            </div>
                            <dl className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-muted-foreground">Ngân hàng</dt>
                                <dd className="font-semibold">{request.bankName} · BIN {request.bankBin}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Số tài khoản</dt>
                                <dd className="font-mono font-semibold">{request.bankAccountNumber}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Chủ tài khoản</dt>
                                <dd className="font-semibold">{request.bankAccountName}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Số tiền chuyển</dt>
                                <dd className="font-semibold">
                                  {formatVnd(amountVnd)} ({formatCoins(request.amountCoins)} coin)
                                </dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">Nội dung chuyển khoản</dt>
                                <dd className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="rounded bg-muted px-2 py-1 font-mono font-semibold">{transferCode}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void copyTransferCode(request.id)}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    {copiedTransferCode === request.id ? 'Đã sao chép' : 'Sao chép'}
                                  </Button>
                                  {copyError && <span className="text-xs text-destructive">{copyError}</span>}
                                </dd>
                              </div>
                            </dl>
                            <p className="text-xs text-muted-foreground">
                              Chỉ xác nhận sau khi ứng dụng ngân hàng báo giao dịch chuyển khoản thành công và bạn đã kiểm tra đúng người nhận.
                            </p>
                            <Button
                              type="button"
                              onClick={() => markPaid(request.id)}
                              disabled={markPaidMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                              {markPaidMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận đã chuyển'}
                            </Button>
                            {markPaidMutation.isError && (
                              <p className="text-sm text-destructive" role="alert">
                                {getErrorMessage(markPaidMutation.error, 'Không cập nhật được yêu cầu payout.')}
                              </p>
                            )}
                          </div>
                          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-4">
                            {qrUrl ? (
                              <a
                                href={qrUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col items-center gap-2"
                              >
                                <img
                                  src={qrUrl}
                                  alt={`QR chuyển ${formatVnd(amountVnd)} đến ${request.bankAccountName}, nội dung ${transferCode}`}
                                  className="h-60 w-60 max-w-full rounded-lg bg-white object-contain p-2"
                                />
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                                  Mở QR riêng <ExternalLink className="h-3 w-3" />
                                </span>
                              </a>
                            ) : (
                              <p className="text-sm text-destructive">
                                Không thể tạo QR do số tiền payout không hợp lệ.
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                  return [requestRow, transferRow]
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Payouts
