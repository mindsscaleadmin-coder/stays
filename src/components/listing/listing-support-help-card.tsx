"use client";

import { Headphones, MessageCircle, Phone } from "lucide-react";
import { useCountrySupportContact } from "@/lib/admin/use-country-support-contact";

export function ListingSupportHelpCard() {
  const { phone, hoursLabel, telHref, whatsappHref } = useCountrySupportContact();

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
        <Headphones className="w-4 h-4 text-green-600" /> Need help?
      </h3>
      <p className="text-xs text-gray-500">{hoursLabel}</p>
      <a href={telHref} className="mt-1 block text-sm font-bold text-green-800 hover:underline">
        {phone}
      </a>
      <div className="mt-3 flex gap-2">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        ) : null}
        <a
          href={telHref}
          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          <Phone className="w-3.5 h-3.5" /> Call
        </a>
      </div>
    </div>
  );
}
