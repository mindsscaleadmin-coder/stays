import {
  buildDirectorySubscriptionGrantPatch,
  loadDirectorySubscriptionSettings,
} from "@/lib/server/directory-subscription-grant";
import { getHostProfile, saveHostProfile } from "@/lib/server/host-profile-repo";
import { defaultHostPublicProfile } from "@/lib/host/host-profile-data";

export async function activateDirectorySubscriptionFromPayment(input: {
  hostId: string;
  planId: string;
  paidAt?: Date;
}) {
  const hostId = input.hostId.trim();
  const planId = input.planId.trim();
  if (!hostId || !planId) {
    throw new Error("hostId and planId are required");
  }

  const current = (await getHostProfile(hostId)) ?? defaultHostPublicProfile(hostId);
  const settings = await loadDirectorySubscriptionSettings();
  const grant = buildDirectorySubscriptionGrantPatch(
    current,
    planId,
    settings,
    input.paidAt ?? new Date()
  );

  return saveHostProfile(hostId, {
    ...current,
    ...grant,
    preferredDirectoryPlanId: planId,
    directoryBillingEnforced: true,
  });
}
