import { useQuery } from '@tanstack/react-query'
import { publisherService } from '@/services/publisher.service'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockReadershipData = [
  { date: 'Aug 01', views: 4000, bookmarks: 2400 },
  { date: 'Aug 05', views: 3000, bookmarks: 1398 },
  { date: 'Aug 10', views: 2000, bookmarks: 9800 },
  { date: 'Aug 15', views: 2780, bookmarks: 3908 },
  { date: 'Aug 20', views: 1890, bookmarks: 4800 },
  { date: 'Aug 25', views: 2390, bookmarks: 3800 },
  { date: 'Aug 30', views: 3490, bookmarks: 4300 },
]

const mockTopTitles = [
  { name: 'Solo Leveling', views: 12450 },
  { name: 'Omniscient Reader', title: 'Omniscient Reader', views: 8520 },
  { label: 'The Last Moon', views: 5320 },
]

export function PublisherDashboard() {
  const { data: contents, isLoading } = useQuery({
    queryKey: ['publisher-contents'],
    queryFn: () => publisherService.getMyContents().then(res => res.data),
  })

  const totalSeries = contents?.length || 0
  const publishedCount = contents?.filter(c => c.publicationStatus === 'Published').length || 0
  const pendingCount = contents?.filter(c => c.publicationStatus === 'PendingApproval').length || 0
  const rejectedCount = contents?.filter(c => c.publicationStatus === 'Rejected').length || 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Bảng điều khiển Nhà xuất bản</h1>
      
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải thống kê...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Tổng số truyện</p>
            <p className="mt-2 text-3xl font-bold">{totalSeries}</p>
          </div>
          <div className="rounded-lg border p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Đang xuất bản</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{publishedCount}</p>
          </div>
          <div className="rounded-lg border p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Chờ duyệt</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="rounded-lg border p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Bị từ chối</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{rejectedCount}</p>
          </div>
        </div>
      )}
      
      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold leading-none tracking-tight mb-4">Readership Trends Over Time</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockReadershipData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
                <Line type="monotone" dataKey="bookmarks" stroke="#82ca9d" name="Bookmarks" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold leading-none tracking-tight mb-4">Top Performing Titles (Views)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopTitles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="views" fill="#8884d8" name="Views" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublisherDashboard
