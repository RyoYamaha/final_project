import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publisherService } from '@/services/publisher.service'
import { Button } from '@/components/ui/button'

export function ResubmitSeries() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => publisherService.resubmitContent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publisher-contents'] })
      navigate('/publisher/catalog')
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi nộp lại phê duyệt.')
    },
  })

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">Kháng nghị / Nộp lại phê duyệt</h1>
        <p className="text-sm text-muted-foreground">
          Sử dụng chức năng này để yêu cầu ban quản trị xem xét lại tác phẩm đã bị từ chối.
        </p>
      </div>

      <div className="rounded-lg border p-6 shadow-sm space-y-4 bg-card">
        <p className="text-sm">
          Vui lòng chắc chắn rằng bạn đã khắc phục các vi phạm dẫn đến việc bị từ chối trước khi nộp lại. Ban quản trị sẽ tiến hành thẩm định lại nội dung và giấy phép.
        </p>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/publisher/catalog')}>
            Quay lại
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu xét duyệt'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ResubmitSeries
