import { create } from 'zustand'
import type { User } from '@/types/auth'

const REFRESH_TOKEN_KEY = 'refresh_token'

interface AuthState {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: User) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
  getRefreshToken: () => string | null
  setRefreshToken: (refreshToken: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // 1. Dữ liệu trong MEMORY (tắt tab hoặc F5 sẽ tạm thời về null)
  accessToken: null,
  user: null,
  isAuthenticated: false,
  // 2. KHI ĐĂNG NHẬP THÀNH CÔNG:
  // - Lưu accessToken và user vào MEMORY
  // - Ghi refreshToken vào LOCALSTORAGE
  setAuth: (accessToken: string, refreshToken: string, user: User) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    set({
      accessToken,
      user,
      isAuthenticated: true,
    })
  },

  // 3. KHI CẤP LẠI TOKEN MỚI (sau khi tự động refresh thành công):
  setAccessToken: (accessToken: string) => {
    set({
      accessToken,
      isAuthenticated: true,
    })
  },

  // Cập nhật refreshToken mới vào LOCALSTORAGE khi token rotation xảy ra
  setRefreshToken: (refreshToken: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },

  // 4. KHI ĐĂNG XUẤT:
  // - Xoá MEMORY
  // - Xoá sạch refreshToken khỏi LOCALSTORAGE
  clearAuth: () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    })
  },

  // 5. HÀM ĐỌC refreshToken từ LOCALSTORAGE (để file api.ts dùng)
  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
}))
