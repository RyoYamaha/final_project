import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, Check, Copy, RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  financeService,
  type AdminPaymentOrder,
  type BankSettings,
} from '@/services/finance.service'

const TRANSACTION_STATUSES = [
  { value: '', label: 'Tất cả cần đối soát' },
  { value: 'Unmatched', label: 'Chưa khớp' },
  { value: 'NeedsReview', label: 'Cần rà soát' },
  { value: 'WrongAccount', label: 'Sai tài khoản nhận' },
  { value: 'OrderAlreadyPaid', label: 'Đơn đã thanh toán' },
]

const EMPTY_SETTINGS = {
  bankName: '',
  bankBin: '',
  bankAccountNumber: '',
  bankAccountName: '',
}

function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`
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

function getTransactionStatus(status: string) {
  if (status === 'Unmatched') return 'Chưa khớp'
  if (status === 'NeedsReview') return 'Cần rà soát'
  if (status === 'WrongAccount') return 'Sai tài khoản nhận'
  if (status === 'OrderAlreadyPaid') return 'Đơn đã được thanh toán'
  if (status === 'Applied') return 'Đã cộng coin'
  return status
}

export function Payments() {
  const queryClient = useQueryClient()
  const [transactionStatus, setTransactionStatus] = useState('')
  const [settingsForm, setSettingsForm] = useState(EMPTY_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [assigningTransactionId, setAssigningTransactionId] = useState('')
  const [assignOrderId, setAssignOrderId] = useState('')
  const [assignReason, setAssignReason] = useState('')
  const [manualOrder, setManualOrder] = useState<AdminPaymentOrder | null>(null)
  const [manualForm, setManualForm] = useState({
    externalId: '',
    paidAmount: '',
    reason: '',
  })
  const [successMessage, setSuccessMessage] = useState('')

  const settingsQuery = useQuery({
    queryKey: ['admin', 'payment-settings'],
    queryFn: async () => (await financeService.getBankSettings()).data,
  })

  useEffect(() => {
    if (settingsQuery.data && !settingsLoaded) {
      setSettingsForm({
        bankName: settingsQuery.data.bankName ?? '',
        bankBin: settingsQuery.data.bankBin ?? '',
        bankAccountNumber: settingsQuery.data.bankAccountNumber ?? '',
        bankAccountName: settingsQuery.data.bankAccountName ?? '',
      })
      setSettingsLoaded(true)
    }
  }, [settingsLoaded, settingsQuery.data])

  const ordersQuery = useQuery({
    queryKey: ['admin', 'payment-orders'],
    queryFn: async () => (await financeService.getAdminPaymentOrders()).data,
    refetchInterval: 10_000,
  })

  const transactionsQuery = useQuery({
    queryKey: ['admin', 'bank-transactions', transactionStatus],
    queryFn: async () =>
      (await financeService.getAdminBankTransactions(transactionStatus || undefined)).data,
    refetchInterval: 10_000,
  })

  const refreshAdminPayments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'bank-transactions'] }),
    ])
  }

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Omit<BankSettings, 'configured'>) =>
      financeService.updateBankSettings(settings),
    onSuccess: async () => {
      setSuccessMessage('Đã cập nhật tài khoản nhận tiền nạp.')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payment-settings'] })
    },
  })

  const assignMutation = useMutation({
    mutationFn: () =>
      financeService.assignBankTransaction(
        assigningTransactionId,
        assignOrderId,
        assignReason.trim(),
      ),
    onSuccess: async () => {
      setAssigningTransactionId('')
      setAssignOrderId('')
      setAssignReason('')
      setSuccessMessage('Đã đối soát giao dịch và cập nhật ví.')
      await refreshAdminPayments()
    },
  })

  const manualConfirmMutation = useMutation({
    mutationFn: () => {
      if (!manualOrder) {
        throw new Error('Chưa chọn đơn nạp để xác nhận.')
      }
      return financeService.confirmPaymentOrder(manualOrder.id, {
        externalId: manualForm.externalId.trim(),
        paidAmount: Number(manualForm.paidAmount),
        reason: manualForm.reason.trim(),
      })
    },
    onSuccess: async () => {
      setManualOrder(null)
      setManualForm({ externalId: '', paidAmount: '', reason: '' })
      setSuccessMessage('Đã xác nhận nạp tiền và cộng coin cho người dùng.')
      await refreshAdminPayments()
    },
  })

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')
    updateSettingsMutation.mutate(settingsForm)
  }

  const submitAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (assigningTransactionId && assignOrderId && assignReason.trim().length >= 3) {
      setSuccessMessage('')
      assignMutation.mutate()
    }
  }

  const submitManualConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(manualForm.paidAmount)
    if (
      manualOrder &&
      manualForm.externalId.trim() &&
      Number.isSafeInteger(amount) &&
      amount >= 1_000 &&
      amount % 1_000 === 0 &&
      manualForm.reason.trim().length >= 3
    ) {
      setSuccessMessage('')
      manualConfirmMutation.mutate()
    }
  }

  const beginManualConfirm = (order: AdminPaymentOrder) => {
    setManualOrder(order)
    setManualForm({
      externalId: '',
      paidAmount: String(order.expectedAmount),
      reason: '',
    })
  }

  const copyTransferCode = async (transferCode: string) => {
    try {
      await navigator.clipboard.writeText(transferCode)
      setSuccessMessage(`Đã sao chép mã chuyển khoản ${transferCode}.`)
    } catch {
      setSuccessMessage('Không thể sao chép tự động; hãy sao chép mã chuyển khoản thủ công.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Banknote className="h-6 w-6" />
          Quản lý nạp coin
        </h1>
        <p className="text-sm text-muted-foreground">
          Cấu hình tài khoản nhận, kiểm tra đơn nạp và đối soát giao dịch ngân hàng.
        </p>
      </header>

      {successMessage && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {successMessage}
        </p>
      )}

      <form onSubmit={submitSettings} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Settings2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Tài khoản nhận tiền nạp</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thông tin này được lưu vào đơn mới và dùng để tạo VietQR.
            </p>
          </div>
        </div>
        {settingsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải cấu hình...</p>
        ) : settingsQuery.isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Không tải được cấu hình ngân hàng.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void settingsQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5 text-sm font-medium">
                Tên ngân hàng
                <Input required maxLength={100} value={settingsForm.bankName} onChange={(event) => setSettingsForm((form) => ({ ...form, bankName: event.target.value }))} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Bank BIN
                <Input required pattern="[A-Za-z0-9]{3,20}" maxLength={20} value={settingsForm.bankBin} onChange={(event) => setSettingsForm((form) => ({ ...form, bankBin: event.target.value }))} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Số tài khoản
                <Input required pattern="[0-9]{6,30}" maxLength={30} value={settingsForm.bankAccountNumber} onChange={(event) => setSettingsForm((form) => ({ ...form, bankAccountNumber: event.target.value }))} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Tên chủ tài khoản
                <Input required maxLength={100} value={settingsForm.bankAccountName} onChange={(event) => setSettingsForm((form) => ({ ...form, bankAccountName: event.target.value }))} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {settingsQuery.data?.configured ? 'Đã cấu hình tài khoản nhận.' : 'Chưa cấu hình; người dùng chưa thể tạo đơn nạp.'}
              </span>
            </div>
            {updateSettingsMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                {getErrorMessage(updateSettingsMutation.error, 'Không lưu được cấu hình.')}
              </p>
            )}
          </>
        )}
      </form>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Giao dịch ngân hàng cần đối soát</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Danh sách tự làm mới mỗi 10 giây. Chỉ giao dịch “Chưa khớp” mới có thể gán tự động.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={transactionStatus}
              onChange={(event) => setTransactionStatus(event.target.value)}
              aria-label="Lọc trạng thái giao dịch"
            >
              {TRANSACTION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <Button type="button" size="sm" variant="outline" onClick={() => void transactionsQuery.refetch()} disabled={transactionsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {transactionsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải giao dịch...</p>
        ) : transactionsQuery.isError ? (
          <p className="rounded-lg border border-border p-4 text-center text-sm text-destructive">Không tải được giao dịch ngân hàng.</p>
        ) : (transactionsQuery.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Không có giao dịch cần xử lý.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Thời gian / mã ngân hàng</th>
                  <th className="p-3 font-medium">Nội dung giao dịch</th>
                  <th className="p-3 font-medium">Tài khoản nhận</th>
                  <th className="p-3 text-right font-medium">Số tiền</th>
                  <th className="p-3 font-medium">Trạng thái</th>
                  <th className="p-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactionsQuery.data?.items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="p-3">
                      <p className="whitespace-nowrap">{formatDate(transaction.receivedAt)}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{transaction.externalId}</p>
                    </td>
                    <td className="max-w-xs p-3">
                      <p className="truncate" title={transaction.description}>{transaction.description}</p>
                      {transaction.paymentOrder && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Đơn của {transaction.paymentOrder.user.username}
                        </p>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {transaction.destinationAccountNumber ?? 'SePay không gửi'}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right font-semibold">{formatVnd(transaction.transferAmount)}</td>
                    <td className="p-3">{getTransactionStatus(transaction.processingStatus)}</td>
                    <td className="p-3">
                      {transaction.processingStatus === 'Unmatched' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAssigningTransactionId(transaction.id)
                            setAssignOrderId('')
                          }}
                        >
                          Gán vào đơn
                        </Button>
                      )}
                      {transaction.processingStatus !== 'Unmatched' && (
                        <span className="text-xs text-muted-foreground">Cần kiểm tra thủ công</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {assigningTransactionId && (
          <form onSubmit={submitAssign} className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
            <label className="space-y-1.5 text-sm font-medium">
              Đơn nạp đang chờ
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={assignOrderId}
                onChange={(event) => setAssignOrderId(event.target.value)}
                required
              >
                <option value="">Chọn đơn nạp...</option>
                {ordersQuery.data?.items.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.user.username} · {order.transferCode} · {formatVnd(order.expectedAmount)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Lý do đối soát
              <Input minLength={3} maxLength={500} value={assignReason} onChange={(event) => setAssignReason(event.target.value)} required />
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={assignMutation.isPending || !assignOrderId || assignReason.trim().length < 3}>
                {assignMutation.isPending ? 'Đang xử lý...' : 'Xác nhận gán'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAssigningTransactionId('')}>
                Hủy
              </Button>
            </div>
            {assignMutation.isError && (
              <p className="text-sm text-destructive md:col-span-3" role="alert">
                {getErrorMessage(assignMutation.error, 'Không gán được giao dịch.')}
              </p>
            )}
          </form>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-semibold">Đơn nạp đang chờ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Có thể xác nhận thủ công sau khi kiểm tra sao kê. Nhập đúng mã giao dịch ngân hàng để chống ghi nhận trùng.
          </p>
        </div>
        {ordersQuery.isLoading ? (
          <p className="py-5 text-center text-sm text-muted-foreground">Đang tải đơn nạp...</p>
        ) : ordersQuery.isError ? (
          <p className="text-sm text-destructive">Không tải được danh sách đơn nạp.</p>
        ) : (ordersQuery.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Không có đơn nạp đang chờ.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Người dùng</th>
                  <th className="p-3 font-medium">Mã đơn</th>
                  <th className="p-3 text-right font-medium">Số tiền dự kiến</th>
                  <th className="p-3 font-medium">Hạn QR</th>
                  <th className="p-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ordersQuery.data?.items.map((order) => (
                  <tr key={order.id}>
                    <td className="p-3">
                      <p className="font-medium">{order.user.username}</p>
                      <p className="text-xs text-muted-foreground">{order.user.email}</p>
                    </td>
                    <td className="p-3">
                      <button type="button" className="inline-flex items-center gap-1 font-mono text-xs underline underline-offset-4" onClick={() => void copyTransferCode(order.transferCode)}>
                        {order.transferCode}<Copy className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">{formatVnd(order.expectedAmount)}</td>
                    <td className="whitespace-nowrap p-3">{formatDate(order.expiresAt)}</td>
                    <td className="p-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => beginManualConfirm(order)}>
                        Xác nhận thủ công
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {manualOrder && (
          <form onSubmit={submitManualConfirm} className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div>
              <h3 className="font-medium">Xác nhận đơn {manualOrder.transferCode}</h3>
              <p className="text-sm text-muted-foreground">
                Người dùng: {manualOrder.user.username} · dự kiến {formatVnd(manualOrder.expectedAmount)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium">
                Mã giao dịch sao kê
                <Input value={manualForm.externalId} onChange={(event) => setManualForm((form) => ({ ...form, externalId: event.target.value }))} required maxLength={100} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Số tiền thực nhận (VND)
                <Input type="number" min={1_000} step={1_000} value={manualForm.paidAmount} onChange={(event) => setManualForm((form) => ({ ...form, paidAmount: event.target.value }))} required />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Lý do xác nhận
                <Input value={manualForm.reason} onChange={(event) => setManualForm((form) => ({ ...form, reason: event.target.value }))} minLength={3} maxLength={500} required />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Mỗi 1.000đ thực nhận được đổi thành 1 coin. Không nhập giao dịch đã dùng cho đơn khác.
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={manualConfirmMutation.isPending}>
                <Check className="h-4 w-4" />
                {manualConfirmMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận và cộng coin'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setManualOrder(null)}>
                Hủy
              </Button>
            </div>
            {manualConfirmMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                {getErrorMessage(manualConfirmMutation.error, 'Không xác nhận được giao dịch.')}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  )
}

export default Payments
