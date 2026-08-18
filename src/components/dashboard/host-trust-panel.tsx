"use client";

import { useState } from "react";
import { Award, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostTrust } from "@/lib/host/use-host-trust";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";

export function HostTrustPanel() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready, toggleSafety, applyForBadge } = useHostTrust(hostId);
  const { request, ready: verifyReady } = useHostVerification(user?.id);
  const [message, setMessage] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [docName, setDocName] = useState("");

  if (!ready || !verifyReady || !data) return null;

  const idStatus = request?.status ?? "none";

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  }

  function handleApply(certId: string) {
    const name = docName.trim() || "Certificate document";
    const next = applyForBadge(certId, name);
    if (!next) {
      flash("Could not submit this badge.");
      return;
    }
    setApplyingId(null);
    setDocName("");
    flash("Submitted to admin for review.");
  }

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-700" />
          <h4 className="text-sm font-semibold text-gray-900">ID / document verification</h4>
        </div>
        <p className="text-sm text-gray-600 flex flex-wrap items-center gap-1.5">
          Status:{" "}
          {idStatus === "verified" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-blue-500 border border-blue-500 px-2 py-0.5 rounded-full capitalize">
              <VerifiedBadge size="sm" /> verified
            </span>
          ) : (
            <span
              className={cn(
                "font-semibold capitalize",
                idStatus === "pending" && "text-amber-600",
                idStatus === "rejected" && "text-red-600",
                idStatus === "none" && "text-gray-500"
              )}
            >
              {idStatus === "none" ? "Not submitted" : idStatus}
            </span>
          )}
        </p>
        {request?.reviewNote && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {request.reviewNote}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-green-700" />
          <h4 className="text-sm font-semibold text-gray-900">Farm certification badges</h4>
        </div>
        <p className="text-xs text-gray-500">
          Apply for a badge, then an admin reviews it under Admin → Trust → Certificates.
        </p>
        <ul className="space-y-2">
          {data.certifications.map((cert) => (
            <li
              key={cert.id}
              className="border border-gray-100 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{cert.label}</p>
                  <p className="text-xs text-gray-500">{cert.description}</p>
                  {cert.documentName && cert.status === "pending" && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Document: {cert.documentName}
                    </p>
                  )}
                  {cert.reviewNote && cert.status === "rejected" && (
                    <p className="text-[11px] text-red-600 mt-1">{cert.reviewNote}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
                    cert.status === "verified" && "bg-blue-500 text-white",
                    cert.status === "pending" && "bg-amber-100 text-amber-700",
                    cert.status === "rejected" && "bg-red-100 text-red-700",
                    cert.status === "none" && "bg-gray-100 text-gray-500"
                  )}
                >
                  {cert.status}
                </span>
              </div>

              {(cert.status === "none" || cert.status === "rejected") && (
                <div className="pt-1">
                  {applyingId === cert.id ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="Document name (e.g. Organic certificate.pdf)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApply(cert.id)}
                          className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg"
                        >
                          Submit to admin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setApplyingId(null);
                            setDocName("");
                          }}
                          className="text-xs font-semibold border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setApplyingId(cert.id);
                        setDocName("");
                      }}
                      className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg"
                    >
                      {cert.status === "rejected" ? "Re-apply" : "Apply"}
                    </button>
                  )}
                </div>
              )}

              {cert.status === "pending" && (
                <p className="text-[11px] text-amber-700">
                  Waiting for admin approval.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Safety compliance checklist</h4>
        <ul className="space-y-2">
          {data.safetyChecklist.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 border border-gray-100 rounded-xl p-3"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleSafety(item.id)}
                className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
