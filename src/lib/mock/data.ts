export const STAYS = [
  {
    id: "1",
    name: "Green Valley Farmhouse",
    location: "Al Ain, Abu Dhabi, UAE",
    price: 950,
    originalPrice: 1260,
    rating: 4.9,
    reviews: 128,
    guests: 6,
    beds: 2,
    baths: 2,
    badge: "Top Rated",
    badgeColor: "bg-amber-500",
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Farmhouse",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: true,
    amenities: ["Private Pool", "BBQ Area", "Pet Friendly", "Free WiFi", "Free Parking", "Farm Activities"],
  },
  {
    id: "2",
    name: "Mountain View Farm Villa",
    location: "Ras Al Khaimah, UAE",
    price: 1400,
    rating: 4.9,
    reviews: 89,
    guests: 10,
    beds: 5,
    baths: 4,
    badge: "Top Rated",
    badgeColor: "bg-green-600",
    img: "https://images.unsplash.com/photo-1657383543368-7d929944be6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Hills",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: false,
    amenities: ["Mountain View", "Private Pool", "BBQ Area"],
  },
  {
    id: "3",
    name: "Desert Oasis Farm Stay",
    location: "Al Dhafra, Abu Dhabi, UAE",
    price: 800,
    rating: 4.7,
    reviews: 67,
    guests: 6,
    beds: 3,
    baths: 2,
    badge: "Popular",
    badgeColor: "bg-amber-500",
    img: "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Desert",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: true,
    amenities: ["Desert View", "Camel Riding", "BBQ Area"],
  },
  {
    id: "4",
    name: "Al Rawda Luxury Farm",
    location: "Dubai, UAE",
    price: 2500,
    rating: 5.0,
    reviews: 43,
    guests: 12,
    beds: 6,
    baths: 5,
    badge: "Luxury",
    badgeColor: "bg-purple-600",
    img: "https://images.unsplash.com/photo-1707189856923-46dd41ea2bdc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Luxury",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: true,
    amenities: ["Private Pool", "Spa", "Chef Service"],
  },
  {
    id: "5",
    name: "Sunset Penthouse Farm",
    location: "Fujairah, UAE",
    price: 1100,
    originalPrice: 1375,
    rating: 4.6,
    reviews: 55,
    guests: 6,
    beds: 3,
    baths: 2,
    badge: "Deal",
    badgeColor: "bg-red-500",
    img: "https://images.unsplash.com/photo-1767465836888-16803db9db8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Hills",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: false,
    amenities: ["Sea View", "Private Pool"],
  },
  {
    id: "6",
    name: "Al Raha Farm Estate",
    location: "Abu Dhabi, UAE",
    price: 1800,
    rating: 4.8,
    reviews: 38,
    guests: 10,
    beds: 5,
    baths: 4,
    badge: "New",
    badgeColor: "bg-blue-500",
    img: "https://images.unsplash.com/photo-1743510935745-b0cd869db5e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Luxury",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: true,
    amenities: ["Private Pool", "Garden", "BBQ Area"],
  },
  {
    id: "7",
    name: "Spice Garden Cottage",
    location: "Hatta, Dubai, UAE",
    price: 650,
    rating: 4.7,
    reviews: 91,
    guests: 4,
    beds: 2,
    baths: 1,
    badge: "Popular",
    badgeColor: "bg-amber-500",
    img: "https://images.unsplash.com/photo-1760648998657-bf3e8e8a380f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Mountain",
    type: "homestay" as const,
    parentCategory: "Stays",
    instantBook: true,
    amenities: ["Mountain View", "Hiking", "BBQ Area"],
  },
  {
    id: "8",
    name: "Heritage Palm Farm",
    location: "Liwa, Abu Dhabi, UAE",
    price: 950,
    rating: 4.9,
    reviews: 72,
    guests: 6,
    beds: 3,
    baths: 2,
    badge: "Top Rated",
    badgeColor: "bg-green-600",
    img: "https://images.unsplash.com/photo-1775923293081-598283c494bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Desert",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: false,
    amenities: ["Date Palm Grove", "Desert Safari", "BBQ Area"],
  },
  {
    id: "9",
    name: "Najd Desert Farmstay",
    location: "Riyadh, Saudi Arabia",
    price: 1100,
    rating: 4.8,
    reviews: 44,
    guests: 8,
    beds: 4,
    baths: 3,
    badge: "New",
    badgeColor: "bg-blue-500",
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Desert",
    type: "farmstay" as const,
    parentCategory: "Stays",
    instantBook: true,
    amenities: ["Private Pool", "Desert View", "BBQ Area", "Free WiFi"],
  },
  {
    id: "10",
    name: "AlUla Heritage Homestay",
    location: "AlUla, Saudi Arabia",
    price: 1350,
    rating: 4.9,
    reviews: 29,
    guests: 6,
    beds: 3,
    baths: 2,
    badge: "Top Rated",
    badgeColor: "bg-amber-500",
    img: "https://images.unsplash.com/photo-1657383543368-7d929944be6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Heritage",
    type: "homestay" as const,
    parentCategory: "Stays",
    instantBook: false,
    amenities: ["Heritage Home", "Mountain View", "Guided Tours"],
  },
  {
    id: "11",
    name: "Palm Grove Wedding Lawn",
    location: "Dubai, UAE",
    price: 8500,
    rating: 4.8,
    reviews: 36,
    guests: 120,
    beds: 0,
    baths: 6,
    badge: "Popular",
    badgeColor: "bg-amber-500",
    img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Wedding Venues",
    type: "venue" as const,
    parentCategory: "Venues",
    instantBook: false,
    amenities: ["Outdoor Lawn", "Catering", "Parking", "Bridal Suite"],
  },
  {
    id: "12",
    name: "Al Ain Farmhouse Gatherings",
    location: "Al Ain, Abu Dhabi, UAE",
    price: 4200,
    rating: 4.7,
    reviews: 21,
    guests: 80,
    beds: 0,
    baths: 4,
    badge: "New",
    badgeColor: "bg-blue-500",
    img: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    category: "Farmhouse Gatherings",
    type: "venue" as const,
    parentCategory: "Venues",
    instantBook: true,
    amenities: ["Private Farm", "BBQ Area", "Event Lawn", "Free Parking"],
  },
];

