import { describe, expect, it } from "vitest";
import { toGuestVisibleHostProfile } from "./host-profile-public";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";

describe("toGuestVisibleHostProfile", () => {
  it("strips billing and contact fields", () => {
    const full: HostPublicProfile = {
      hostId: "host-1",
      displayName: "Farm Co",
      companyName: "Farm LLC",
      bio: "Welcome",
      city: "Dubai",
      whatsapp: "+971500000000",
      preferWhatsapp: true,
      directoryBillingNotes: "Called — invoice pending",
      directoryBillingStatus: "pending_payment",
    };

    const publicProfile = toGuestVisibleHostProfile(full);
    expect(publicProfile.displayName).toBe("Farm Co");
    expect("whatsapp" in publicProfile).toBe(false);
    expect("directoryBillingNotes" in publicProfile).toBe(false);
    expect("directoryBillingStatus" in publicProfile).toBe(false);
  });
});
