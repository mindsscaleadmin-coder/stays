import { describe, expect, it } from "vitest";
import { pickHostListingUpdate } from "./pick-host-listing-update";

describe("pickHostListingUpdate", () => {
  it("keeps host-editable fields", () => {
    const safe = pickHostListingUpdate({
      title: "New title",
      description: "Updated",
      country: "UAE",
      safetyChecklist: [
        {
          id: "safe-fire",
          question: "Fire extinguishers?",
          reminder: "Check gauge",
          checked: true,
        },
      ],
    });
    expect(safe.title).toBe("New title");
    expect(safe.description).toBe("Updated");
    expect(safe.safetyChecklist?.[0]?.checked).toBe(true);
  });

  it("strips privileged keys from runtime payloads", () => {
    const safe = pickHostListingUpdate({
      title: "Ok",
      hostId: "hijacker",
      hostName: "Evil",
      featured: true,
      flaggedForReview: true,
    } as Parameters<typeof pickHostListingUpdate>[0]);
    expect(safe.title).toBe("Ok");
    expect("hostId" in safe).toBe(false);
    expect("featured" in safe).toBe(false);
    expect("flaggedForReview" in safe).toBe(false);
  });
});
