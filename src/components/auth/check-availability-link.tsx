"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/components/providers/auth-provider";
import { getCheckoutHref, getGuestLoginHref } from "@/lib/guest/checkout-access";

export function CheckAvailabilityLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [target, setTarget] = useState(() => getGuestLoginHref(href));

  useEffect(() => {
    setTarget(getCheckoutHref(user, href));
  }, [user, href]);

  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
