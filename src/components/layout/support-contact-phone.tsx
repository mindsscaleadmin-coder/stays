"use client";

import { useCountrySupportContact } from "@/lib/admin/use-country-support-contact";

export function SupportContactPhone({ className }: { className?: string }) {
  const { phone, telHref } = useCountrySupportContact();
  return (
    <a href={telHref} className={className}>
      {phone}
    </a>
  );
}
