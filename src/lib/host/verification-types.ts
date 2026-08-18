export type HostVerificationStatus = "none" | "pending" | "verified" | "rejected";

export type HostIdDocumentType = "emirates_id" | "passport" | "trade_license";

export interface HostVerificationDocument {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface HostVerificationRequest {
  hostId: string;
  hostName: string;
  hostEmail: string;
  idType: HostIdDocumentType;
  notes: string;
  documents: HostVerificationDocument[];
  status: Exclude<HostVerificationStatus, "none">;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}
