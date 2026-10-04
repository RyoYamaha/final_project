import type { JwtPayload } from '@/types/auth'

export function decodeJwtPayload(token: string): JwtPayload {
  const part = token.split('.')[1]
  if (!part) throw new Error('Invalid token')
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload
}
