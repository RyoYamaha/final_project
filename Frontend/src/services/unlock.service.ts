import { api } from '@/lib/api'

export interface ContentAccess {
  contentId: string
  isFree: boolean
  priceCoins: number
  freeChapters: number
  isOwned: boolean
  purchase: {
    purchasedAt: string
    priceCoins: number
  } | null
}

export interface ContentPurchaseResult {
  purchase: {
    id: string
    contentId: string
    priceCoins: number
    purchasedAt: string
  }
  alreadyOwned: boolean
  balance: number
}

export const unlockService = {
  getContentAccess: (contentId: string) =>
    api.get<ContentAccess>(`/unlock/content/${encodeURIComponent(contentId)}`),
  purchaseContent: (contentId: string) =>
    api.post<ContentPurchaseResult>(
      `/unlock/content/${encodeURIComponent(contentId)}/purchase`,
    ),
}
