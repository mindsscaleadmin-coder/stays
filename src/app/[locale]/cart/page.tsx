import { setRequestLocale } from "next-intl/server";
import { CartContent } from "@/components/booking/cart-content";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CartContent />;
}
