"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Settings2 } from "lucide-react";
import { useHostOperationalSettings } from "@/lib/host/use-host-operational-settings";
import { formatAutomationSummary } from "@/lib/host/host-check-in-out-utils";
import { formatTimezoneLabel } from "@/lib/host/operational-timezone";
import type { OperationalSettings } from "@/lib/host/operational-settings-types";
import { cn } from "@/lib/utils";

export function HostOperationalSettingsPanel() {
  const { settings, timezoneMeta, ready, saving, error, save } = useHostOperationalSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OperationalSettings>(settings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  async function handleSave() {
    try {
      await save(draft);
      setMessage("Settings saved");
      setTimeout(() => setMessage(""), 2500);
    } catch {
      // error surfaced via hook
    }
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl border p-4 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-green-600" />
        Loading automation settings…
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50/80"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-green-700 shrink-0" />
            <p className="text-sm font-semibold text-gray-900">Automation settings</p>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                settings.autoCheckInOutEnabled
                  ? "bg-green-50 text-green-800"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {settings.autoCheckInOutEnabled ? "On" : "Off"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {formatAutomationSummary(settings, timezoneMeta.countryName)}
          </p>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="border-t px-5 py-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.autoCheckInOutEnabled}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, autoCheckInOutEnabled: e.target.checked }))
              }
              className="rounded border-gray-300 text-green-700 focus:ring-green-600"
            />
            <span className="text-sm text-gray-800">
              Automatically check guests in and out at the times below
            </span>
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Expected arrival</span>
              <input
                type="time"
                value={draft.checkInTime}
                onChange={(e) => setDraft((prev) => ({ ...prev, checkInTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <span className="text-[11px] text-gray-400">
                When guests should arrive — shown to guests, not when the system checks them in
              </span>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Check-out time</span>
              <input
                type="time"
                value={draft.checkOutTime}
                onChange={(e) => setDraft((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Auto check-in time</span>
              <input
                type="time"
                value={draft.noShowCutoffTime}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, noShowCutoffTime: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <span className="text-[11px] text-gray-400">
                Mark no-show before this time — everyone else is checked in automatically
              </span>
            </label>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Timezone</span>
              <p className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {formatTimezoneLabel(timezoneMeta.timezone, timezoneMeta.countryName)}
              </p>
              <span className="text-[11px] text-gray-400">
                Set automatically from your listing country — not editable here.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="text-sm font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            {message ? <span className="text-xs font-medium text-green-700">{message}</span> : null}
            {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
