export const ADMIN_STATS = [
  { label: "Properties", value: "1,245", change: "+12 this week", color: "bg-blue-50 text-blue-600" },
  { label: "Total Users", value: "14,832", change: "+247 this month", color: "bg-green-50 text-green-600" },
  { label: "Total Bookings", value: "8,491", change: "+89 today", color: "bg-amber-50 text-amber-600" },
  { label: "Revenue", value: "AED 2.4M", change: "+AED 48K today", color: "bg-purple-50 text-purple-600" },
  { label: "Avg. Rating", value: "4.9 / 5", change: "12,500+ reviews", color: "bg-orange-50 text-orange-600" },
  { label: "Pending", value: "23", change: "Awaiting review", color: "bg-red-50 text-red-600" },
];

export const REVENUE_DATA = [
  { m: "Jan", v: 48 },
  { m: "Feb", v: 62 },
  { m: "Mar", v: 71 },
  { m: "Apr", v: 85 },
  { m: "May", v: 92 },
  { m: "Jun", v: 110 },
  { m: "Jul", v: 125 },
  { m: "Aug", v: 98 },
];

export const BOOKINGS_TREND = [
  { m: "Jan", bookings: 412, revenue: 48 },
  { m: "Feb", bookings: 538, revenue: 62 },
  { m: "Mar", bookings: 621, revenue: 71 },
  { m: "Apr", bookings: 704, revenue: 85 },
  { m: "May", bookings: 812, revenue: 92 },
  { m: "Jun", bookings: 948, revenue: 110 },
  { m: "Jul", bookings: 1084, revenue: 125 },
  { m: "Aug", bookings: 891, revenue: 98 },
];

export const ANALYTICS_KPIS = [
  { label: "Conversion rate", value: "3.8%", change: "+0.4% vs last month", positive: true },
  { label: "Avg. booking value", value: "AED 2,840", change: "+AED 120 vs last month", positive: true },
  { label: "Occupancy rate", value: "72%", change: "+5% vs last month", positive: true },
  { label: "Repeat guests", value: "34%", change: "-1% vs last month", positive: false },
];

export const TOP_DESTINATIONS = [
  { name: "Al Ain", bookings: 1842, share: 28 },
  { name: "Fujairah", bookings: 1456, share: 22 },
  { name: "Hatta", bookings: 1124, share: 17 },
  { name: "Liwa", bookings: 892, share: 14 },
  { name: "Sharjah", bookings: 734, share: 11 },
  { name: "Other", bookings: 512, share: 8 },
];

export const TOP_PROPERTIES = [
  { name: "Green Valley Farmhouse", bookings: 312, revenue: "AED 428K", rating: 4.9 },
  { name: "Al Rawda Luxury Farm", bookings: 284, revenue: "AED 612K", rating: 4.8 },
  { name: "Desert Oasis Farm", bookings: 241, revenue: "AED 198K", rating: 4.7 },
  { name: "Mountain View Villa", bookings: 198, revenue: "AED 312K", rating: 4.9 },
  { name: "Heritage Palm Farm", bookings: 176, revenue: "AED 245K", rating: 4.6 },
];

export const BOOKING_STATUS_BREAKDOWN = [
  { status: "Confirmed", count: 4218, pct: 50, color: "bg-green-500" },
  { status: "Pending", count: 1274, pct: 15, color: "bg-amber-500" },
  { status: "Completed", count: 2547, pct: 30, color: "bg-blue-500" },
  { status: "Cancelled", count: 452, pct: 5, color: "bg-red-500" },
];

export const USER_GROWTH = [
  { m: "Jan", guests: 820, hosts: 42 },
  { m: "Feb", guests: 940, hosts: 48 },
  { m: "Mar", guests: 1102, hosts: 55 },
  { m: "Apr", guests: 1288, hosts: 61 },
  { m: "May", guests: 1456, hosts: 68 },
  { m: "Jun", guests: 1684, hosts: 74 },
  { m: "Jul", guests: 1920, hosts: 81 },
  { m: "Aug", guests: 1742, hosts: 78 },
];

export const TRAFFIC_SOURCES = [
  { source: "Organic search", sessions: 48200, pct: 38 },
  { source: "Direct", sessions: 31400, pct: 25 },
  { source: "Social media", sessions: 22100, pct: 17 },
  { source: "Referral", sessions: 15800, pct: 12 },
  { source: "Paid ads", sessions: 10200, pct: 8 },
];

export type AdminBookingStatus =
  | "Upcoming"
  | "Confirmed"
  | "Pending"
  | "Cancelled"
  | "Completed";

