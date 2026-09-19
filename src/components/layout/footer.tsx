"use client";

import { Link } from "@/i18n/routing";
import {
  Leaf,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Shield,
  CheckCircle,
  Headphones,
  Tag,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { StarRating } from "@/components/ui/star-rating";
import { isDashboardChromePath } from "@/lib/layout/dashboard-chrome";
import { SupportContactPhone } from "@/components/layout/support-contact-phone";
import { NewsletterSignup } from "@/components/layout/newsletter-signup";

export function Footer() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (isDashboardChromePath(pathname)) {
    return null;
  }

  return (
    <>
      <div className="bg-amber-50 border-y border-amber-100 mt-12">
        <div className="site-page-container py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: CheckCircle, key: "cancellation" as const },
            { icon: Shield, key: "instant" as const },
            { icon: Tag, key: "noHidden" as const },
            { icon: Headphones, key: "support" as const },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <Icon className="w-4 h-4 text-green-600 shrink-0" />
              {t(`trustBar.${key}`)}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-b py-6">
        <div className="site-page-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900 font-display">{t("newsletterTitle")}</p>
            <p className="text-gray-500 text-sm">{t("newsletterSubtitle")}</p>
          </div>
          <NewsletterSignup variant="banner" className="w-full md:w-auto max-w-md" />
          <div className="hidden lg:flex items-center gap-6 text-sm text-gray-600">
            <span><strong className="text-gray-900">1,245+</strong> Properties</span>
            <span><strong className="text-gray-900">42,300+</strong> Bookings</span>
            <span><strong className="text-gray-900">4.9/5</strong> Rating</span>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-400 pt-12 pb-6">
        <div className="site-page-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">{tc("brandShort")}</div>
                <div className="text-green-400 text-[10px]">{tc("brandTagline")}</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4">{t("description")}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              {t("contact")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t("explore")}</h4>
            <div className="flex flex-col gap-2 text-sm">
              {(
                [
                  ["Home", "/"],
                  ["Search", "/search"],
                  ["Experiences", "/search?type=experience"],
                  ["About", "/about"],
                  ["Contact", "/contact"],
                ] as const
              ).map(([label, href]) => (
                <Link key={label} href={href} className="hover:text-green-400 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t("support")}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/cancellation-policy" className="hover:text-green-400 transition-colors">
                Cancellation Policy
              </Link>
              <Link href="/privacy" className="hover:text-green-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-green-400 transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-green-400 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t("contact")}</h4>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400" />
                <SupportContactPhone className="hover:text-green-400 transition-colors" />
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <Mail className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span className="break-all">hello@greenfieldfarmstays.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" /> Bengaluru, India
              </div>
            </div>
            <div className="mt-5">
              <p className="text-xs mb-2">{t("newsletter")}</p>
              <NewsletterSignup variant="footer" />
            </div>
          </div>
        </div>
        <div className="site-page-container border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>{t("copyright", { year })}</p>
          <div className="flex gap-4 items-center">
            <span className="text-gray-500">{t("trustedBy")}</span>
            <div className="flex items-center gap-1">
              <StarRating rating={4.9} />
              <span>4.9/5</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
