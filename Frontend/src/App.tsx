import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { RouterProvider } from 'react-router'
import { router } from '@/routes/router'
import { authService } from '@/services/auth.service'
import { REFRESH_TOKEN_KEY, useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export default function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [restoreError, setRestoreError] = useState(false)
  const hasStartedRestore = useRef(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const restoreSession = useCallback(async () => {
    setRestoreError(false)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      setIsRestoringSession(false)
      return
    }

    try {
      const { data: tokens } = await authService.refresh(refreshToken)
      useAuthStore.getState().setAccessToken(tokens.accessToken)
      const { data: user } = await authService.me()
      setAuth(tokens.accessToken, tokens.refreshToken, user)
      setIsRestoringSession(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        clearAuth()
        setIsRestoringSession(false)
        return
      }
      setRestoreError(true)
      setIsRestoringSession(false)
    }
  }, [clearAuth, setAuth])

  useEffect(() => {
    if (hasStartedRestore.current) return
    hasStartedRestore.current = true
    void restoreSession()
  }, [restoreSession])

  if (isRestoringSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Đang khôi phục phiên đăng nhập...</div>
  }

  if (restoreError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-destructive">Không thể khôi phục phiên. Vui lòng kiểm tra kết nối và thử lại.</p>
        <Button onClick={() => { setIsRestoringSession(true); void restoreSession() }}>Thử lại</Button>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