export interface AdminBooking {
  id: string;
  guest: string;
  property: string;
  checkIn: string;
  checkOut: string;
  bookedAt: string;
  total: string;
  status: AdminBookingStatus;
}

export const ADMIN_BOOKINGS: AdminBooking[] = [
  {
    id: "GF-A8K2X1",
    guest: "Priya Sharma",
    property: "Green Valley Farmhouse",
    checkIn: "2026-08-16",
    checkOut: "2026-08-19",
    bookedAt: "2026-07-10",
    total: "AED 3,347",
    status: "Upcoming",
  },
  {
    id: "GF-B3M7P2",
    guest: "Ahmed Al Farsi",
    property: "Al Rawda Luxury Farm",
    checkIn: "2026-08-18",
    checkOut: "2026-08-22",
    bookedAt: "2026-07-08",
    total: "AED 10,000",
    status: "Confirmed",
  },
  {
    id: "GF-C9N4R3",
    guest: "Kavita Reddy",
    property: "Desert Oasis Farm",
    checkIn: "2026-08-20",
    checkOut: "2026-08-21",
    bookedAt: "2026-07-12",
    total: "AED 1,960",
    status: "Pending",
  },
  {
    id: "GF-D2K5L8",
    guest: "Rahul Mehta",
    property: "Mountain View Villa",
    checkIn: "2026-08-22",
    checkOut: "2026-08-25",
    bookedAt: "2026-07-05",
    total: "AED 4,200",
    status: "Confirmed",
  },
  {
    id: "GF-E6P3W4",
    guest: "Sara Al Mansoori",
    property: "Spice Garden Cottage",
    checkIn: "2026-08-25",
    checkOut: "2026-08-27",
    bookedAt: "2026-07-01",
    total: "AED 1,300",
    status: "Cancelled",
  },
];

export const ADMIN_ACTIVITY = [
  { text: "New property listed — Heritage Palm Farm, Liwa", time: "2 min ago", emoji: "🏡" },
  { text: "Booking GF-A8K2X1 confirmed by host", time: "5 min ago", emoji: "📅" },
  { text: "New user registered — fatima@example.com", time: "11 min ago", emoji: "👤" },
  { text: "Review posted for Green Valley (5★)", time: "18 min ago", emoji: "⭐" },
  { text: "Payout AED 12,400 processed to host #H-0042", time: "32 min ago", emoji: "💰" },
  { text: "Support ticket #T-0211 opened by Priya Sharma", time: "45 min ago", emoji: "🎧" },
];

export const PENDING_LISTINGS = [
  { id: "L-001", title: "Sunset Desert Camp", host: "Khalid Al Mazrouei", type: "farmstay", city: "Al Dhafra", submitted: "2 hours ago" },
  { id: "L-002", title: "Oasis Heritage Home", host: "Mariam Hassan", type: "homestay", city: "Al Ain", submitted: "5 hours ago" },
  { id: "L-003", title: "Mountain BBQ Experience", host: "Omar Farid", type: "experience", city: "Hatta", submitted: "1 day ago" },
];

export const HOST_STATS = [
  { label: "Active Listings", value: "3", change: "1 pending approval", color: "bg-blue-50 text-blue-600" },
  { label: "Bookings", value: "24", change: "+4 this week", color: "bg-green-50 text-green-600" },
  { label: "Earnings", value: "AED 48,200", change: "+AED 6,400 this month", color: "bg-purple-50 text-purple-600" },
  { label: "Avg. Rating", value: "4.9", change: "128 reviews", color: "bg-amber-50 text-amber-600" },
];

export const HOST_LISTINGS = [
  { id: "1", title: "Green Valley Farmhouse", status: "approved", bookings: 18, revenue: "AED 32,400", rating: 4.9 },
  { id: "7", title: "Spice Garden Cottage", status: "approved", bookings: 9, revenue: "AED 12,800", rating: 4.7 },
  { id: "9", title: "Sunset Desert Camp", status: "pending", bookings: 0, revenue: "AED 0", rating: 0 },
];

export type HostBookingStatus = "pending" | "confirmed" | "declined" | "completed" | "cancelled" | "expired";

export interface HostBooking {
  id: string;
  guest: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  guestNotes: string;
  property: string;
  propertyLocation: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  adults: number;
  children: number;
  nightlyRate: string;
  cleaningFee: string;
  serviceFee: string;
  total: string;
  paymentStatus: string;
  paymentMethod: string;
  bookedAt: string;
  status: HostBookingStatus;
}

