import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Đã có lỗi không mong muốn xảy ra.'

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-xl font-semibold">Có lỗi xảy ra</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Về trang chủ
      </Link>
    </div>
  )
}
export default RouteError
