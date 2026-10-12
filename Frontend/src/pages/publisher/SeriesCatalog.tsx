import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { publisherService } from '@/services/publisher.service'
import { Button } from '@/components/ui/button'

export function SeriesCatalog() {
  const { data: contents, isLoading, isError } = useQuery({
    queryKey: ['publisher-contents'],
    queryFn: () => publisherService.getMyContents().then(res => res.data),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý danh mục truyện</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách tất cả các tựa truyện thuộc quyền sở hữu của tổ chức.
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
        {isError && <p className="p-4 text-sm text-destructive">Không thể tải danh sách.</p>}
        {contents?.length === 0 && <p className="p-4 text-sm text-muted-foreground">Chưa có truyện nào được tải lên.</p>}

        {contents && contents.length > 0 && (
          <div className="w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tên truyện</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Loại</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trạng thái</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {contents.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{item.title}</td>
                    <td className="p-4 align-middle">{item.type}</td>
                    <td className="p-4 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.publicationStatus === 'Published'
                            ? 'bg-green-100 text-green-800'
                            : item.publicationStatus === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.publicationStatus}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        {item.publicationStatus === 'Rejected' ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/publisher/catalog/${item.id}/resubmit`}>Nộp lại</Link>
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/content/${item.id}`}>Xem</Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/publisher/content/${item.id}/edit`}>Quản lý / Edit</Link>
                            </Button>
                            <Button size="sm" asChild>
                              <Link to={`/publisher/content/${item.id}/chapters/new`}>Đăng chapter</Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SeriesCatalog