export const HOST_BOOKINGS: HostBooking[] = [
  {
    id: "GF-A8K2X1",
    guest: "Priya Sharma",
    guestEmail: "priya.sharma@example.com",
    guestPhone: "+971 50 123 4567",
    guestCountry: "United Arab Emirates",
    guestNotes: "Prefer ground-floor rooms. Arriving around 4 PM.",
    property: "Green Valley Farmhouse",
    propertyLocation: "Al Ain, Abu Dhabi",
    roomType: "Family Suite",
    checkIn: "2026-08-16",
    checkOut: "2026-08-19",
    nights: 3,
    guests: 4,
    adults: 2,
    children: 2,
    nightlyRate: "AED 950",
    cleaningFee: "AED 200",
    serviceFee: "AED 297",
    total: "AED 3,347",
    paymentStatus: "Authorized",
    paymentMethod: "Visa ···· 4242",
    bookedAt: "2026-07-10",
    status: "pending",
  },
  {
    id: "GF-H2K9M1",
    guest: "Ahmed Al Farsi",
    guestEmail: "ahmed.alfarsi@example.com",
    guestPhone: "+971 55 987 6543",
    guestCountry: "United Arab Emirates",
    guestNotes: "Celebrating a family gathering. Need barbecue access.",
    property: "Green Valley Farmhouse",
    propertyLocation: "Al Ain, Abu Dhabi",
    roomType: "Farmhouse Villa",
    checkIn: "2026-08-22",
    checkOut: "2026-08-25",
    nights: 3,
    guests: 6,
    adults: 4,
    children: 2,
    nightlyRate: "AED 1,700",
    cleaningFee: "AED 250",
    serviceFee: "AED 350",
    total: "AED 5,700",
    paymentStatus: "Paid",
    paymentMethod: "Mastercard ···· 8811",
    bookedAt: "2026-07-08",
    status: "confirmed",
  },
  {
    id: "GF-J4N2P8",
    guest: "Sara Khan",
    guestEmail: "sara.khan@example.com",
    guestPhone: "+971 52 444 8899",
    guestCountry: "United Arab Emirates",
    guestNotes: "Quiet stay preferred. Late checkout if possible.",
    property: "Spice Garden Cottage",
    propertyLocation: "Hatta, Dubai",
    roomType: "Garden Cottage",
    checkIn: "2026-08-28",
    checkOut: "2026-08-30",
    nights: 2,
    guests: 2,
    adults: 2,
    children: 0,
    nightlyRate: "AED 850",
    cleaningFee: "AED 100",
    serviceFee: "AED 150",
    total: "AED 1,950",
    paymentStatus: "Paid",
    paymentMethod: "Apple Pay",
    bookedAt: "2026-07-12",
    status: "confirmed",
  },
  {
    id: "GF-K7M1Q3",
    guest: "Omar Hassan",
    guestEmail: "omar.hassan@example.com",
    guestPhone: "+971 56 222 3344",
    guestCountry: "Oman",
    guestNotes: "",
    property: "Spice Garden Cottage",
    propertyLocation: "Hatta, Dubai",
    roomType: "Garden Cottage",
    checkIn: "2026-06-14",
    checkOut: "2026-06-16",
    nights: 2,
    guests: 3,
    adults: 2,
    children: 1,
    nightlyRate: "AED 850",
    cleaningFee: "AED 100",
    serviceFee: "AED 150",
    total: "AED 1,950",
    paymentStatus: "Paid",
    paymentMethod: "Visa ···· 1199",
    bookedAt: "2026-05-20",
    status: "completed",
  },
  {
    id: "GF-L3P8R5",
    guest: "Fatima Noor",
    guestEmail: "fatima.noor@example.com",
    guestPhone: "+971 54 777 1122",
    guestCountry: "United Arab Emirates",
    guestNotes: "Cancelled due to travel change.",
    property: "Green Valley Farmhouse",
    propertyLocation: "Al Ain, Abu Dhabi",
    roomType: "Family Suite",
    checkIn: "2026-05-02",
    checkOut: "2026-05-04",
    nights: 2,
    guests: 2,
    adults: 2,
    children: 0,
    nightlyRate: "AED 950",
    cleaningFee: "AED 200",
    serviceFee: "AED 180",
    total: "AED 2,280",
    paymentStatus: "Refunded",
    paymentMethod: "Visa ···· 5520",
    bookedAt: "2026-04-15",
    status: "cancelled",
  },
];

export function getHostBooking(id: string): HostBooking | undefined {
  return HOST_BOOKINGS.find((b) => b.id === id);
}

export function formatBookingDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const STATUS_STYLES: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700",
  confirmed: "bg-green-100 text-green-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  Completed: "bg-gray-100 text-gray-600",
  completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
