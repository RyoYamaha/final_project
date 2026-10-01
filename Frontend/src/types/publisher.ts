export type PublisherVerificationStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Suspended'

export interface Publisher {
  id: string
  userId: string
  organizationName: string
  verificationStatus: PublisherVerificationStatus
}
