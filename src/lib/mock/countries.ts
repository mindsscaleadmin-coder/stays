export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  exchangeRateToAED: number;
  dialCode: string;
  enabled: boolean;
  comingSoon: boolean;
}

export const ALL_COUNTRIES: Country[] = [
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    currency: "AED",
    currencySymbol: "د.إ",
    exchangeRateToAED: 1,
    dialCode: "+971",
    enabled: true,
    comingSoon: false,
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    currency: "SAR",
    currencySymbol: "ر.س",
    exchangeRateToAED: 1.0,
    dialCode: "+966",
    enabled: true,
    comingSoon: false,
  },
  {
    code: "OM",
    name: "Oman",
    flag: "🇴🇲",
    currency: "OMR",
    currencySymbol: "ر.ع.",
    exchangeRateToAED: 9.54,
    dialCode: "+968",
    enabled: false,
    comingSoon: true,
  },
  {
    code: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    currency: "QAR",
    currencySymbol: "ر.ق",
    exchangeRateToAED: 1.0,
    dialCode: "+974",
    enabled: false,
    comingSoon: true,
  },
];

export const ENABLED_COUNTRIES = ALL_COUNTRIES.filter((c) => c.enabled);
export const DEFAULT_COUNTRY = ENABLED_COUNTRIES[0];

export function getCountry(code: string): Country {
  return ALL_COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}
