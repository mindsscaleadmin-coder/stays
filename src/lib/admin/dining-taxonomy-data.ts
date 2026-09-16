import type { Category, ExtraFilter, ParentCategory, Subcategory } from "./taxonomy-types";

/** Dining parent — `p-dining` avoids legacy `p4` → Events migration. */
export const DINING_PARENT_ID = "p-dining";

export const DINING_PARENT: ParentCategory = {
  id: DINING_PARENT_ID,
  name: "Dining",
};

export const DINING_CATEGORIES: Category[] = [
  { id: "cat-din-restaurant", name: "Restaurants", parentId: DINING_PARENT_ID },
  { id: "cat-din-cafe", name: "Cafés & Coffee Shops", parentId: DINING_PARENT_ID },
  { id: "cat-din-bar", name: "Bars & Lounges", parentId: DINING_PARENT_ID },
  { id: "cat-din-private", name: "Private Dining", parentId: DINING_PARENT_ID },
  { id: "cat-din-experience", name: "Dining Experiences", parentId: DINING_PARENT_ID },
  { id: "cat-din-outdoor", name: "Outdoor & Destination Dining", parentId: DINING_PARENT_ID },
];

export const DINING_SUBCATEGORIES: Subcategory[] = [
  // Restaurants
  {
    id: "sc-din-rest-fine",
    name: "Fine Dining Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-casual",
    name: "Casual Dining Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-family",
    name: "Family Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-buffet",
    name: "Buffet Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-specialty",
    name: "Specialty Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-themed",
    name: "Themed Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-hotel",
    name: "Hotel Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  {
    id: "sc-din-rest-resort",
    name: "Resort Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-restaurant",
  },
  // Cafés & Coffee Shops
  {
    id: "sc-din-cafe-cafe",
    name: "Café",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-cafe",
  },
  {
    id: "sc-din-cafe-coffee",
    name: "Coffee Shop",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-cafe",
  },
  {
    id: "sc-din-cafe-specialty",
    name: "Specialty Coffee Shop",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-cafe",
  },
  {
    id: "sc-din-cafe-tea",
    name: "Tea House",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-cafe",
  },
  {
    id: "sc-din-cafe-brunch",
    name: "Brunch Café",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-cafe",
  },
  {
    id: "sc-din-cafe-dessert",
    name: "Dessert Café",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-cafe",
  },
  // Bars & Lounges
  {
    id: "sc-din-bar-lounge",
    name: "Lounge",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-bar",
  },
  {
    id: "sc-din-bar-cocktail",
    name: "Cocktail Bar",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-bar",
  },
  {
    id: "sc-din-bar-sports",
    name: "Sports Bar",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-bar",
  },
  {
    id: "sc-din-bar-shisha",
    name: "Shisha Lounge",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-bar",
  },
  {
    id: "sc-din-bar-live",
    name: "Live Music Lounge",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-bar",
  },
  // Private Dining
  {
    id: "sc-din-priv-room",
    name: "Private Dining Room",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-private",
  },
  {
    id: "sc-din-priv-restaurant",
    name: "Private Restaurant",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-private",
  },
  {
    id: "sc-din-priv-chef",
    name: "Chef's Table",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-private",
  },
  {
    id: "sc-din-priv-vip",
    name: "VIP Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-private",
  },
  {
    id: "sc-din-priv-exclusive",
    name: "Exclusive Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-private",
  },
  // Dining Experiences
  {
    id: "sc-din-exp-dinner-show",
    name: "Dinner Show",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-live-music",
    name: "Live Music Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-chef",
    name: "Chef Experience",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-tasting",
    name: "Tasting Experience",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-cultural",
    name: "Cultural Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-romantic",
    name: "Romantic Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-sunset",
    name: "Sunset Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-cruise",
    name: "Dinner Cruise",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  {
    id: "sc-din-exp-floating",
    name: "Floating Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-experience",
  },
  // Outdoor & Destination Dining
  {
    id: "sc-din-out-beach",
    name: "Beach Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-rooftop",
    name: "Rooftop Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-garden",
    name: "Garden Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-waterfront",
    name: "Waterfront Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-poolside",
    name: "Poolside Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-farm",
    name: "Farm Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-scenic",
    name: "Scenic Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
  {
    id: "sc-din-out-desert",
    name: "Desert Dining",
    parentId: DINING_PARENT_ID,
    categoryId: "cat-din-outdoor",
  },
];

export const DINING_EXTRA_TABS = [
  { id: "diningSetting", label: "Setting", listingSection: "venueDetails" as const },
  { id: "diningCuisine", label: "Cuisine", listingSection: "venueDetails" as const },
  { id: "diningMeal", label: "Meal service", listingSection: "venueDetails" as const },
  { id: "diningDietary", label: "Dietary", listingSection: "venueDetails" as const },
  { id: "diningFoodStyle", label: "Food style", listingSection: "venueDetails" as const },
  { id: "diningAtmosphere", label: "Atmosphere", listingSection: "venueDetails" as const },
  { id: "diningAmenity", label: "Amenities", listingSection: "venueOptions" as const },
  { id: "diningParking", label: "Parking", listingSection: "venueOptions" as const },
  { id: "diningRule", label: "Rules", listingSection: "venueOptions" as const },
];

export const DINING_EXTRA_FILTERS: ExtraFilter[] = [
  // Setting
  { id: "din-ef1", name: "Rooftop", type: "diningSetting", parentId: DINING_PARENT_ID },
  { id: "din-ef2", name: "Garden", type: "diningSetting", parentId: DINING_PARENT_ID },
  { id: "din-ef3", name: "Waterfront", type: "diningSetting", parentId: DINING_PARENT_ID },
  { id: "din-ef4", name: "Beach", type: "diningSetting", parentId: DINING_PARENT_ID },
  { id: "din-ef5", name: "Poolside", type: "diningSetting", parentId: DINING_PARENT_ID },
  { id: "din-ef6", name: "Indoor", type: "diningSetting", parentId: DINING_PARENT_ID },
  { id: "din-ef7", name: "Outdoor", type: "diningSetting", parentId: DINING_PARENT_ID },
  // Cuisine
  { id: "din-ef8", name: "Arabic", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef9", name: "Lebanese", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef10", name: "Italian", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef11", name: "Indian", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef12", name: "Asian", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef13", name: "Western", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef14", name: "Seafood", type: "diningCuisine", parentId: DINING_PARENT_ID },
  { id: "din-ef15", name: "BBQ / Grill", type: "diningCuisine", parentId: DINING_PARENT_ID },
  // Meal service
  { id: "din-ef16", name: "Breakfast", type: "diningMeal", parentId: DINING_PARENT_ID },
  { id: "din-ef17", name: "Lunch", type: "diningMeal", parentId: DINING_PARENT_ID },
  { id: "din-ef18", name: "Dinner", type: "diningMeal", parentId: DINING_PARENT_ID },
  { id: "din-ef19", name: "Brunch", type: "diningMeal", parentId: DINING_PARENT_ID },
  { id: "din-ef20", name: "All-day dining", type: "diningMeal", parentId: DINING_PARENT_ID },
  { id: "din-ef20b", name: "Late-night", type: "diningMeal", parentId: DINING_PARENT_ID },
  // Dietary
  { id: "din-ef21", name: "Halal", type: "diningDietary", parentId: DINING_PARENT_ID },
  { id: "din-ef22", name: "Vegetarian", type: "diningDietary", parentId: DINING_PARENT_ID },
  { id: "din-ef23", name: "Vegan", type: "diningDietary", parentId: DINING_PARENT_ID },
  { id: "din-ef23b", name: "Gluten-free", type: "diningDietary", parentId: DINING_PARENT_ID },
  { id: "din-ef23c", name: "Dairy-free", type: "diningDietary", parentId: DINING_PARENT_ID },
  { id: "din-ef23d", name: "Jain", type: "diningDietary", parentId: DINING_PARENT_ID },
  // Food style
  { id: "din-ef35", name: "À la carte", type: "diningFoodStyle", parentId: DINING_PARENT_ID },
  { id: "din-ef36", name: "Buffet", type: "diningFoodStyle", parentId: DINING_PARENT_ID },
  { id: "din-ef37", name: "Set menu", type: "diningFoodStyle", parentId: DINING_PARENT_ID },
  { id: "din-ef38", name: "Tasting menu", type: "diningFoodStyle", parentId: DINING_PARENT_ID },
  { id: "din-ef39", name: "Sharing menu", type: "diningFoodStyle", parentId: DINING_PARENT_ID },
  // Atmosphere
  { id: "din-ef24", name: "Casual", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24b", name: "Elegant", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24c", name: "Luxury", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef27", name: "Romantic", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  {
    id: "din-ef26",
    name: "Family-friendly",
    type: "diningAtmosphere",
    parentId: DINING_PARENT_ID,
  },
  { id: "din-ef24d", name: "Modern", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24e", name: "Traditional", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24f", name: "Cozy", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24g", name: "Vibrant", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24h", name: "Quiet", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24i", name: "Business", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24j", name: "Waterfront", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef24k", name: "Scenic", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef25", name: "Live music", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  { id: "din-ef25b", name: "Shisha", type: "diningAtmosphere", parentId: DINING_PARENT_ID },
  // Amenities
  { id: "din-ef40", name: "Wi-Fi", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef41", name: "Air conditioning", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef42", name: "Private dining", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef43", name: "Wheelchair accessible", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef44", name: "High chairs", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef45", name: "Baby changing", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef46", name: "Restrooms", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef47", name: "Charging points", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef48", name: "Entertainment", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef49", name: "Smoking area", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef50", name: "Non-smoking", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef51", name: "Pet-friendly", type: "diningAmenity", parentId: DINING_PARENT_ID },
  { id: "din-ef52", name: "Prayer room", type: "diningAmenity", parentId: DINING_PARENT_ID },
  // Parking
  { id: "din-ef28", name: "Parking available", type: "diningParking", parentId: DINING_PARENT_ID },
  { id: "din-ef29", name: "Valet parking", type: "diningParking", parentId: DINING_PARENT_ID },
  { id: "din-ef29b", name: "Paid parking nearby", type: "diningParking", parentId: DINING_PARENT_ID },
  { id: "din-ef29c", name: "Street parking", type: "diningParking", parentId: DINING_PARENT_ID },
  { id: "din-ef29d", name: "No parking", type: "diningParking", parentId: DINING_PARENT_ID },
  // Rules
  { id: "din-ef30", name: "Alcohol allowed", type: "diningRule", parentId: DINING_PARENT_ID },
  { id: "din-ef31", name: "Smoking allowed", type: "diningRule", parentId: DINING_PARENT_ID },
  { id: "din-ef32", name: "Kids welcome", type: "diningRule", parentId: DINING_PARENT_ID },
];
