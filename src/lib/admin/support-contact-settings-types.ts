export interface CountrySupportContact {
  countryCode: string;
  phone: string;
  hoursLabel: string;
  enabled: boolean;
}

export interface SupportContactSettings {
  defaultHoursLabel: string;
  contacts: CountrySupportContact[];
}
