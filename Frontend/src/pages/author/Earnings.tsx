import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, Coins, RefreshCw, Save } from 'lucide-react'
import { Navigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { useAppDialog } from '@/components/common/AppDialogProvider'
import {
  financeService,
  type PayoutProfile,
  type PayoutRequest,
} from '@/services/finance.service'

function formatCoins(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatDate(value: string | null | undefined) {
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

function getPayoutStatusLabel(status: PayoutRequest['status']) {
  if (status === 'Paid') {
    return 'Đã thanh toán'
  }
  if (status === 'Rejected') {
    return 'Đã từ chối'
  }
  return 'Đang chờ xử lý'
}

export function Earnings() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const [profileForm, setProfileForm] = useState<Omit<PayoutProfile, 'updatedAt'>>({
    bankName: '',
    bankBin: '',
    bankAccountNumber: '',
    bankAccountName: '',
  })
  const [amountInput, setAmountInput] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const summaryQuery = useQuery({
    queryKey: ['revenue', 'summary'],
    enabled: user?.role === 'Author' || user?.role === 'Publisher',
    queryFn: async () => (await financeService.getRevenueSummary()).data,
  })

  const historyQuery = useQuery({
    queryKey: ['revenue', 'history', 1],
    enabled: user?.role === 'Author' || user?.role === 'Publisher',
    queryFn: async () => (await financeService.getRevenueHistory(1, 20)).data,
  })

  const minimumQuery = useQuery({
    queryKey: ['payout', 'minimum'],
    enabled: user?.role === 'Author' || user?.role === 'Publisher',
    queryFn: async () => (await financeService.getPayoutMinimum()).data,
  })

  const profileQuery = useQuery({
    queryKey: ['payout', 'profile'],
    enabled: user?.role === 'Author' || user?.role === 'Publisher',
    queryFn: async () => (await financeService.getPayoutProfile()).data,
  })

  const requestsQuery = useQuery({
    queryKey: ['payout', 'my-requests'],
    enabled: user?.role === 'Author' || user?.role === 'Publisher',
    queryFn: async () => (await financeService.getMyPayoutRequests()).data,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (profile: Omit<PayoutProfile, 'updatedAt'>) =>
      financeService.updatePayoutProfile(profile),
    onSuccess: async () => {
      setSuccessMessage('Đã lưu hồ sơ ngân hàng nhận tiền.')
      await queryClient.invalidateQueries({ queryKey: ['payout', 'profile'] })
    },
  })

  const payoutMutation = useMutation({
    mutationFn: (amountCoins: number) =>
      financeService.createPayoutRequest(amountCoins),
    onSuccess: async () => {
      setAmountInput('')
      setSuccessMessage('Đã gửi yêu cầu rút coin.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['revenue', 'summary'] }),
        queryClient.invalidateQueries({ queryKey: ['payout', 'my-requests'] }),
      ])
    },
  })

  const onProfileChange = (
    field: keyof Omit<PayoutProfile, 'updatedAt'>,
    value: string,
  ) => {
    setSuccessMessage('')
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const currentProfile = profileQuery.data?.profile
    if (
      !currentProfile ||
      currentProfile.bankName !== profileForm.bankName ||
      currentProfile.bankBin !== profileForm.bankBin ||
      currentProfile.bankAccountNumber !== profileForm.bankAccountNumber ||
      currentProfile.bankAccountName !== profileForm.bankAccountName
    ) {
      const confirmed = await confirm({
        title: 'Xác nhận thay đổi tài khoản nhận payout',
        description: currentProfile
          ? 'Cập nhật thông tin ngân hàng sẽ nhận các khoản payout trong tương lai?'
          : 'Lưu tài khoản ngân hàng này làm nơi nhận payout?',
        confirmLabel: 'Cập nhật tài khoản',
      })
      if (!confirmed) return
    }
    setSuccessMessage('')
    updateProfileMutation.mutate(profileForm)
  }

  const submitPayout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(amountInput)
    if (!Number.isSafeInteger(amount) || amount < (minimumQuery.data ?? 10)) {
      return
    }
    const confirmed = await confirm({
      title: 'Xác nhận yêu cầu rút coin',
      description: `Gửi yêu cầu rút ${formatCoins(amount)} coin về tài khoản ngân hàng đã đăng ký? Số coin sẽ được giữ trong thời gian yêu cầu được xử lý.`,
      confirmLabel: 'Gửi yêu cầu rút',
    })
    if (!confirmed) return
    setSuccessMessage('')
    payoutMutation.mutate(amount)
  }

  if (user?.role !== 'Author' && user?.role !== 'Publisher') {
    return <Navigate to="/" replace />
  }

  const profile = profileQuery.data?.profile
  const hasProfile = profileQuery.data?.configured ?? false
  const minimumCoins = minimumQuery.data ?? 10

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Doanh thu và rút coin</h1>
        <p className="text-sm text-muted-foreground">
          Xem doanh thu từ lượt mua và gửi yêu cầu nhận tiền qua chuyển khoản.
        </p>
      </header>

      {successMessage && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {successMessage}
        </p>
      )}

      {summaryQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải doanh thu...</p>
      ) : summaryQuery.isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">Không tải được số liệu doanh thu.</p>
          <Button size="sm" variant="outline" onClick={() => void summaryQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Tổng doanh thu bán', value: summaryQuery.data?.totalGrossCoins ?? 0 },
            { label: 'Thu nhập của bạn', value: summaryQuery.data?.totalEarnedCoins ?? 0 },
            { label: 'Đang giữ / đã trả', value: summaryQuery.data?.reservedCoins ?? 0 },
            { label: 'Có thể rút', value: summaryQuery.data?.availableCoins ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
                <Coins className="h-5 w-5 text-muted-foreground" />
                {formatCoins(item.value)}
                <span className="text-sm font-medium text-muted-foreground">coin</span>
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submitProfile} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-semibold">Tài khoản nhận payout</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thông tin sẽ được chụp lại khi bạn tạo yêu cầu rút.
            </p>
          </div>
          {profileQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải hồ sơ...</p>
          ) : profileQuery.isError ? (
            <p className="text-sm text-destructive">Không tải được hồ sơ ngân hàng.</p>
          ) : (
            <>
              {profile && !Object.values(profileForm).some(Boolean) && (
                <button
                  type="button"
                  className="text-sm text-primary underline underline-offset-4"
                  onClick={() => setProfileForm({
                    bankName: profile.bankName,
                    bankBin: profile.bankBin,
                    bankAccountNumber: profile.bankAccountNumber,
                    bankAccountName: profile.bankAccountName,
                  })}
                >
                  Đang dùng tài khoản {profile.bankName} •••• {profile.bankAccountNumber.slice(-4)} — chỉnh sửa
                </button>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  Ngân hàng
                  <Input required minLength={2} maxLength={100} value={profileForm.bankName} onChange={(event) => onProfileChange('bankName', event.target.value)} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Mã BIN
                  <Input required maxLength={20} value={profileForm.bankBin} onChange={(event) => onProfileChange('bankBin', event.target.value)} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Số tài khoản
                  <Input required maxLength={30} value={profileForm.bankAccountNumber} onChange={(event) => onProfileChange('bankAccountNumber', event.target.value)} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Tên chủ tài khoản
                  <Input required minLength={2} maxLength={100} value={profileForm.bankAccountName} onChange={(event) => onProfileChange('bankAccountName', event.target.value)} />
                </label>
              </div>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu tài khoản'}
              </Button>
              {updateProfileMutation.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {getErrorMessage(updateProfileMutation.error, 'Không lưu được hồ sơ.')}
                </p>
              )}
            </>
          )}
        </form>

        <form onSubmit={submitPayout} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-semibold">Tạo yêu cầu rút</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tối thiểu {formatCoins(minimumCoins)} coin. Admin sẽ chuyển khoản thủ công.
            </p>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            Số coin muốn rút
            <Input
              type="number"
              inputMode="numeric"
              min={minimumCoins}
              step={1}
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              required
            />
          </label>
          {profile && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Banknote className="h-4 w-4" />
                Người nhận: {profile.bankAccountName}
              </p>
              <p className="mt-1 text-muted-foreground">
                {profile.bankName} · {profile.bankAccountNumber}
              </p>
            </div>
          )}
          {!hasProfile && !profileQuery.isLoading && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Hãy lưu hồ sơ ngân hàng trước khi gửi yêu cầu.
            </p>
          )}
          <Button
            type="submit"
            disabled={
              payoutMutation.isPending ||
              !hasProfile ||
              !Number.isSafeInteger(Number(amountInput)) ||
              Number(amountInput) < minimumCoins ||
              Number(amountInput) > (summaryQuery.data?.availableCoins ?? 0)
            }
          >
            {payoutMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu rút'}
          </Button>
          {payoutMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getErrorMessage(payoutMutation.error, 'Không gửi được yêu cầu rút.')}
            </p>
          )}
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Lịch sử doanh thu</h2>
            <p className="text-sm text-muted-foreground">Các lượt mua đã ghi nhận cho bạn.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void historyQuery.refetch()} disabled={historyQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
        {historyQuery.isLoading ? (
          <p className="py-5 text-center text-sm text-muted-foreground">Đang tải lịch sử...</p>
        ) : historyQuery.isError ? (
          <p className="rounded-lg border border-border p-4 text-center text-sm text-destructive">Không tải được lịch sử doanh thu.</p>
        ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Chưa có doanh thu từ lượt mua.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Ngày</th>
                  <th className="p-3 font-medium">Bộ truyện</th>
                  <th className="p-3 text-right font-medium">Giá bán</th>
                  <th className="p-3 text-center font-medium">Tỷ lệ</th>
                  <th className="p-3 text-right font-medium">Thu nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyQuery.data?.items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap p-3">{formatDate(item.createdAt)}</td>
                    <td className="p-3">{item.content.title}</td>
                    <td className="p-3 text-right">{formatCoins(item.grossCoins)} coin</td>
                    <td className="p-3 text-center">{item.sharePercent}%</td>
                    <td className="p-3 text-right font-semibold">{formatCoins(item.creatorCoins)} coin</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Yêu cầu rút tiền</h2>
          <p className="text-sm text-muted-foreground">Coin ở trạng thái chờ được giữ khỏi số dư có thể rút.</p>
        </div>
        {requestsQuery.isLoading ? (
          <p className="py-5 text-center text-sm text-muted-foreground">Đang tải yêu cầu...</p>
        ) : requestsQuery.isError ? (
          <p className="rounded-lg border border-border p-4 text-center text-sm text-destructive">Không tải được các yêu cầu rút.</p>
        ) : (requestsQuery.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Bạn chưa tạo yêu cầu rút nào.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Ngày gửi</th>
                  <th className="p-3 font-medium">Tài khoản nhận</th>
                  <th className="p-3 text-right font-medium">Số coin</th>
                  <th className="p-3 font-medium">Trạng thái</th>
                  <th className="p-3 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requestsQuery.data?.items.map((request) => (
                  <tr key={request.id}>
                    <td className="whitespace-nowrap p-3">{formatDate(request.requestedAt)}</td>
                    <td className="p-3">{request.bankName} · {request.bankAccountNumber}</td>
                    <td className="whitespace-nowrap p-3 text-right font-semibold">{formatCoins(request.amountCoins)}</td>
                    <td className="p-3">{getPayoutStatusLabel(request.status)}</td>
                    <td className="max-w-xs p-3 text-muted-foreground">{request.rejectionReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {requestsQuery.isFetching && (
          <span className="sr-only" role="status">Đang làm mới yêu cầu rút.</span>
        )}
      </section>
    </div>
  )
}

export default Earnings
