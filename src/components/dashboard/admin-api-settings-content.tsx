"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useApiIntegrations } from "@/lib/admin/use-api-integrations";

export function AdminApiSettingsContent() {
  const { ready, items, addItem, updateItem, removeItem, resetDefaults } =
    useApiIntegrations();
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [docsUrl, setDocsUrl] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addItem({
      name: trimmed,
      description: description.trim(),
      fieldLabel: fieldLabel.trim() || "API key",
      docsUrl: docsUrl.trim() || undefined,
      value: "",
      enabled: true,
    });
    setName("");
    setDescription("");
    setFieldLabel("");
    setDocsUrl("");
    flash("Service added.");
  }

  if (!ready) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  const configuredCount = items.filter((i) => i.enabled && i.value).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">API keys</h2>
        <p className="text-gray-500 text-sm mt-1">
          Store credentials for Google Maps and other external services in one place. Keys
          are used across the site where each integration is enabled.
        </p>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-3">
        <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          This is a demo store — keys are saved in your browser only. For production, keep
          secret keys on the server and never expose them to the browser.
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
            <KeyRound className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Integrations</h3>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {configuredCount} configured
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Reset all integrations to defaults? This clears saved keys.")) {
                return;
              }
              resetDefaults();
              flash("Restored default integrations.");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-green-400 px-3 py-1.5 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
          </button>
        </div>

        <ul className="space-y-3">
          {items.map((item) => {
            const isRevealed = Boolean(revealed[item.id]);
            return (
              <li
                key={item.id}
                className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{item.name}</span>
                      {item.value ? (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          Key set
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Not set
                        </span>
                      )}
                      {!item.builtIn && (
                        <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                    {item.docsUrl && (
                      <a
                        href={item.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 mt-1"
                      >
                        Get key <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-xs text-gray-500">Enabled</span>
                    </label>
                    {!item.builtIn && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`Remove “${item.name}”?`)) return;
                          removeItem(item.id);
                          flash("Service removed.");
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">{item.fieldLabel}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type={isRevealed ? "text" : "password"}
                      value={item.value}
                      onChange={(e) => updateItem(item.id, { value: e.target.value })}
                      placeholder={`Enter ${item.fieldLabel.toLowerCase()}`}
                      autoComplete="off"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal(item.id)}
                      className="p-2 rounded-lg text-gray-500 border border-gray-200 hover:border-green-400"
                      aria-label={isRevealed ? "Hide key" : "Show key"}
                    >
                      {isRevealed ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <form
          onSubmit={handleAdd}
          className="border-t pt-4 space-y-3"
        >
          <p className="text-sm font-semibold text-gray-900">Add another service</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Service name e.g. OpenWeather"
              required
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Credential label (default: API key)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it powers (optional)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
              placeholder="Docs / dashboard URL (optional)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add service
          </button>
        </form>
      </section>
    </div>
  );
}
