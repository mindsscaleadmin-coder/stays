export type AdminAlertCategory =
  | "host_signup"
  | "flagged_content"
  | "high_value_tx"
  | "system_health"
  | "host_payment";

export type AdminAlertSeverity = "info" | "warning" | "critical";

export type SystemServiceStatus = "operational" | "degraded" | "down";

export interface AdminAlert {
  id: string;
  category: AdminAlertCategory;
  severity: AdminAlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
  href?: string;
  /** Stable key for deduping synced alerts */
  sourceKey: string;
}

export interface SystemHealthStatus {
  paymentGateway: SystemServiceStatus;
  emailService: SystemServiceStatus;
  smsService: SystemServiceStatus;
  lastCheckedAt: string;
}

export interface AdminAlertSettings {
  highValueThresholdAed: number;
  newHostSignupDays: number;
  enabledCategories: Record<AdminAlertCategory, boolean>;
  systemHealth: SystemHealthStatus;
}

export interface AdminAlertsState {
  settings: AdminAlertSettings;
  dismissedSourceKeys: string[];
  readSourceKeys: string[];
}
