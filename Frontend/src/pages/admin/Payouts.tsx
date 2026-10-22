import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RefreshCw, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { financeService } from '@/services/finance.service'

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
  const [minimumInput, setMinimumInput] = useState('')
  const [blockUserId, setBlockUserId] = useState('')
  const [shouldBlockUser, setShouldBlockUser] = useState(true)
  const [selectedRejectId, setSelectedRejectId] = useState('')
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

  const submitMinimum = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const minimumCoins = Number(minimumInput)
    if (!Number.isSafeInteger(minimumCoins) || minimumCoins < 10) {
      return
    }
    setSuccessMessage('')
    updateMinimumMutation.mutate(minimumCoins)
  }

  const submitBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (blockUserId.trim()) {
      setSuccessMessage('')
      blockMutation.mutate({
        userId: blockUserId.trim(),
        payoutBlocked: shouldBlockUser,
      })
    }
  }

  const submitReject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedRejectId && rejectReason.trim().length >= 3) {
      setSuccessMessage('')
      rejectMutation.mutate()
    }
  }

  const markPaid = (requestId: string) => {
    const confirmed = window.confirm(
      'Đã chuyển khoản ngoài hệ thống và kiểm tra đúng tài khoản người nhận chưa?',
    )
    if (confirmed) {
      setSuccessMessage('')
      markPaidMutation.mutate(requestId)
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
              Kiểm tra hồ sơ ngân hàng trước khi đánh dấu đã chuyển tiền.
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
            <table className="w-full min-w-[900px] text-left text-sm">
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
                {requestsQuery.data?.items.map((request) => (
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
                          onClick={() => markPaid(request.id)}
                          disabled={markPaidMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                          Đã chuyển
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Payouts
