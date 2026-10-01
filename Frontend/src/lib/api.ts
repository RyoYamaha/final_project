import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

// Mở rộng kiểu request của axios để hỗ trợ cờ retry
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// ==========================================
// 1. KHỞI TẠO AXIOS INSTANCE
// ==========================================

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==========================================
// 2. REQUEST INTERCEPTOR: TỰ ĐỘNG GẮN TOKEN
// ==========================================

api.interceptors.request.use(
  (config) => {
    // Lấy accessToken từ memory trong authStore
    const token = useAuthStore.getState().accessToken

    // Nếu có token, tự động gắn vào Header Authorization
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ==========================================
// 3. RESPONSE INTERCEPTOR: TỰ ĐỘNG REFRESH KHI 401
// ==========================================

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  // Thành công: trả về kết quả
  (response) => response,

  // Khi gặp lỗi từ server
  async (error) => {
    const originalRequest = error.config as RetryableRequest

    // Kiểm tra lỗi 401 và request chưa được thử lại lần nào
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Bỏ qua nếu chính API đăng nhập hoặc refresh bị lỗi 401 (tránh lặp vô hạn)
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error)
      }

      // Nếu đang trong quá trình refresh token, cho request này vào hàng chờ
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      // Đọc refreshToken từ localStorage thông qua store
      const refreshToken = useAuthStore.getState().getRefreshToken()

      if (!refreshToken) {
        useAuthStore.getState().clearAuth()
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        // Dùng axios riêng để gọi API refresh token
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        )

        const { accessToken, refreshToken: newRefreshToken } = response.data

        // Cập nhật accessToken mới vào memory store
        useAuthStore.getState().setAccessToken(accessToken)

        // Nếu có refresh token mới trả về thì lưu thông qua action của store
        if (newRefreshToken) {
          useAuthStore.getState().setRefreshToken(newRefreshToken)
        }

        // Báo cho các request đang đợi trong hàng chờ chạy tiếp
        processQueue(null, accessToken)

        // Gửi lại request ban đầu với accessToken mới
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh thất bại (token hết hạn hẳn) -> xoá phiên đăng nhập
        processQueue(refreshError, null)
        useAuthStore.getState().clearAuth()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
