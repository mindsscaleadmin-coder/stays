export interface FarmCertification {
  id: string;
  label: string;
  description: string;
  status: "verified" | "pending" | "none" | "rejected";
  verifiedAt?: string;
  submittedAt?: string;
  documentName?: string;
  reviewNote?: string;
}

export interface SafetyCheckItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export interface HostTrustData {
  hostId: string;
  certifications: FarmCertification[];
  safetyChecklist: SafetyCheckItem[];
}
