"use client";

import { AdminGuestReviewsSettingsPanel } from "@/components/dashboard/admin-guest-reviews-settings-panel";

export function AdminReviewsSettingsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Reviews</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage the &quot;What Guests Are Saying&quot; block on listing detail pages — rating
          breakdown bars and sample review cards.
        </p>
      </div>

      <AdminGuestReviewsSettingsPanel />
    </div>
  );
}
