"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getListPropertyHref,
  LIST_PROPERTY_SIGNUP_HREF,
} from "@/lib/host/list-property";

export function ListPropertyLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [href, setHref] = useState(LIST_PROPERTY_SIGNUP_HREF);

  useEffect(() => {
    setHref(getListPropertyHref(user));
  }, [user]);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
