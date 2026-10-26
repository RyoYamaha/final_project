import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAppDialog } from '@/components/common/AppDialogProvider'

export function ContentManagement() {
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const { data: contents = [], isLoading, isError } = useQuery({
    queryKey: ['admin-content'],
    queryFn: adminService.getAllContents,
  })
  const hideContent = useMutation({
    mutationFn: adminService.hideContent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-content'] }),
  })
  const publishedContents = contents.filter((content) => content.publicationStatus === 'Published')

  const confirmHideContent = async (contentId: string, title: string) => {
    const confirmed = await confirm({
      title: 'Xác nhận ẩn truyện',
      description: `Ẩn "${title}" khỏi danh sách truyện công khai?`,
      confirmLabel: 'Ẩn truyện',
      tone: 'destructive',
    })
    if (confirmed) hideContent.mutate(contentId)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Truyện đã xuất bản</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách truyện.</p>
      ) : publishedContents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có truyện nào được xuất bản.</p>
      ) : (
        <div className="rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Truyện</th>
                <th className="p-3 font-medium">Uploader</th>
                <th className="p-3 font-medium">Loại</th>
                <th className="p-3 font-medium">Trạng thái</th>
                <th className="p-3 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {publishedContents.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3">{c.uploader?.username || 'N/A'}</td>
                  <td className="p-3">{c.type}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                      {c.publicationStatus}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/content/${c.id}`} state={{ returnTo: '/admin/content/published' }}>
                          Chi tiết
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={hideContent.isPending}
                        onClick={() => void confirmHideContent(c.id, c.title)}
                      >
                        Ẩn truyện
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ContentManagement
