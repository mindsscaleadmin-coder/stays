"use client";

import { Phone } from "lucide-react";
import { useCountrySupportContact } from "@/lib/admin/use-country-support-contact";

export function ListingSupportHelpCard() {
  const { phone, hoursLabel, telHref } = useCountrySupportContact();

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
        <Phone className="w-4 h-4 text-green-600" /> Need help?
      </h3>
      <p className="text-xs text-gray-500">{hoursLabel}</p>
      <a href={telHref} className="mt-1 block text-sm font-bold text-green-800 hover:underline">
        {phone}
      </a>
    </div>
  );
}
