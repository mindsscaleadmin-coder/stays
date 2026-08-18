export interface SupportedLanguage {
  code: string;
  label: string;
  enabled: boolean;
}

export interface ServiceRegion {
  id: string;
  label: string;
  countryCode: string;
  enabled: boolean;
}

export interface HostFeatureToggles {
  instantBooking: boolean;
  dynamicPricing: boolean;
  hostMessaging: boolean;
  calendarSync: boolean;
  coHostInvites: boolean;
}

/** Strictness rank — higher = less guest-friendly. Hosts cannot exceed max. */
export type CancellationStrictnessId =
  | "flexible"
  | "moderate"
  | "strict"
  | "non-refundable";

export interface HostFeatureBounds {
  /** Host/override commission cannot go below this % */
  commissionFloorPct: number;
  /** Host/override commission cannot go above this % */
  commissionCeilingPct: number;
  /** Hosts cannot pick a cancellation policy stricter than this */
  maxCancellationStrictness: CancellationStrictnessId;
  /** Minimum nightly base price (0 = no floor) */
  minNightlyPrice: number;
  allowWeekendPricing: boolean;
  allowMonthlyPricing: boolean;
  allowSeasonalPricing: boolean;
  allowDiscounts: boolean;
  allowExtraCharges: boolean;
}

export interface PlatformFeatureToggles {
  instantBookingPlatformWide: boolean;
  hostFeatures: HostFeatureToggles;
  hostBounds: HostFeatureBounds;
}

export interface PaymentGatewayConfig {
  provider: string;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  enabled: boolean;
}

export interface EmailProviderConfig {
  provider: string;
  apiKey: string;
  fromAddress: string;
  enabled: boolean;
}

export interface SmsProviderConfig {
  provider: string;
  apiKey: string;
  senderId: string;
  enabled: boolean;
}

export interface MapsApiConfig {
  provider: string;
  apiKey: string;
  enabled: boolean;
}

export interface IntegrationConfig {
  paymentGateway: PaymentGatewayConfig;
  emailProvider: EmailProviderConfig;
  smsProvider: SmsProviderConfig;
  mapsApi: MapsApiConfig;
}

export interface SecuritySettings {
  requireAdmin2FA: boolean;
  sessionTimeoutMinutes: number;
  adminIpWhitelist: string[];
  ipWhitelistEnabled: boolean;
}

export interface GlobalSettings {
  defaultCurrency: string;
  supportedCurrencies: string[];
  supportedLanguages: SupportedLanguage[];
  serviceRegions: ServiceRegion[];
}

export interface PlatformConfig {
  global: GlobalSettings;
  features: PlatformFeatureToggles;
  integrations: IntegrationConfig;
  security: SecuritySettings;
  updatedAt: string;
}

export type HostFeatureKey = keyof HostFeatureToggles;
