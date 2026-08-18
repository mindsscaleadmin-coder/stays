"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  Globe2,
  MapPinned,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  getCountryGeoPreset,
  hasCountryGeoPreset,
  LOCATION_UPLOAD_TEMPLATE_CSV,
  parseLocationUpload,
  type CountryGeoState,
} from "@/lib/admin/country-geo";
import type { Country, CountryInput } from "@/lib/admin/taxonomy-types";
import { cn } from "@/lib/utils";

const EMPTY_FORM: CountryInput = {
  name: "",
  code: "",
  flag: "",
  currency: "",
  currencySymbol: "",
  exchangeRateToAED: 1,
  taxPct: 5,
  taxLabel: "VAT",
  dialCode: "",
  enabled: true,
  comingSoon: false,
};

type LocationSource = "none" | "defaults" | "upload";

export function AdminCountriesContent() {
  const { data, saveCountry, importCountryLocations, deleteCountry } = useAdminTaxonomy();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CountryInput>(EMPTY_FORM);
  const [locationSource, setLocationSource] = useState<LocationSource>("defaults");
  const [uploadGeo, setUploadGeo] = useState<CountryGeoState[] | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const countries = data.countries;

  const editing = useMemo(
    () => (editingId ? countries.find((c) => c.id === editingId) : null),
    [countries, editingId]
  );

  const preset = useMemo(() => getCountryGeoPreset(form.code), [form.code]);
  const presetAvailable = hasCountryGeoPreset(form.code);

  const presetSummary = useMemo(() => {
    if (!preset) return null;
    const districts = preset.reduce((n, s) => n + s.districts.length, 0);
    return { states: preset.length, districts };
  }, [preset]);

  const uploadSummary = useMemo(() => {
    if (!uploadGeo) return null;
    const districts = uploadGeo.reduce((n, s) => n + s.districts.length, 0);
    return { states: uploadGeo.length, districts };
  }, [uploadGeo]);

  const locationCountsByCountry = useMemo(() => {
    const map = new Map<string, { states: number; districts: number }>();
    for (const country of countries) {
      const countryStates = data.states.filter((s) => s.countryId === country.id);
      const stateIds = new Set(countryStates.map((s) => s.id));
      const districts = data.districts.filter((d) => stateIds.has(d.stateId)).length;
      map.set(country.id, { states: countryStates.length, districts });
    }
    return map;
  }, [countries, data.states, data.districts]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  }

  function resetLocationUi(preferDefaults = true) {
    setLocationSource(preferDefaults ? "defaults" : "none");
    setUploadGeo(null);
    setUploadName("");
    setUploadError("");
    setReplaceExisting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    resetLocationUi(true);
  }

  function startEdit(c: Country) {
    setCreating(false);
    setEditingId(c.id);
    setForm({
      id: c.id,
      name: c.name,
      code: c.code ?? "",
      flag: c.flag ?? "",
      currency: c.currency ?? "",
      currencySymbol: c.currencySymbol ?? "",
      exchangeRateToAED: c.exchangeRateToAED ?? 1,
      taxPct: c.taxPct ?? 5,
      taxLabel: c.taxLabel ?? "VAT",
      dialCode: c.dialCode ?? "",
      enabled: c.enabled !== false,
      comingSoon: Boolean(c.comingSoon),
    });
    resetLocationUi(false);
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetLocationUi(true);
  }

  async function handleFile(file: File | null) {
    setUploadError("");
    setUploadGeo(null);
    setUploadName("");
    if (!file) return;
    try {
      const geo = await parseLocationUpload(file);
      if (geo.length === 0) {
        setUploadError("No states found in this file.");
        return;
      }
      setUploadGeo(geo);
      setUploadName(file.name);
      setLocationSource("upload");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not read this file.");
    }
  }

  function downloadTemplate() {
    const blob = new Blob([LOCATION_UPLOAD_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "country-states-districts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (locationSource === "defaults" && !presetAvailable) {
      setUploadError(
        "No built-in states for this country code. Choose Upload or leave as None."
      );
      return;
    }
    if (locationSource === "upload" && !uploadGeo?.length) {
      setUploadError("Upload a CSV or JSON file with states and districts.");
      return;
    }

    const id = saveCountry({
      ...form,
      id: editingId ?? undefined,
      name: form.name.trim(),
    });

    let locMessage = "";
    if (locationSource === "defaults" && preset) {
      const result = importCountryLocations(id, preset, replaceExisting ? "replace" : "merge");
      locMessage = ` Loaded ${result.statesAdded} states and ${result.districtsAdded} districts from defaults.`;
    } else if (locationSource === "upload" && uploadGeo) {
      const result = importCountryLocations(id, uploadGeo, replaceExisting ? "replace" : "merge");
      locMessage = ` Imported ${result.statesAdded} states and ${result.districtsAdded} districts from file.`;
    }

    flash(
      (editing ? `Updated ${form.name}.` : `Added ${form.name}.`) + locMessage
    );
    cancel();
  }

  const showForm = creating || editingId !== null;

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Countries</h2>
            <p className="text-gray-500 text-sm mt-1">
              Add countries with currency, tax, and location settings. Currency and tax sync to
              host pricing for listings in each country.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add country
            </button>
          )}
        </div>

        {message && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            {message}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl border shadow-sm p-5 space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-green-600" />
                {editing ? `Edit ${editing.name}` : "New country"}
              </h3>
              <button
                type="button"
                onClick={cancel}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name (English)" required>
                <input
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="United Arab Emirates"
                  required
                />
              </Field>
              <Field label="Country code">
                <input
                  value={form.code ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm uppercase"
                  placeholder="AE"
                  maxLength={3}
                />
              </Field>
              <Field label="Flag emoji">
                <input
                  value={form.flag ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="🇦🇪"
                />
              </Field>
              <Field label="Currency code">
                <input
                  value={form.currency ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm uppercase"
                  placeholder="AED"
                />
              </Field>
              <Field label="Currency symbol">
                <input
                  value={form.currencySymbol ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, currencySymbol: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="د.إ"
                />
              </Field>
              <Field label="Dial code">
                <input
                  value={form.dialCode ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, dialCode: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="+971"
                />
              </Field>
              <Field label="Exchange rate to AED">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.exchangeRateToAED ?? 1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      exchangeRateToAED: Number(e.target.value) || 1,
                    }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Default tax rate (%)">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={form.taxPct ?? 5}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      taxPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Tax label">
                <input
                  value={form.taxLabel ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, taxLabel: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="VAT"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled !== false}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Active in filters &amp; listings
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(form.comingSoon)}
                  onChange={(e) => setForm((f) => ({ ...f, comingSoon: e.target.checked }))}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Coming soon (header switcher)
              </label>
            </div>

            <div className="border border-gray-100 rounded-2xl p-4 space-y-4 bg-gray-50/60">
              <div className="flex items-start gap-2">
                <MapPinned className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">States &amp; districts</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Load built-in locations for this country code, or upload a CSV/JSON file.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <SourceCard
                  active={locationSource === "none"}
                  title="None"
                  description="Save country only. Add locations later in Settings → Filter."
                  onClick={() => {
                    setLocationSource("none");
                    setUploadError("");
                  }}
                />
                <SourceCard
                  active={locationSource === "defaults"}
                  title="Use defaults"
                  description={
                    presetAvailable && presetSummary
                      ? `${presetSummary.states} states · ${presetSummary.districts} districts ready`
                      : form.code
                        ? `No preset for ${form.code.toUpperCase()} yet`
                        : "Enter a country code (e.g. AE, SA, IN)"
                  }
                  onClick={() => {
                    setLocationSource("defaults");
                    setUploadError("");
                  }}
                  disabled={!presetAvailable}
                />
                <SourceCard
                  active={locationSource === "upload"}
                  title="Upload file"
                  description={
                    uploadSummary
                      ? `${uploadName}: ${uploadSummary.states} states · ${uploadSummary.districts} districts`
                      : "CSV or JSON with state + district columns"
                  }
                  onClick={() => {
                    setLocationSource("upload");
                    setUploadError("");
                  }}
                />
              </div>

              {locationSource === "upload" && (
                <div className="space-y-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.json,.txt,text/csv,application/json"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 text-sm font-semibold border border-gray-300 bg-white hover:border-green-500 text-gray-700 px-3 py-2 rounded-xl"
                    >
                      <Upload className="w-4 h-4" />
                      Choose file
                    </button>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-700 px-3 py-2"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV template
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    CSV columns: <code className="bg-white px-1 rounded">state,district</code>. JSON:{" "}
                    <code className="bg-white px-1 rounded">
                      [{`{ "state": "…", "districts": ["…"] }`}]
                    </code>
                  </p>
                </div>
              )}

              {(locationSource === "defaults" || locationSource === "upload") && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Replace existing states/districts for this country
                </label>
              )}

              {uploadError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {uploadError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl"
              >
                <Check className="w-4 h-4" />
                Save country
              </button>
              <button
                type="button"
                onClick={cancel}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <ul className="divide-y">
            {countries.length === 0 && (
              <li className="p-8 text-center text-sm text-gray-500">
                No countries yet. Add one to populate filters across the site.
              </li>
            )}
            {countries.map((c) => {
              const active = c.enabled !== false;
              const counts = locationCountsByCountry.get(c.id) ?? { states: 0, districts: 0 };
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5",
                    editingId === c.id && "bg-green-50/50"
                  )}
                >
                  <span className="text-2xl leading-none w-9 text-center shrink-0">
                    {c.flag || "🏳️"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                      {c.code && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          {c.code}
                        </span>
                      )}
                      {!active && (
                        <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                      {c.comingSoon && (
                        <span className="text-[9px] bg-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full">
                          Soon
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {[c.currency, c.taxPct != null ? `${c.taxLabel ?? "VAT"} ${c.taxPct}%` : null, c.dialCode]
                        .filter(Boolean)
                        .join(" · ") || "No marketplace details"}
                      {" · "}
                      {counts.states} states · {counts.districts} districts
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete "${c.name}"? States and districts under this country will also be removed.`
                          )
                        ) {
                          deleteCountry(c.id);
                          if (editingId === c.id) cancel();
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AdminDashboardShell>
  );
}

function SourceCard({
  active,
  title,
  description,
  onClick,
  disabled,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-start rounded-xl border px-3 py-3 transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        active
          ? "border-green-600 bg-white ring-1 ring-green-600"
          : "border-gray-200 bg-white hover:border-green-400"
      )}
    >
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="text-[11px] text-gray-500 mt-1 leading-snug">{description}</div>
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
