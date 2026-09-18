"use client";

import { Plus, Trash2 } from "lucide-react";
import { DiningFormSection } from "@/components/dashboard/dining-form-section";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";

const fieldClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";
const labelClass = "text-xs font-medium text-gray-600 mb-1 block";

function openNativeDatePicker(event: React.MouseEvent<HTMLInputElement>) {
  event.currentTarget.showPicker?.();
}

export function ExperienceSessionsDraftEditor({
  sessions,
  onChange,
  currency,
}: {
  sessions: ExperienceSessionTemplate[];
  onChange: (sessions: ExperienceSessionTemplate[]) => void;
  currency: string;
}) {
  function updateSession(key: string, patch: Partial<ExperienceSessionTemplate>) {
    onChange(sessions.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeSession(key: string) {
    onChange(sessions.filter((s) => s.key !== key));
  }

  function addSession() {
    const key = `session-${Date.now().toString(36)}`;
    onChange([
      ...sessions,
      {
        key,
        label: "New session",
        startTime: "09:00",
        endTime: "13:00",
        capacity: 6,
        priceMode: "per_person",
        price: 0,
      },
    ]);
  }

  return (
    <DiningFormSection
      title="Session pricing"
      tier="required"
      description={`Set times, capacity, and rates for each session guests can book. Currency follows the listing country (${currency}).`}
    >
      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.key}
            className="border-b border-gray-100 pb-4 space-y-4 last:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <input
                value={session.label}
                onChange={(e) => updateSession(session.key, { label: e.target.value })}
                className={`${fieldClass} max-w-sm font-semibold`}
                placeholder="Morning"
                aria-label="Session name"
              />
              <button
                type="button"
                onClick={() => removeSession(session.key)}
                disabled={sessions.length <= 1}
                className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-5 gap-2 sm:gap-3 min-w-[36rem] lg:min-w-0">
                <label className="block min-w-0">
                  <span className={labelClass}>Start</span>
                  <input
                    type="time"
                    value={session.startTime}
                    onChange={(e) => updateSession(session.key, { startTime: e.target.value })}
                    onClick={openNativeDatePicker}
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>End</span>
                  <input
                    type="time"
                    value={session.endTime}
                    onChange={(e) => updateSession(session.key, { endTime: e.target.value })}
                    onClick={openNativeDatePicker}
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Price mode</span>
                  <select
                    value={session.priceMode}
                    onChange={(e) =>
                      updateSession(session.key, {
                        priceMode: e.target.value as "per_person" | "per_group",
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="per_person">Per person</option>
                    <option value="per_group">Per group</option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Capacity</span>
                  <input
                    type="number"
                    min={1}
                    value={session.capacity}
                    onChange={(e) =>
                      updateSession(session.key, {
                        capacity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>
                    Price ({currency}
                    {session.priceMode === "per_person" ? "/person" : "/group"})
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={session.price}
                    onChange={(e) =>
                      updateSession(session.key, {
                        price: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSession}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800"
      >
        <Plus className="w-3.5 h-3.5" /> Add session
      </button>
    </DiningFormSection>
  );
}

export function validateExperienceSessionsDraft(
  sessions: ExperienceSessionTemplate[]
): string | null {
  if (sessions.length === 0) {
    return "Add at least one session with a name, time, and price.";
  }
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const label = session.label.trim() || `Session ${i + 1}`;
    if (!session.label.trim()) {
      return `${label}: enter a session name.`;
    }
    if (!session.price || session.price <= 0) {
      return `${label}: enter a price greater than 0.`;
    }
  }
  return null;
}
