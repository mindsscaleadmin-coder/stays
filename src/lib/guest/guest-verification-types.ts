export type GuestVerificationStatus = "none" | "pending" | "verified" | "rejected";

export type GuestIdDocumentType = "emirates_id" | "passport" | "trade_license";

export interface GuestVerificationRequest {
  userId: string;
  idType: GuestIdDocumentType;
  notes: string;
  status: Exclude<GuestVerificationStatus, "none">;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}
