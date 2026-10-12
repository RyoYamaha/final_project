import { useQuery } from '@tanstack/react-query'
import { publisherService } from '@/services/publisher.service'

export function Compliance() {
  const contentsQuery = useQuery({
    queryKey: ['publisher-contents'],
    queryFn: () => publisherService.getMyContents().then((res) => res.data),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Copyright & Compliance Center</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý tình trạng bản quyền và giấy phép xuất bản của các tác phẩm.
        </p>
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          {contentsQuery.isLoading && <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
          {contentsQuery.isError && <p className="text-sm text-destructive">Không thể tải danh sách tác phẩm.</p>}
          {contentsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có tác phẩm nào để hiển thị.</p>
          )}

          {contentsQuery.data && contentsQuery.data.length > 0 && (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tên truyện</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Loại bản quyền</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trạng thái phát hành</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Bản quyền</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {contentsQuery.data.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle font-medium">{item.title}</td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                          {item.ownershipTier}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            item.publicationStatus === 'Published'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : item.publicationStatus === 'PendingApproval'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {item.publicationStatus}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          Đã xác minh
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Compliance
