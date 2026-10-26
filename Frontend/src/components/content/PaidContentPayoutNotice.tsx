import { Link } from 'react-router'

interface Props {
  isLoading: boolean
  isError: boolean
  isConfigured: boolean
}

export function PaidContentPayoutNotice({
  isLoading,
  isError,
  isConfigured,
}: Props) {
  if (isConfigured) {
    return null
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Đang kiểm tra thông tin tài khoản nhận tiền...
      </p>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600">
        Không thể kiểm tra thông tin tài khoản nhận tiền. Vui lòng thử tải lại
        trang trước khi đăng truyện trả phí.
      </p>
    )
  }

  return (
    <p className="text-sm text-amber-700 dark:text-amber-400">
      Bạn cần khai báo đầy đủ tài khoản ngân hàng nhận tiền trước khi đăng
      truyện trả phí. Hãy hoàn tất tại{' '}
      <Link
        className="font-semibold underline"
        to="/earnings"
        target="_blank"
        rel="noreferrer"
      >
        Doanh thu và rút coin
      </Link>
      .
    </p>
  )
}
