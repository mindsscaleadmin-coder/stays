import { setRequestLocale } from "next-intl/server";
import { CartPaymentContent } from "@/components/booking/cart-payment-content";

export default async function CartPaymentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CartPaymentContent />;
}
