import { api } from '@/lib/api'
import type { LoginResponse, LoginDto, RegisterDto, RegisterPublisherExternalDto } from '@/types/auth'

export const authService = {
  login: (data: LoginDto) => api.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterDto) => api.post<LoginResponse>('/auth/register', data),
  registerPublisherExternal: (data: RegisterPublisherExternalDto, file: File) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => formData.append(key, value))
    formData.append('file', file)
    return api.post<LoginResponse>('/auth/register-publisher', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
}
