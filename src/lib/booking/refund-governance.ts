/**
 * Launch-phase refund controls — require admin approval before Stripe moves money.
 * Set to false once refund calculations are trusted and ops volume justifies automation.
 */
export const MANUAL_REFUND_APPROVAL = true;

export function shouldAutoIssueStripeRefund(): boolean {
  return !MANUAL_REFUND_APPROVAL;
}
