// ==========================================
// 1. VAI TRÒ NGƯỜI DÙNG (ROLES)
// ==========================================

export type Role = 'Reader' | 'Author' | 'Publisher' | 'Admin'

// ==========================================
// 2. THÔNG TIN NGƯỜI DÙNG (USER & TOKEN)
// ==========================================

export interface User {
  id: string
  role: Role
  username?: string
  email?: string
  bio?: string | null
}

export interface JwtPayload {
  sub: string
  role: Role
  iat?: number
  exp?: number
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

// ==========================================
// 3. DỮ LIỆU ĐĂNG NHẬP / ĐĂNG KÝ (DTO)
// ==========================================

export interface LoginDto {
  usernameOrEmail: string
  password: string
}

export interface RegisterDto {
  username: string
  email: string
  password: string
}
