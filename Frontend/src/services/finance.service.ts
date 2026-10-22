import { api } from '@/lib/api'

export interface WalletBalance {
  balance: number
  updatedAt: string | null
}

export interface WalletTransaction {
  id: string
  amountCoins: number
  balanceAfter: number
  transactionType: string
  sourceType: string
  sourceReference: string
  description: string
  createdAt: string
}

export interface PaymentOrder {
  id: string
  expectedAmount: number
  paidAmount: number | null
  paidCoins: number | null
  status: string
  transferCode: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  qrUrl?: string
  expiresAt: string
  paidAt: string | null
  createdAt: string
  isExpired: boolean
}

export interface CreatedPaymentOrder {
  id: string
  expectedAmount: number
  expectedCoins: number
  status: string
  transferCode: string
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  qrUrl: string
  expiresAt: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface BankSettings {
  configured: boolean
  bankName: string | null
  bankBin: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
}

export interface AdminPaymentOrder {
  id: string
  userId: string
  expectedAmount: number
  transferCode: string
  bankName: string
  bankAccountNumber: string
  expiresAt: string
  createdAt: string
  user: {
    username: string
    email: string
  }
}

export interface AdminBankTransaction {
  id: string
  externalId: string
  paymentOrderId: string | null
  transferAmount: number
  destinationAccountNumber: string | null
  description: string
  processingStatus: string
  adminNote: string | null
  receivedAt: string
  paymentOrder: {
    id: string
    status: string
    expectedAmount: number
    user: {
      id: string
      username: string
      email: string
    }
  } | null
}

export interface RevenueSummary {
  totalSales: number
  totalGrossCoins: number
  totalEarnedCoins: number
  totalPlatformCoins: number
  reservedCoins: number
  availableCoins: number
}

export interface RevenueHistoryItem {
  id: string
  grossCoins: number
  sharePercent: number
  creatorCoins: number
  platformCoins: number
  createdAt: string
  purchase: {
    id: string
    purchasedAt: string
  }
  content: {
    id: string
    title: string
  }
}

export interface PayoutProfile {
  bankName: string
  bankBin: string
  bankAccountNumber: string
  bankAccountName: string
  updatedAt: string
}

export interface PayoutRequest {
  id: string
  userId?: string
  amountCoins: number
  status: 'Pending' | 'Paid' | 'Rejected'
  bankName: string
  bankBin: string
  bankAccountNumber: string
  bankAccountName: string
  requestedAt: string
  processedAt?: string | null
  rejectionReason?: string | null
  user?: {
    username: string
    email: string
  }
}

export const financeService = {
  getWalletBalance: () => api.get<WalletBalance>('/wallet/balance'),
  getWalletTransactions: (page = 1, limit = 20) =>
    api.get<PageResult<WalletTransaction>>('/wallet/transactions', {
      params: { page, limit },
    }),
  createDeposit: (amountVnd: number) =>
    api.post<CreatedPaymentOrder>('/payments/deposits', { amountVnd }),
  getPaymentOrder: (id: string) =>
    api.get<PaymentOrder>(`/payments/${encodeURIComponent(id)}`),

  getBankSettings: () => api.get<BankSettings>('/admin/payment-settings'),
  updateBankSettings: (settings: Omit<BankSettings, 'configured'>) =>
    api.patch<BankSettings>('/admin/payment-settings', settings),
  getAdminPaymentOrders: (page = 1, limit = 50) =>
    api.get<PageResult<AdminPaymentOrder>>('/admin/payments/orders', {
      params: { page, limit },
    }),
  getAdminBankTransactions: (status?: string, page = 1, limit = 50) =>
    api.get<PageResult<AdminBankTransaction>>(
      '/admin/payments/bank-transactions',
      { params: { status, page, limit } },
    ),
  assignBankTransaction: (
    id: string,
    paymentOrderId: string,
    reason: string,
  ) =>
    api.patch(`/admin/payments/bank-transactions/${encodeURIComponent(id)}/assign`, {
      paymentOrderId,
      reason,
    }),
  confirmPaymentOrder: (
    id: string,
    payload: { externalId: string; paidAmount: number; reason: string },
  ) => api.post(`/admin/payments/orders/${encodeURIComponent(id)}/confirm`, payload),

  getRevenueSummary: () => api.get<RevenueSummary>('/revenue/me'),
  getRevenueHistory: (page = 1, limit = 20) =>
    api.get<PageResult<RevenueHistoryItem>>('/revenue/me/history', {
      params: { page, limit },
    }),
  getPayoutMinimum: () => api.get<number>('/payout/minimum'),
  getPayoutProfile: () =>
    api.get<{ configured: boolean; profile: PayoutProfile | null }>(
      '/payout/profile',
    ),
  updatePayoutProfile: (
    profile: Omit<PayoutProfile, 'updatedAt'>,
  ) => api.put<PayoutProfile>('/payout/profile', profile),
  getMyPayoutRequests: (page = 1, limit = 20) =>
    api.get<PageResult<PayoutRequest>>('/payout/requests', {
      params: { page, limit },
    }),
  createPayoutRequest: (amountCoins: number) =>
    api.post<PayoutRequest>('/payout/requests', { amountCoins }),

  getAdminPayoutRequests: (page = 1, limit = 50) =>
    api.get<PageResult<PayoutRequest>>('/admin/payout/requests', {
      params: { page, limit },
    }),
  markPayoutPaid: (id: string) =>
    api.patch(`/admin/payout/requests/${encodeURIComponent(id)}/paid`),
  rejectPayout: (id: string, reason: string) =>
    api.patch(`/admin/payout/requests/${encodeURIComponent(id)}/reject`, {
      reason,
    }),
  getAdminPayoutMinimum: () => api.get<number>('/admin/payout/settings'),
  updateAdminPayoutMinimum: (minimumCoins: number) =>
    api.patch('/admin/payout/settings', { minimumCoins }),
  setPayoutBlocked: (userId: string, payoutBlocked: boolean) =>
    api.patch(`/admin/payout/users/${encodeURIComponent(userId)}/block`, {
      payoutBlocked,
    }),
}
