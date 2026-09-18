import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import type { HostBookingCategory } from "@/lib/host/booking-category";
import type { EnquiryCategoryFilter } from "@/lib/host/enquiry-category";
import {
  hostCategoryFlow,
  type HostCategoryFlowKind,
} from "@/lib/host/host-category-flows";
import { cn } from "@/lib/utils";

type BookingsBannerCategory = HostBookingCategory | "all";
type EnquiriesBannerCategory = EnquiryCategoryFilter;

function bookingsCopy(category: BookingsBannerCategory) {
  if (category === "all") {
    return {
      title: "Operations hub",
      body:
        "Paid Stays and Experiences appear here after checkout. Confirmed Event and Dining enquiries appear here after you mark them available in Enquiries.",
      links: [
        { label: "Open Enquiries", href: "/host/enquiries" },
      ],
    };
  }

  const flow = hostCategoryFlow(category);
  if (flow.kind === "paid") {
    return {
      title: `${flow.label} bookings`,
      body: flow.guestAction,
      links: flow.hostStep2Href
        ? [{ label: flow.hostStep2, href: flow.hostStep2Href }]
        : [],
    };
  }

  return {
    title: `Confirmed ${flow.label.toLowerCase()} enquiries`,
    body: `New ${flow.label.toLowerCase()} requests land in Enquiries first. After you confirm availability, they show here for staff assignment and completion.`,
    links: [{ label: `Reply in ${flow.label} Enquiries`, href: flow.hostStep1Href }],
  };
}

function enquiriesCopy(category: EnquiriesBannerCategory) {
  if (category === "all") {
    return {
      title: "Directory enquiry inbox",
      body:
        "Events and Dining listings are enquire-only — guests do not pay on the platform. Reply here first; confirmed enquiries move to Bookings.",
      links: [
        { label: "Confirmed events", href: "/host/bookings?category=event" },
        { label: "Confirmed dining", href: "/host/bookings?category=dining" },
      ],
    };
  }

  const flow = hostCategoryFlow(category);
  return {
    title: `${flow.label} enquiries`,
    body: `${flow.guestAction} Your contact details are shared only after you mark a request available.`,
    links: flow.hostStep2Href
      ? [{ label: flow.hostStep2, href: flow.hostStep2Href }]
      : [],
  };
}

export function HostBookingsFlowBanner({
  category = "all",
  className,
}: {
  category?: BookingsBannerCategory;
  className?: string;
}) {
  const copy = bookingsCopy(category);

  return (
    <div
      className={cn(
        "rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950",
        className
      )}
    >
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1 text-blue-900/85 leading-relaxed">{copy.body}</p>
      {copy.links.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-3">
          {copy.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline"
            >
              {link.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HostEnquiriesFlowBanner({
  category = "all",
  className,
}: {
  category?: EnquiriesBannerCategory;
  className?: string;
}) {
  const copy = enquiriesCopy(category);

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950",
        className
      )}
    >
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1 text-amber-900/85 leading-relaxed">{copy.body}</p>
      {copy.links.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-3">
          {copy.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-950 hover:underline"
            >
              {link.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HostCategoryFlowLegend({ kind }: { kind: HostCategoryFlowKind }) {
  const label = kind === "paid" ? "Paid on platform" : "Enquire only";
  const tone =
    kind === "paid"
      ? "bg-green-50 text-green-800 border-green-100"
      : "bg-amber-50 text-amber-900 border-amber-100";

  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border", tone)}>
      {label}
    </span>
  );
}
