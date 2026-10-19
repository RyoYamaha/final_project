export type PublisherVerificationStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Suspended'

export interface Publisher {
  id: string
  userId: string
  organizationName: string
  verificationDocumentUrl?: string | null
  verificationStatus: PublisherVerificationStatus
}

export interface RegisterPublisherDto {
  organizationName: string
}
