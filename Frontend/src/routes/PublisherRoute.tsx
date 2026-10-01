import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { api } from '@/lib/api'
import type { Publisher } from '@/types/publisher'

type CheckState =
  | { status: 'loading' }
  | { status: 'not_registered' }
  | { status: 'needs_review'; publisher: Publisher }
  | { status: 'approved' }
  | { status: 'error' }

export function PublisherRoute() {
  const [check, setCheck] = useState<CheckState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    api
      .get<Publisher>('/publisher/me')
      .then((res) => {
        if (cancelled) {
          return
        }
        if (res.data.verificationStatus === 'Approved') {
          setCheck({ status: 'approved' })
        } else {
          setCheck({ status: 'needs_review', publisher: res.data })
        }
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        if (err.response?.status === 404) {
          setCheck({ status: 'not_registered' })
        } else {
          setCheck({ status: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (check.status === 'loading') {
    return <div>Đang kiểm tra quyền Publisher...</div>
  }

  if (check.status === 'not_registered') {
    return <Navigate to="/publisher/register" replace />
  }

  if (check.status === 'needs_review') {
    return <Navigate to="/publisher/status" replace state={{ publisher: check.publisher }} />
  }

  if (check.status === 'error') {
    return <div>Không kiểm tra được trạng thái Publisher. Thử tải lại trang.</div>
  }

  return <Outlet />
}
