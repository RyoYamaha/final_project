import { Navigate, Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { publisherService } from '@/services/publisher.service'


export function PublisherRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['publisher-me'],
    retry: false,
    queryFn: async () => (await publisherService.getMe()).data,
  })

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Đang kiểm tra quyền...</p>

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return <Navigate to="/publisher/register" replace />
    }
    return <p className="p-4 text-sm">Không kiểm tra được quyền Publisher. Thử lại sau.</p>
  }

  if (data && data.verificationStatus !== 'Approved') {
    return <Navigate to="/publisher/status" state={{ publisher: data }} replace />
  }

  return <Outlet />
}

export default PublisherRoute
