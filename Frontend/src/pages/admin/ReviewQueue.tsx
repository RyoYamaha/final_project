import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { Button } from '@/components/ui/button'
import type { ContentListItem } from '@/types/content'

type Tab = 'content' | 'publisher'

export function ReviewQueue() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('content')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading: isQueueLoading, isError: isQueueError, refetch: refetchQueue } = useQuery({
    queryKey: ['admin-review-queue'],
    queryFn: adminService.getReviewQueue,
  })
  const {
    data: allContents = [],
    isLoading: isContentsLoading,
    isError: isContentsError,
    refetch: refetchContents,
  } = useQuery({
    queryKey: ['admin-content'],
    queryFn: adminService.getAllContents,
  })

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      setError(null)
      qc.invalidateQueries({ queryKey: ['admin-review-queue'] })
      qc.invalidateQueries({ queryKey: ['admin-content'] })
      qc.invalidateQueries({ queryKey: ['contents'] }) // Home phải thấy truyện mới duyệt
      qc.invalidateQueries({ queryKey: ['content'] })
      qc.invalidateQueries({ queryKey: ['admin-content-detail'] })
    },
    onError: () => setError('Thao tác thất bại. Mục này có thể đã được xử lý, hãy tải lại.'),
  })

  const reject = (label: string, fn: () => Promise<unknown>) => {
    if (window.confirm(`Từ chối "${label}"? Hệ thống chưa lưu lý do từ chối.`)) act.mutate(fn)
  }

  const content = allContents.filter((item: ContentListItem) => item.publicationStatus !== 'Published')
  const publishers = data?.pendingPublisher ?? []
  const isLoading = isQueueLoading || isContentsLoading
  const isError = isQueueError || isContentsError

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Truyện chưa xuất bản</h1>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === 'content' ? 'default' : 'outline'} onClick={() => setTab('content')}>
          Truyện ({content.length})
        </Button>
        <Button size="sm" variant={tab === 'publisher' ? 'default' : 'outline'} onClick={() => setTab('publisher')}>
          Publisher ({publishers.length})
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {isError && (
        <p className="text-sm">
          Không tải được hàng chờ.{' '}
          <button className="underline" onClick={() => { refetchQueue(); refetchContents() }}>
            Thử lại
          </button>
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isLoading && !isError && tab === 'content' && (
        <>
          {content.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có truyện chưa xuất bản.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 font-medium">Truyện</th>
                    <th className="p-3 font-medium">Người đăng</th>
                    <th className="p-3 font-medium">Loại</th>
                    <th className="p-3 font-medium">Trạng thái</th>
                    <th className="p-3 text-right font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {content.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="p-3 font-medium">{c.title}</td>
                      <td className="p-3">{c.uploader?.username || 'N/A'}</td>
                      <td className="p-3">{c.type}</td>
                      <td className="p-3">{c.publicationStatus}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/admin/content/${c.id}`} state={{ returnTo: '/admin/content/unpublished' }}>
                              Chi tiết
                            </Link>
                          </Button>
                          {c.publicationStatus === 'PendingApproval' && (
                            <>
                              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate(() => adminService.approveContent(c.id))}>
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                              >
                                <Link to={`/admin/content/${c.id}`} state={{ returnTo: '/admin/content/unpublished' }}>
                                  Từ chối
                                </Link>
                              </Button>
                            </>
                          )}
                          {c.publicationStatus === 'Hidden' && (
                            <Button size="sm" disabled={act.isPending} onClick={() => act.mutate(() => adminService.restoreContent(c.id))}>
                              Khôi phục
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {data && tab === 'publisher' && (
        <>
          {publishers.length === 0 && <p className="text-sm text-muted-foreground">Không có Publisher chờ duyệt.</p>}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {publishers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold">{p.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.user ? `${p.user.username} · ${p.user.email}` : p.userId}
                  </p>
                  {(p.contactEmail || p.taxId || p.websiteUrl) && (
                    <p className="text-xs text-muted-foreground">
                      {[p.contactEmail, p.taxId && `MST ${p.taxId}`, p.websiteUrl].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {p.verificationDocumentUrl ? (
                    <a
                      href={p.verificationDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={/\.pdf(?:$|[?#])/i.test(p.verificationDocumentUrl) ? true : undefined}
                      className="mt-1 inline-flex text-xs font-medium text-primary underline"
                    >
                      {/\.pdf(?:$|[?#])/i.test(p.verificationDocumentUrl)
                        ? 'Tải giấy tờ PDF để kiểm tra'
                        : 'Xem giấy tờ xác minh'}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-destructive">Chưa có giấy tờ xác minh</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" disabled={act.isPending} onClick={() => act.mutate(() => adminService.verifyPublisher(p.id))}>
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() => reject(p.organizationName, () => adminService.rejectPublisher(p.id))}
                  >
                    Từ chối
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

    </div>
  )
}
export default ReviewQueue
