/** Admin-managed API keys / credentials for external services. */
export interface ApiIntegration {
  id: string;
  /** Display name, e.g. "Google Maps" */
  name: string;
  /** Short description of what the key powers */
  description: string;
  /** Field label for the credential, e.g. "API key", "Publishable key" */
  fieldLabel: string;
  /** Optional docs URL for where to obtain the key */
  docsUrl?: string;
  /** Stored credential value (demo: plain text in localStorage) */
  value: string;
  /** When false the integration is treated as disabled even if a key is set */
  enabled: boolean;
  /** Built-in defaults cannot be deleted, only edited/cleared */
  builtIn?: boolean;
}

export type ApiIntegrationInput = Omit<ApiIntegration, "id" | "builtIn"> & {
  id?: string;
};

/** Seed integrations shown until an admin customizes the catalog. */
export const DEFAULT_API_INTEGRATIONS: ApiIntegration[] = [
  {
    id: "google-maps",
    name: "Google Maps",
    description: "Maps embeds, geocoding, and place autocomplete on listings.",
    fieldLabel: "API key",
    docsUrl: "https://console.cloud.google.com/google/maps-apis/credentials",
    value: "",
    enabled: true,
    builtIn: true,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "GA4 measurement ID for site traffic analytics.",
    fieldLabel: "Measurement ID",
    docsUrl: "https://analytics.google.com/",
    value: "",
    enabled: true,
    builtIn: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment processing for bookings and host payouts.",
    fieldLabel: "Publishable key",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    value: "",
    enabled: true,
    builtIn: true,
  },
  {
    id: "mapbox",
    name: "Mapbox",
    description: "Alternative map tiles and geolocation services.",
    fieldLabel: "Access token",
    docsUrl: "https://account.mapbox.com/access-tokens/",
    value: "",
    enabled: false,
    builtIn: true,
  },
  {
    id: "recaptcha",
    name: "Google reCAPTCHA",
    description: "Bot protection on signup and contact forms.",
    fieldLabel: "Site key",
    docsUrl: "https://www.google.com/recaptcha/admin",
    value: "",
    enabled: false,
    builtIn: true,
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Transactional email delivery (bookings, notifications).",
    fieldLabel: "API key",
    docsUrl: "https://app.sendgrid.com/settings/api_keys",
    value: "",
    enabled: false,
    builtIn: true,
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "SMS / WhatsApp notifications to guests and hosts.",
    fieldLabel: "Auth token",
    docsUrl: "https://console.twilio.com/",
    value: "",
    enabled: false,
    builtIn: true,
  },
];
