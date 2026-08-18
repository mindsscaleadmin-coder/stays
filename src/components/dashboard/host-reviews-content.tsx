"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Star } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostReviews } from "@/lib/host/use-host-reviews";

export function HostReviewsContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready, respond, saveTemplates } = useHostReviews(hostId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  if (!ready || !data) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Reviews & Reputation</h2>
          <p className="text-gray-500 text-sm mt-1">
            View guest feedback, respond to reviews, and track your ratings breakdown.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-4 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Overall rating
            </p>
            <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              {data.overallRating}
            </p>
            <p className="text-xs text-gray-500 mt-1">{data.reviewCount} reviews</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Ratings breakdown
            </p>
            <div className="grid grid-cols-2 gap-3">
              {data.categoryBreakdown.map((cat) => (
                <div key={cat.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{cat.label}</span>
                    <span className="font-semibold text-gray-900">{cat.score}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${(cat.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Guest reviews</h3>
          </div>
          <ul className="space-y-4">
            {data.reviews.map((review) => (
              <li key={review.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{review.guestName}</p>
                    <p className="text-xs text-gray-500">
                      {review.property} · {review.date} · {review.rating}/5
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{review.text}</p>
                {review.hostResponse ? (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-gray-700">
                    <p className="text-xs font-semibold text-green-800 mb-1">Your response</p>
                    {review.hostResponse}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={drafts[review.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [review.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Write a public response…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex flex-wrap gap-2">
                      {data.templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() =>
                            setDrafts((d) => ({ ...d, [review.id]: tpl.body }))
                          }
                          className="text-xs font-medium text-green-700 border border-green-200 hover:bg-green-50 px-2.5 py-1 rounded-lg"
                        >
                          {tpl.title}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const text = drafts[review.id]?.trim();
                          if (!text) return;
                          respond(review.id, text);
                          flash("Response published.");
                        }}
                        className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg"
                      >
                        Post response
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Response templates</h3>
          <p className="text-xs text-gray-500">
            Save reusable replies — click a template when responding to a review.
          </p>
          <ul className="space-y-3">
            {data.templates.map((tpl, index) => (
              <li key={tpl.id} className="space-y-2">
                <input
                  value={tpl.title}
                  onChange={(e) => {
                    const templates = [...data.templates];
                    templates[index] = { ...tpl, title: e.target.value };
                    saveTemplates(templates);
                  }}
                  className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <textarea
                  value={tpl.body}
                  onChange={(e) => {
                    const templates = [...data.templates];
                    templates[index] = { ...tpl, body: e.target.value };
                    saveTemplates(templates);
                  }}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </HostDashboardShell>
  );
}
