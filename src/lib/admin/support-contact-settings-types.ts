export interface CountrySupportContact {
  countryCode: string;
  phone: string;
  whatsapp: string;
  hoursLabel: string;
  enabled: boolean;
}

export interface SupportContactSettings {
  defaultHoursLabel: string;
  contacts: CountrySupportContact[];
}
