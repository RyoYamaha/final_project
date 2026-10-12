import { api } from '@/lib/api'
import type { LoginResponse, LoginDto, RegisterDto } from '@/types/auth'

export const authService = {
  login: (data: LoginDto) => api.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterDto) => api.post<LoginResponse>('/auth/register', data),
  registerPublisherExternal: (data: any) => api.post<LoginResponse>('/auth/register-publisher', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
}
