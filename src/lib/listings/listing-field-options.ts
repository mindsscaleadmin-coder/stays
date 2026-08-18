export const LISTING_AMENITY_OPTIONS = [
  "Free WiFi",
  "Free Parking",
  "Private Pool",
  "BBQ Area",
  "Farm Activities",
  "Breakfast Incl.",
  "Air Conditioning",
  "Smart TV",
  "Kitchen",
  "Washing Machine",
  "Pet Friendly",
  "Mountain View",
  "Garden",
  "Outdoor Seating",
] as const;

export const FARM_TYPE_OPTIONS = [
  "Organic farm",
  "Livestock farm",
  "Crop farm",
  "Mixed farm",
  "Vineyard",
  "Orchard",
  "Dairy farm",
  "Desert farm camp",
  "Heritage homestead",
] as const;

export const FARM_ACTIVITY_OPTIONS = [
  "Harvesting",
  "Milking",
  "Farm walks",
  "Cooking classes",
  "Fruit picking",
  "Animal feeding",
  "Horse riding",
  "BBQ evenings",
  "Organic gardening",
  "Bird watching",
] as const;

export const DEFAULT_HOUSE_RULES = [
  { title: "Check-in", description: "From 3:00 PM. Early check-in subject to availability." },
  { title: "Check-out", description: "Before 11:00 AM. Late check-out may incur extra charges." },
  {
    title: "Cancellation",
    description: "Free cancellation up to 7 days before arrival. 50% refund within 7 days.",
  },
  {
    title: "House Rules",
    description: "No smoking indoors. Pets allowed on request. Quiet hours after 10 PM.",
  },
] as const;
