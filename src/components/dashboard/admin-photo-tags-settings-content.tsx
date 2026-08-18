"use client";

import { useState } from "react";
import { ImageIcon, Plus, RotateCcw, Trash2 } from "lucide-react";
import { usePhotoTagsCatalog } from "@/lib/admin/use-photo-tags-catalog";

export function AdminPhotoTagsSettingsContent() {
  const { ready, items, addItem, updateItem, removeItem, resetDefaults } =
    usePhotoTagsCatalog();
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    addItem({
      label: trimmed,
      enabled: true,
    });
    setLabel("");
    flash("Photo tag added.");
  }

  if (!ready) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Photo tags</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage the photo name chips hosts see when tagging listing photos (Kitchen, Balcony,
          Pool, etc.). Enabled tags appear in the photo manager.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Tag catalog</h3>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {items.filter((i) => i.enabled).length} enabled
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              resetDefaults();
              flash("Restored default photo tags.");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-green-400 px-3 py-1.5 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
            >
              <label className="inline-flex items-center gap-2 shrink-0">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-xs text-gray-500">On</span>
              </label>
              <input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder="Label"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                value={item.value}
                onChange={(e) => updateItem(item.id, { value: e.target.value })}
                placeholder="slug"
                className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Internal value / slug"
              />
              <button
                type="button"
                onClick={() => {
                  if (!confirm(`Remove “${item.label}”?`)) return;
                  removeItem(item.id);
                  flash("Photo tag removed.");
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                aria-label={`Remove ${item.label}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No photo tags yet. Add one below or restore defaults.
          </p>
        )}

        <form
          onSubmit={handleAdd}
          className="border-t pt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3"
        >
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="New tag e.g. Rooftop terrace"
            required
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add tag
          </button>
        </form>
      </section>
    </div>
  );
}
