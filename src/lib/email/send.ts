import { logger } from "@/lib/observability/logger";

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "Farm Stays <noreply@localhost>";
}

/** Send via Resend when configured; otherwise log and skip. Never throws. */
export async function sendEmail(input: OutboundEmail): Promise<{ sent: boolean }> {
  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    logger.warn("email_skipped_invalid_to", { subject: input.subject });
    return { sent: false };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    logger.info("email_logged", { to, subject: input.subject, provider: "none" });
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      logger.warn("email_send_failed", {
        to,
        subject: input.subject,
        status: res.status,
        error: err.slice(0, 300),
      });
      return { sent: false };
    }
    logger.info("email_sent", { to, subject: input.subject, provider: "resend" });
    return { sent: true };
  } catch (error) {
    logger.warn("email_send_failed", {
      to,
      subject: input.subject,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { sent: false };
  }
}
