export interface FarmActivity {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  enabled: boolean;
}

export interface FarmProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  unit: string;
  inStock: boolean;
}

export interface WeatherAdvisory {
  id: string;
  date: string;
  severity: "info" | "warning" | "alert";
  title: string;
  message: string;
  affectsActivities: string[];
}

export interface HostAddonsData {
  hostId: string;
  activities: FarmActivity[];
  products: FarmProduct[];
  weatherAdvisories: WeatherAdvisory[];
}
