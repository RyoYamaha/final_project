import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold">404</p>
      <p className="text-muted-foreground">Trang bạn tìm không tồn tại.</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Về trang chủ
      </Link>
    </div>
  )
}
export default NotFound
