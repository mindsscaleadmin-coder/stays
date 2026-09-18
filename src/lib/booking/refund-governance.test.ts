import { describe, expect, it } from "vitest";
import {
  MANUAL_REFUND_APPROVAL,
  shouldAutoIssueStripeRefund,
} from "./refund-governance";

describe("refund governance", () => {
  it("requires manual approval during launch phase", () => {
    expect(MANUAL_REFUND_APPROVAL).toBe(true);
    expect(shouldAutoIssueStripeRefund()).toBe(false);
  });
});
