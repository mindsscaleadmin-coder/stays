import { setRequestLocale } from "next-intl/server";
import { CartCheckoutContent } from "@/components/booking/cart-checkout-content";

export default async function CartCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CartCheckoutContent />;
}
