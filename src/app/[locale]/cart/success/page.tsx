import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { CartSuccessContent } from "@/components/booking/cart-success-content";

export default async function CartSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-16 text-center text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <CartSuccessContent />
    </Suspense>
  );
}
