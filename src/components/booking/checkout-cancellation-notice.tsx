import { Link } from "@/i18n/routing";

export type CheckoutCancellationPolicyItem = {
  listingTitle?: string;
  label: string;
  description: string;
  refundPreview?: string | null;
};

type Props = {
  policies: CheckoutCancellationPolicyItem[];
};

export function CheckoutCancellationNotice({ policies }: Props) {
  if (policies.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-xs text-gray-600 leading-relaxed space-y-3"
      data-testid="checkout-cancellation-policy"
    >
      {policies.map((policy, index) => (
        <div key={`${policy.label}-${policy.listingTitle ?? index}`}>
          {policy.listingTitle && (
            <p className="font-semibold text-gray-900 truncate">{policy.listingTitle}</p>
          )}
          <p className={policy.listingTitle ? "mt-1" : undefined}>
            <span className="font-semibold text-gray-800">
              {policy.label} cancellation:{" "}
            </span>
            {policy.description}
          </p>
          {policy.refundPreview && (
            <p className="mt-1 text-gray-500">If you cancel now: {policy.refundPreview}</p>
          )}
        </div>
      ))}
      <p className="text-[11px] text-gray-400 border-t border-gray-200 pt-2">
        By paying, you agree to this cancellation policy.{" "}
        <Link href="/cancellation-policy" className="text-green-700 font-medium hover:underline">
          Learn more
        </Link>
      </p>
    </div>
  );
}
