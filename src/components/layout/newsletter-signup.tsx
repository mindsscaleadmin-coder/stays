"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterSignupProps = {
  variant: "banner" | "footer";
  className?: string;
};

export function NewsletterSignup({ variant, className }: NewsletterSignupProps) {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      return;
    }

    setEmail("");
    setStatus("success");
  };

  const handleChange = (value: string) => {
    setEmail(value);
    if (status !== "idle") setStatus("idle");
  };

  const isBanner = variant === "banner";

  return (
    <div className={cn(className)}>
      {status === "success" ? (
        <p
          className={cn(
            "text-sm",
            isBanner ? "text-green-700 font-medium" : "text-green-400 text-xs"
          )}
          aria-live="polite"
        >
          {t("newsletterSuccess")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t("emailPlaceholder")}
            required
            className={cn(
              "flex-1 outline-none border focus:border-green-500",
              isBanner
                ? "bg-gray-50 text-gray-800 text-sm px-4 py-2.5 rounded-s-lg border-gray-200 border-e-0"
                : "bg-gray-800 text-white text-xs px-3 py-2 rounded-s-lg border-gray-700"
            )}
          />
          <button
            type="submit"
            className={cn(
              "transition-colors shrink-0",
              isBanner
                ? "bg-amber-400 hover:bg-amber-500 px-5 py-2.5 rounded-e-lg font-semibold text-sm text-gray-900"
                : "bg-green-600 hover:bg-green-700 px-3 py-2 rounded-e-lg"
            )}
            aria-label={t("subscribe")}
          >
            {isBanner ? t("subscribe") : <ArrowRight className="w-4 h-4 text-white" />}
          </button>
        </form>
      )}
      {status === "error" && (
        <p
          className={cn(
            "mt-1",
            isBanner ? "text-red-600 text-sm" : "text-red-400 text-xs"
          )}
          aria-live="polite"
        >
          {t("newsletterInvalidEmail")}
        </p>
      )}
    </div>
  );
}
