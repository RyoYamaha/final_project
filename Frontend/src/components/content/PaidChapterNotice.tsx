import { Link, useLocation } from 'react-router'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { financeService } from '@/services/finance.service'
import { unlockService } from '@/services/unlock.service'
import { useAuthStore } from '@/stores/auth-store'
import { useAppDialog } from '@/components/common/AppDialogProvider'

interface Props {
  contentId: string
  contentTitle?: string
  priceCoins: number
  onPurchaseSuccess: () => Promise<void>
}

function formatCoins(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function getErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) {
      return message.join(', ')
    }
    if (message) {
      return message
    }
  }
  return 'Chưa thể mua bộ truyện. Vui lòng thử lại.'
}

export function PaidChapterNotice({
  contentId,
  contentTitle,
  priceCoins,
  onPurchaseSuccess,
}: Props) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const user = useAuthStore((state) => state.user)
  const isReader = user?.role === 'Reader'

  const balanceQuery = useQuery({
    queryKey: ['wallet', 'balance', user?.id],
    queryFn: async () => (await financeService.getWalletBalance()).data,
    enabled: isReader,
    retry: (failureCount, error) =>
      !(isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) &&
      failureCount < 2,
  })

  const purchaseMutation = useMutation({
    mutationFn: async () =>
      (await unlockService.purchaseContent(contentId)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] }),
        onPurchaseSuccess(),
      ])
    },
  })

  const balance = balanceQuery.data?.balance
  const hasEnoughCoins = balance !== undefined && balance >= priceCoins
  const insufficientBalanceError =
    isAxiosError(purchaseMutation.error) &&
    typeof purchaseMutation.error.response?.data?.message === 'string' &&
    purchaseMutation.error.response.data.message.toLowerCase().includes('số dư')
  const needsDeposit = isReader && (
    (balance !== undefined && balance < priceCoins) || insufficientBalanceError
  )

  const confirmPurchase = async () => {
    const confirmed = await confirm({
      title: 'Xác nhận mua quyền đọc',
      description: `Mua quyền đọc toàn bộ truyện${contentTitle ? ` "${contentTitle}"` : ''} với giá ${formatCoins(priceCoins)} coin? Coin sẽ được trừ một lần sau khi giao dịch thành công.`,
      confirmLabel: `Mua với ${formatCoins(priceCoins)} coin`,
    })
    if (confirmed) purchaseMutation.mutate()
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center p-4 sm:p-8">
      <section
        className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/[0.06]"
        role="alert"
      >
        <div className="bg-gradient-to-br from-amber-500/15 via-primary/5 to-transparent px-6 py-8 text-center sm:px-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Mở khóa truyện
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Chương này dành cho độc giả sở hữu bộ truyện
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {contentTitle
              ? `Mua một lần để đọc chương này và toàn bộ chương hiện có, kể cả các chương mới đăng sau của “${contentTitle}”.`
              : 'Mua một lần để đọc chương này và toàn bộ chương hiện có, kể cả các chương mới đăng sau.'}
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Giá mở khóa trọn bộ
              </div>
              <p className="flex items-center gap-2 text-2xl font-bold">
                <Coins className="h-5 w-5 text-amber-500" />
                {formatCoins(priceCoins)} <span className="text-sm font-medium">coin</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Số dư ví của bạn
              </div>
              {!isReader ? (
                <p className="text-sm text-muted-foreground">
                  {user
                    ? 'Ví coin chỉ dành cho tài khoản Reader'
                    : 'Đăng nhập để xem số dư và mua truyện'}
                </p>
              ) : balanceQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Đang kiểm tra số dư...</p>
              ) : balanceQuery.isError ? (
                <button
                  type="button"
                  onClick={() => balanceQuery.refetch()}
                  className="text-sm text-destructive underline underline-offset-4"
                >
                  Không tải được số dư. Bấm để thử lại
                </button>
              ) : (
                <p className="flex items-center gap-2 text-2xl font-bold">
                  <Coins className="h-5 w-5 text-amber-500" />
                  {formatCoins(balance ?? 0)} <span className="text-sm font-medium">coin</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-left">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Coin chỉ được trừ một lần khi mua thành công. Quyền đọc được lưu
              vào tài khoản của bạn để có thể tiếp tục đọc bất cứ lúc nào.
            </p>
          </div>

          {purchaseMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getErrorMessage(purchaseMutation.error)}
            </p>
          )}
          {balanceQuery.isError && user && !needsDeposit && (
            <p className="text-sm text-muted-foreground">
              Hãy tải lại số dư ví trước khi tiếp tục mua.
            </p>
          )}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {!user ? (
              <Button asChild size="lg" className="min-w-52">
                <Link to="/login" state={{ from: location }}>
                  Đăng nhập để mua <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : !isReader ? (
              <p className="self-center text-sm text-muted-foreground">
                Chức năng mua truyện bằng coin dành cho tài khoản Reader.
              </p>
            ) : needsDeposit ? (
              <Button asChild size="lg" className="min-w-52">
                <Link to="/wallet">
                  <Wallet className="h-4 w-4" />
                  Nạp thêm coin
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="min-w-52"
                disabled={
                  purchaseMutation.isPending ||
                  balanceQuery.isLoading ||
                  balanceQuery.isError ||
                  !hasEnoughCoins
                }
                onClick={() => void confirmPurchase()}
              >
                {purchaseMutation.isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Đang mở khóa...
                  </>
                ) : purchaseMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Đã mở khóa
                  </>
                ) : (
                  <>
                    <LockKeyhole className="h-4 w-4" />
                    Mua và đọc ngay
                  </>
                )}
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link to={`/content/${contentId}`}>Xem thông tin truyện</Link>
            </Button>
          </div>

          {needsDeposit && (
            <p className="text-xs text-muted-foreground">
              Còn thiếu{' '}
              <span className="font-semibold text-foreground">
                {formatCoins(Math.max(priceCoins - (balance ?? 0), 0))} coin
              </span>{' '}
              để mở khóa bộ truyện.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
