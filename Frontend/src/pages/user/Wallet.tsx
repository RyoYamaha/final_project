import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Copy,
  Coins,
  ExternalLink,
  RefreshCw,
  Wallet as WalletIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  financeService,
  type CreatedPaymentOrder,
} from '@/services/finance.service'

const DEPOSIT_PRESETS = [50_000, 100_000, 200_000, 500_000]
const POLL_INTERVAL_MS = 5_000

type DepositOrderDisplay = {
  id: string
  expectedAmount: number
  expectedCoins: number
  paidAmount: number | null
  paidCoins: number | null
  status: string
  transferCode: string
  expiresAt: string
  isExpired: boolean
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  qrUrl?: string
}

function formatCoins(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }

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

function DepositStatus({
  order,
}: {
  order: Pick<DepositOrderDisplay, 'status' | 'isExpired' | 'paidCoins'>
}) {
  if (order.status === 'Paid') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Đã nạp thành công {formatCoins(order.paidCoins ?? 0)} coin.
      </div>
    )
  }

  if (order.isExpired) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
        Mã QR đã hết thời gian hiển thị. Nếu bạn đã chuyển tiền, giao dịch vẫn
        được đối soát khi ngân hàng gửi thông báo.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-800 dark:text-blue-200">
      <Clock3 className="h-4 w-4 shrink-0" />
      Đang chờ ngân hàng xác nhận. Trạng thái được kiểm tra tự động mỗi 5 giây.
    </div>
  )
}

