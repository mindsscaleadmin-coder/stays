import { Mail, MessageCircle, Phone } from "lucide-react";

export function whatsAppHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

const actionClass =
  "inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-full px-3 py-1.5 hover:border-green-300";

export function OpsQuickContact({
  email,
  phone,
}: {
  email?: string;
  phone?: string;
}) {
  const wa = phone ? whatsAppHref(phone) : null;
  if (!email && !phone) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {phone ? (
        <a href={`tel:${phone}`} className={actionClass}>
          <Phone className="w-3.5 h-3.5" /> Call
        </a>
      ) : null}
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={actionClass}>
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className={actionClass}>
          <Mail className="w-3.5 h-3.5" /> Email
        </a>
      ) : null}
    </div>
  );
}