export const DESTINATIONS = [
  { name: "Al Ain", stays: 48, country: "UAE", img: "https://images.unsplash.com/photo-1761415456030-e08fdeb4f112?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Ras Al Khaimah", stays: 31, country: "UAE", img: "https://images.unsplash.com/photo-1760372058307-ea5e7296b8d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Fujairah", stays: 22, country: "UAE", img: "https://images.unsplash.com/photo-1774695475665-9bb23dff3d42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Dubai", stays: 18, country: "UAE", img: "https://images.unsplash.com/photo-1657383543368-7d929944be6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Abu Dhabi", stays: 14, country: "UAE", img: "https://images.unsplash.com/photo-1743510935745-b0cd869db5e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Hatta", stays: 12, country: "UAE", img: "https://images.unsplash.com/photo-1764260664542-61117a514ba3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Riyadh", stays: 8, country: "Saudi Arabia", img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "AlUla", stays: 5, country: "Saudi Arabia", img: "https://images.unsplash.com/photo-1657383543368-7d929944be6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
];

export const POPULAR_CATEGORIES = [
  {
    name: "Stays",
    stays: 86,
    href: "/listings?parent=Stays",
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Homestays",
    stays: 42,
    href: "/listings?parent=Stays&q=homestay",
    img: "https://images.unsplash.com/photo-1720430498633-a8908d8706d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Luxury Farms",
    stays: 28,
    href: "/listings?parent=Stays&q=luxury",
    img: "https://images.unsplash.com/photo-1654145268052-6b68f1d94519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Glamping",
    stays: 19,
    href: "/listings?parent=Stays&q=glamping",
    img: "https://images.unsplash.com/photo-1738315452605-f3ff2d162631?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Desert Farms",
    stays: 23,
    href: "/listings?parent=Stays&q=desert",
    img: "https://images.unsplash.com/photo-1657383543368-7d929944be6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Experiences",
    stays: 51,
    href: "/listings?parent=Experiences",
    img: "https://images.unsplash.com/photo-1762098773943-fe46ba151683?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

export const POPULAR_EXPERIENCES = [
  {
    name: "Farm Tour",
    stays: 24,
    href: "/listings?parent=Experiences&q=farm+tour",
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Fruit Picking",
    stays: 18,
    href: "/listings?parent=Experiences&q=fruit",
    img: "https://images.unsplash.com/photo-1464454709131-ffd692591ee5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Camel Riding",
    stays: 15,
    href: "/listings?parent=Experiences&q=camel",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "BBQ Experience",
    stays: 32,
    href: "/listings?parent=Experiences&q=bbq",
    img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Horse Riding",
    stays: 12,
    href: "/listings?parent=Experiences&q=horse",
    img: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Stargazing",
    stays: 21,
    href: "/listings?parent=Experiences&q=stargazing",
    img: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

export const POPULAR_VENUES = [
  {
    name: "Wedding Venues",
    stays: 22,
    href: "/listings?parent=Venues&q=wedding",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Party Lawns",
    stays: 18,
    href: "/listings?parent=Venues&q=party",
    img: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Corporate Retreats",
    stays: 14,
    href: "/listings?parent=Venues&q=corporate",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Private Events",
    stays: 27,
    href: "/listings?parent=Venues&q=private",
    img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Outdoor Lawns",
    stays: 16,
    href: "/listings?parent=Venues&q=lawn",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    name: "Banquet Halls",
    stays: 11,
    href: "/listings?parent=Venues&q=banquet",
    img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

export const BOOKING_ACTIVITY = [
  { name: "Ahmed from Dubai", property: "Green Valley Farmhouse", time: "5 mins ago"},
  { name: "Sara from Abu Dhabi", property: "Mountain View Villa", time: "8 mins ago"},
  { name: "Khalid from Sharjah", property: "Desert Oasis Stay", time: "12 mins ago"},
  { name: "Fatima from Al Ain", property: "Al Rawda Luxury Farm", time: "15 mins ago"},
];

export const GALLERY = [
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1727706572437-4fcda0cbd66f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1738315452605-f3ff2d162631?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1654145268052-6b68f1d94519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1771772237998-f383ccb4709e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
];

export const ROOMS = [
  { name: "2 Bedroom Farmhouse", desc: "Entire farmhouse, private pool, BBQ area", price: 950, capacity: 6, beds: 2, baths: 2, img: "https://images.unsplash.com/photo-1720430498633-a8908d8706d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Orchard Suite", desc: "King bed, en-suite bath, farm view balcony", price: 999, capacity: 2, beds: 1, baths: 1, img: "https://images.unsplash.com/photo-1654145268052-6b68f1d94519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
  { name: "Harvest Cottage", desc: "2 queen beds, kitchenette, private garden", price: 1400, capacity: 4, beds: 2, baths: 1, img: "https://images.unsplash.com/photo-1738315452605-f3ff2d162631?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" },
];

export const PROPERTY_HIGHLIGHTS = [
  "Beautiful mountain & garden views from every room",
  "Private swimming pool with Jacuzzi, open 24 hours",
  "Guided farm tours and harvest experiences daily",
  "Fully equipped kitchen with farm-to-table dining",
  "Bonfire area, outdoor games and kids' play zone",
  "Free airport pickup for stays 3+ nights",
  "Pet-friendly with dedicated pet play area",
  "24/7 on-site caretaker and concierge support",
];


export const DETAIL_REVIEWS = [
  { name: "Mehul Joshi", location: "Dubai", rating: 5, text: "Absolutely stunning property! The pool area was perfect, and waking up to farm sounds was therapeutic. Kids loved feeding the goats!", avatar: "MJ", date: "15 Jan 2025", helpful: 12 },
  { name: "Fatima Al Zaabi", location: "Abu Dhabi", rating: 5, text: "We celebrated our anniversary here and it was magical. The caretaker was incredibly helpful and the breakfast spread was outstanding.", avatar: "FZ", date: "8 Jan 2025", helpful: 9 },
  { name: "Rohan Desai", location: "Sharjah", rating: 4, text: "Great property overall. Loved the location and the farm activities. Pool could use a bit more maintenance but overall a wonderful experience.", avatar: "RD", date: "2 Jan 2025", helpful: 7 },
];

export const RATING_BREAKDOWN = [
  { label: "Cleanliness", score: 4.9 },
  { label: "Communication", score: 5.0 },
  { label: "Check-in", score: 4.8 },
  { label: "Accuracy", score: 4.7 },
  { label: "Location", score: 4.9 },
  { label: "Value", score: 4.6 },
];

export const HERO_BG = "https://images.unsplash.com/photo-1764260664542-61117a514ba3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920";

type StayBase = (typeof STAYS)[number];

export type Stay = Omit<StayBase, "type"> & {
  type: StayBase["type"] | "venue" | "experience";
  /** Short public code used by guests, hosts, and support. */
  propertyReference?: string;
  /** Host taxonomy parent category when from a submission */
  parentCategory?: string;
  /** Leaf subcategory when from a host listing */
  subcategory?: string;
  /** Gallery image count for list cards */
  photoCount?: number;
  /** ISO or display date for “posted” row */
  postedAt?: string;
  /** Host discount hint shown on cards (weekly / flash) */
  priceNote?: string;
  /** Owning host — used so checkout writes the booking to their calendar */
  hostId?: string;
  /** Live flash deal — only set while the promo is on and not expired */
  flashDealEndsAt?: string;
  flashDealDiscountPct?: number;
  flashDealCurrency?: string;
  /** Currency the nightly price is stored in (listing country). */
  currency?: string;
};

export function getStayById(id: string): Stay | undefined {
  return STAYS.find((s) => s.id === id);
}
