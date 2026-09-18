"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";

const DEBOUNCE_MS = 500;

export function OpsPrivateNotes({
  notes,
  saving,
  onSave,
}: {
  notes: string;
  saving?: boolean;
  onSave: (notes: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(notes);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(notes);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    setDraft(notes);
    lastSavedRef.current = notes;
    setDirty(false);
  }, [notes]);

  useEffect(() => {
    if (draft === lastSavedRef.current) {
      setDirty(false);
      return;
    }
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void onSaveRef.current(draft).then(() => {
        lastSavedRef.current = draft;
        setDirty(false);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft]);

  return (
    <OpsSectionCard title="Private notes">
      <p className="text-xs text-gray-500 mb-2">Private to your team.</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="VIP table request, arrival instructions, internal reminders…"
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-y min-h-[76px] focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
        <span>{draft.length}/4000</span>
        <span className="inline-flex items-center gap-1">
          {saving || dirty ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </>
          ) : (
            "Saved"
          )}
        </span>
      </div>
    </OpsSectionCard>
  );
}
