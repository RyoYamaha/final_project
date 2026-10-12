import { api } from '@/lib/api'

export interface CreateReportDto {
  targetType: 'Content' | 'Chapter' | 'Comment' | 'User'
  targetId: string
  reason: string
  evidence?: string
}

export type ReportStatus = 'Pending' | 'Dismissed' | 'Resolved'

export interface Report {
  id: string
  reporterId: string
  reporter?: {
    id: string
    username: string
  }
  targetType: CreateReportDto['targetType']
  targetId: string
  reason: string
  evidence: string | null
  status: ReportStatus
  createdAt: string
}

export const reportService = {
  createReport: (data: CreateReportDto) => api.post('/reports', data),
  getMyReports: () => api.get<Report[]>('/reports/me'),
  getAllReports: (status?: ReportStatus) =>
    api.get<Report[]>('/admin/reports', { params: status ? { status } : undefined }),
  getReportById: (id: string) => api.get<Report>(`/admin/reports/${id}`),
  dismissReport: (id: string) => api.patch<Report>(`/admin/reports/${id}/dismiss`),
  resolveReport: (id: string) => api.patch<Report>(`/admin/reports/${id}/resolve`),
}