export function Wallet() {
  const queryClient = useQueryClient()
  const [amountInput, setAmountInput] = useState('50000')
  const [activeOrderId, setActiveOrderId] = useState(
    () => sessionStorage.getItem('active-payment-order-id') ?? '',
  )
  const [copiedField, setCopiedField] = useState('')
  const [copyError, setCopyError] = useState('')
  const amountVnd = Number(amountInput)

  const balanceQuery = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => (await financeService.getWalletBalance()).data,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  })

  const transactionsQuery = useQuery({
    queryKey: ['wallet', 'transactions', 1],
    queryFn: async () => (await financeService.getWalletTransactions(1, 20)).data,
  })

  const depositMutation = useMutation({
    mutationFn: () => financeService.createDeposit(amountVnd),
    onSuccess: async ({ data }) => {
      setActiveOrderId(data.id)
      sessionStorage.setItem('active-payment-order-id', data.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] }),
      ])
    },
  })

  const orderQuery = useQuery({
    queryKey: ['payment-order', activeOrderId],
    enabled: activeOrderId.length > 0,
    queryFn: async () => (await financeService.getPaymentOrder(activeOrderId)).data,
    refetchInterval: (query) =>
      query.state.data?.status === 'Paid' ? false : POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
  })

  useEffect(() => {
    if (orderQuery.data?.status === 'Paid') {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] }),
      ])
    }
  }, [orderQuery.data?.status, queryClient])

  useEffect(() => {
    if (!copiedField) {
      return
    }

    const timeout = window.setTimeout(() => setCopiedField(''), 1_800)
    return () => window.clearTimeout(timeout)
  }, [copiedField])

  const expectedCoins = useMemo(() => {
    if (!Number.isSafeInteger(amountVnd) || amountVnd < 0) {
      return 0
    }
    return amountVnd / 1_000
  }, [amountVnd])

  const handleCreateDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !Number.isSafeInteger(amountVnd) ||
      amountVnd < 1_000 ||
      amountVnd % 1_000 !== 0
    ) {
      return
    }
    depositMutation.mutate()
  }

  const copyValue = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyError('')
      setCopiedField(field)
    } catch {
      setCopyError('Không thể sao chép tự động. Vui lòng chọn và sao chép thủ công.')
    }
  }

  const refreshPaymentAndWallet = async () => {
    const refreshTasks: Promise<unknown>[] = [
      balanceQuery.refetch(),
      transactionsQuery.refetch(),
    ]

    if (activeOrderId) {
      refreshTasks.push(orderQuery.refetch())
    }

    await Promise.all(refreshTasks)
  }

  const createdOrder = depositMutation.data?.data
  let order: DepositOrderDisplay | undefined

  if (orderQuery.data) {
    let currentCreatedOrder: CreatedPaymentOrder | undefined
    if (createdOrder?.id === orderQuery.data.id) {
      currentCreatedOrder = createdOrder
    }

    order = {
      ...orderQuery.data,
      expectedCoins: orderQuery.data.expectedAmount / 1_000,
      bankName: currentCreatedOrder?.bankName ?? orderQuery.data.bankName,
      bankAccountNumber:
        currentCreatedOrder?.bankAccountNumber ??
        orderQuery.data.bankAccountNumber,
      bankAccountName:
        currentCreatedOrder?.bankAccountName ??
        orderQuery.data.bankAccountName,
      qrUrl: currentCreatedOrder?.qrUrl ?? orderQuery.data.qrUrl,
    }
  } else if (createdOrder) {
    order = {
      ...createdOrder,
      paidAmount: null,
      paidCoins: null,
      isExpired: false,
    }
  }

  const showQr =
    order?.status === 'Pending' &&
    !order.isExpired

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <WalletIcon className="h-6 w-6" />
          Ví coin
        </h1>
        <p className="text-sm text-muted-foreground">
          Nạp coin qua chuyển khoản ngân hàng và xem lịch sử biến động số dư.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            Số dư hiện tại
          </div>
          {balanceQuery.isLoading ? (
            <p className="mt-3 text-3xl font-bold">Đang tải...</p>
          ) : balanceQuery.isError ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-destructive">Không tải được số dư ví.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void balanceQuery.refetch()}
              >
                Thử lại
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-3xl font-bold">
              {formatCoins(balanceQuery.data?.balance ?? 0)}{' '}
              <span className="text-base font-medium text-muted-foreground">coin</span>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            1 coin = 1.000đ. Coin chỉ được cộng sau khi hệ thống xác nhận giao dịch.
          </p>
        </div>

        <form
          onSubmit={handleCreateDeposit}
          className="space-y-4 rounded-xl border border-border bg-card p-5"
        >
          <div>
            <h2 className="font-semibold">Tạo yêu cầu nạp coin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn gói hoặc nhập số tiền là bội số của 1.000đ.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DEPOSIT_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={amountVnd === preset ? 'default' : 'outline'}
                onClick={() => setAmountInput(String(preset))}
              >
                {formatVnd(preset)}
              </Button>
            ))}
          </div>

          <label className="block space-y-1.5 text-sm font-medium">
            Số tiền muốn nạp (VND)
            <Input
              type="number"
              inputMode="numeric"
              min={1_000}
              step={1_000}
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              aria-describedby="deposit-amount-hint"
              required
            />
          </label>
          <p id="deposit-amount-hint" className="text-xs text-muted-foreground">
            Bạn sẽ nhận khoảng {formatCoins(expectedCoins)} coin nếu chuyển khoản
            đủ số tiền trên.
          </p>

          <Button
            type="submit"
            disabled={
              depositMutation.isPending ||
              !Number.isSafeInteger(amountVnd) ||
              amountVnd < 1_000 ||
              amountVnd % 1_000 !== 0
            }
          >
            <ArrowDownToLine className="h-4 w-4" />
            {depositMutation.isPending ? 'Đang tạo đơn...' : 'Tạo mã QR nạp tiền'}
          </Button>

          {depositMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getErrorMessage(depositMutation.error, 'Không tạo được đơn nạp.')}
            </p>
          )}
        </form>
      </section>

      {order && (
        <section className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Chi tiết đơn nạp</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mã đơn: <span className="font-mono font-semibold text-foreground">{order.transferCode}</span>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void refreshPaymentAndWallet()}
                disabled={orderQuery.isFetching || balanceQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${orderQuery.isFetching || balanceQuery.isFetching ? 'animate-spin' : ''}`} />
                Kiểm tra đơn và số dư
              </Button>
            </div>

            {orderQuery.isError && (
              <p className="text-sm text-destructive" role="alert">
                Không kiểm tra được trạng thái đơn. Hệ thống sẽ thử lại tự động.
              </p>
            )}
            <DepositStatus order={order} />

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Số tiền cần chuyển</dt>
                <dd className="font-semibold">{formatVnd(order.expectedAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Coin dự kiến</dt>
                <dd className="font-semibold">{formatCoins(order.expectedCoins)} coin</dd>
              </div>
              {order.paidAmount !== null && (
                <div>
                  <dt className="text-muted-foreground">Tiền thực nhận</dt>
                  <dd className="font-semibold">{formatVnd(order.paidAmount)}</dd>
                </div>
              )}
              {order.paidCoins !== null && (
                <div>
                  <dt className="text-muted-foreground">Coin đã cộng</dt>
                  <dd className="font-semibold">{formatCoins(order.paidCoins)} coin</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Hạn hiển thị QR</dt>
                <dd>{formatDate(order.expiresAt)}</dd>
              </div>
            </dl>

            {order.bankName && (
              <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
                <p><span className="text-muted-foreground">Ngân hàng:</span> {order.bankName}</p>
                <div className="flex items-center justify-between gap-3">
                  <p><span className="text-muted-foreground">Số tài khoản:</span> <span className="font-mono font-semibold">{order.bankAccountNumber}</span></p>
                  {order.bankAccountNumber && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyValue('account', order.bankAccountNumber!)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedField === 'account' ? 'Đã chép' : 'Sao chép'}
                    </Button>
                  )}
                </div>
                <p><span className="text-muted-foreground">Chủ tài khoản:</span> {order.bankAccountName}</p>
                <div className="flex items-center justify-between gap-3">
                  <p><span className="text-muted-foreground">Nội dung:</span> <span className="font-mono font-semibold">{order.transferCode}</span></p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyValue('code', order.transferCode)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedField === 'code' ? 'Đã chép' : 'Sao chép'}
                  </Button>
                </div>
                {copyError && <p className="text-xs text-destructive">{copyError}</p>}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Vui lòng chuyển đúng nội dung. Không bấm xác nhận trước khi ngân hàng
              xử lý; trạng thái được cập nhật từ thông báo của ngân hàng.
            </p>
          </div>

          <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-4">
            {showQr && order.qrUrl ? (
              <a
                href={order.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2"
              >
                <img
                  src={order.qrUrl}
                  alt={`Mã QR chuyển khoản ${order.expectedAmount} đồng, nội dung ${order.transferCode}`}
                  className="h-64 w-64 max-w-full rounded-lg bg-white object-contain p-2"
                />
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                  Mở ảnh QR riêng
                  <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            ) : (
              <div className="max-w-sm space-y-2 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="font-medium">
                  {order.status === 'Paid'
                    ? 'Giao dịch đã hoàn tất'
                    : 'Mã QR đã hết hạn hiển thị'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Bạn có thể tạo đơn mới. Nếu đã chuyển khoản, đơn cũ vẫn được
                  đối soát khi ngân hàng gửi thông báo.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Lịch sử coin</h2>
            <p className="text-sm text-muted-foreground">
              Các giao dịch gần nhất của ví này.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void transactionsQuery.refetch()}
            disabled={transactionsQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {transactionsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải lịch sử...</p>
        ) : transactionsQuery.isError ? (
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="text-sm text-destructive">Không tải được lịch sử coin.</p>
            <Button
              type="button"
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => void transactionsQuery.refetch()}
            >
              Thử lại
            </Button>
          </div>
        ) : (transactionsQuery.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ví chưa có giao dịch nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Thời gian</th>
                  <th className="p-3 font-medium">Loại</th>
                  <th className="p-3 font-medium">Mô tả</th>
                  <th className="p-3 text-right font-medium">Thay đổi</th>
                  <th className="p-3 text-right font-medium">Số dư sau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactionsQuery.data?.items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap p-3">{formatDate(transaction.createdAt)}</td>
                    <td className="p-3">{transaction.transactionType}</td>
                    <td className="max-w-xs truncate p-3" title={transaction.description}>
                      {transaction.description}
                    </td>
                    <td className={`whitespace-nowrap p-3 text-right font-semibold ${transaction.amountCoins > 0 ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                      {transaction.amountCoins > 0 ? '+' : ''}
                      {formatCoins(transaction.amountCoins)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {formatCoins(transaction.balanceAfter)}
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

export default Wallet
