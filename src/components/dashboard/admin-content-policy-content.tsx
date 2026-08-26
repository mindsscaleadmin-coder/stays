"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  BookOpen,
  FileText,
  Globe,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  Send,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useAdminContentPolicy } from "@/lib/admin/use-admin-content-policy";
import { newContentPolicyId } from "@/lib/admin/content-policy-data";
import {
  formatAudienceLabel,
  isAllHostsAudience,
  type AnnouncementAudience,
} from "@/lib/admin/announcement-audience";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { isFilterEnabled } from "@/lib/admin/taxonomy-types";
import type {
  CancellationPolicyOption,
  HouseRuleTemplate,
  MessageTemplate,
} from "@/lib/admin/content-policy-types";
import { cn } from "@/lib/utils";

type TabId = "policies" | "announcements" | "templates" | "cms";

const TABS: { id: TabId; label: string }[] = [
  { id: "policies", label: "Policies & rules" },
  { id: "announcements", label: "Host announcements" },
  { id: "templates", label: "Email & SMS" },
  { id: "cms", label: "Homepage & CMS" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function AudienceCheckList({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
      <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-0.5 bg-white">
        {options.length === 0 ? (
          <p className="text-xs text-gray-400 px-1 py-1">None configured</p>
        ) : (
          options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1 rounded hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => onToggle(opt.value)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              {opt.label}
            </label>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        {selected.length === 0 ? "All" : `${selected.length} selected`}
      </p>
    </div>
  );
}

export function AdminContentPolicyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "policies";

  const {
    ready,
    settings,
    approvedListings,
    draftAnnouncementCount,
    disabledTemplateCount,
    saveHouseRuleTemplates,
    saveCancellationPolicies,
    addAnnouncement,
    removeAnnouncement,
    pushAnnouncement,
    pushAnnouncementNow,
    saveMessageTemplates,
    saveCms,
    toggleFeaturedListing,
    addBlogPost,
    updateBlogPost,
    removeBlogPost,
    toggleCmsSection,
  } = useAdminContentPolicy();

  const { data: taxonomy } = useAdminTaxonomy();
  const [message, setMessage] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annCountries, setAnnCountries] = useState<string[]>([]);
  const [annParents, setAnnParents] = useState<string[]>([]);
  const [annCategories, setAnnCategories] = useState<string[]>([]);

  const setTab = useCallback(
    (tab: TabId) => router.replace(`/admin/content?tab=${tab}`),
    [router]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const publishedBlogCount = useMemo(
    () => settings.cms.blogPosts.filter((p) => p.published).length,
    [settings.cms.blogPosts]
  );

  const countryOptions = useMemo(
    () =>
      filterActiveCountries(taxonomy.countries).map((country) => ({
        value: country.name,
        label: country.name,
      })),
    [taxonomy.countries]
  );

  const parentOptions = useMemo(
    () =>
      taxonomy.parents
        .filter((parent) => isFilterEnabled(parent))
        .map((parent) => ({ value: parent.name, label: parent.name })),
    [taxonomy.parents]
  );

  const categoryOptions = useMemo(() => {
    const selectedParentIds = new Set(
      taxonomy.parents
        .filter((parent) => isFilterEnabled(parent) && annParents.includes(parent.name))
        .map((parent) => parent.id)
    );
    return taxonomy.categories
      .filter((category) => {
        if (!isFilterEnabled(category)) return false;
        if (selectedParentIds.size === 0) return true;
        return selectedParentIds.has(category.parentId);
      })
      .map((category) => ({ value: category.name, label: category.name }));
  }, [taxonomy.categories, taxonomy.parents, annParents]);

  const announcementAudience = useMemo<AnnouncementAudience>(
    () => ({
      countries: annCountries,
      parentCategories: annParents,
      categories: annCategories,
    }),
    [annCountries, annParents, annCategories]
  );

  function resetAnnouncementForm() {
    setAnnTitle("");
    setAnnMessage("");
    setAnnCountries([]);
    setAnnParents([]);
    setAnnCategories([]);
  }

  if (!ready) {
    return (
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AdminDashboardShell>
    );
  }

  function updateHouseRule(index: number, patch: Partial<HouseRuleTemplate>) {
    const next = [...settings.houseRuleTemplates];
    next[index] = { ...next[index], ...patch };
    saveHouseRuleTemplates(next);
  }

  function updateCancellation(index: number, patch: Partial<CancellationPolicyOption>) {
    const next = [...settings.cancellationPolicies];
    next[index] = { ...next[index], ...patch };
    saveCancellationPolicies(next);
  }

  function updateTemplate(index: number, patch: Partial<MessageTemplate>) {
    const next = [...settings.messageTemplates];
    next[index] = { ...next[index], ...patch };
    saveMessageTemplates(next);
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Content & Policy Control</h2>
          <p className="text-gray-500 text-sm mt-1">
            House rules templates, cancellation policies, host announcements, message templates, and homepage CMS.
            {draftAnnouncementCount > 0 && (
              <span className="text-amber-600 font-medium">
                {" "}
                {draftAnnouncementCount} announcement{draftAnnouncementCount === 1 ? "" : "s"} not yet pushed.
              </span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Rule templates", value: settings.houseRuleTemplates.filter((t) => t.enabled).length, icon: Shield },
            { label: "Cancel policies", value: settings.cancellationPolicies.filter((p) => p.enabled).length, icon: FileText },
            { label: "Draft announcements", value: draftAnnouncementCount, icon: Megaphone },
            { label: "Published blog posts", value: publishedBlogCount, icon: BookOpen },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold font-display text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
              {tab.id === "announcements" && draftAnnouncementCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {draftAnnouncementCount}
                </span>
              )}
              {tab.id === "templates" && disabledTemplateCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {disabledTemplateCount} off
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "policies" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-700" /> House rules templates
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Hosts pick from these when configuring listings — synced to host listing editor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveHouseRuleTemplates([
                      ...settings.houseRuleTemplates,
                      {
                        id: newContentPolicyId("hr"),
                        title: "New rule",
                        description: "",
                        enabled: true,
                      },
                    ]);
                    flash("Template added.");
                  }}
                  className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add template
                </button>
              </div>
              <div className="space-y-3">
                {settings.houseRuleTemplates.map((rule, index) => (
                  <article key={rule.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Template {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => updateHouseRule(index, { enabled: e.target.checked })}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            saveHouseRuleTemplates(settings.houseRuleTemplates.filter((r) => r.id !== rule.id));
                            flash("Template removed.");
                          }}
                          className="p-1 rounded text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={rule.title}
                      onChange={(e) => updateHouseRule(index, { title: e.target.value })}
                      placeholder="Rule title"
                      className={inputClass}
                    />
                    <textarea
                      value={rule.description}
                      onChange={(e) => updateHouseRule(index, { description: e.target.value })}
                      rows={2}
                      placeholder="Rule description"
                      className={cn(inputClass, "resize-none")}
                    />
                  </article>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-700" /> Cancellation policy options
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tiers hosts can choose from when setting listing policies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveCancellationPolicies([
                      ...settings.cancellationPolicies,
                      {
                        id: newContentPolicyId("cp"),
                        label: "Custom policy",
                        shortDescription: "",
                        fullText: "",
                        refundDaysBefore: 7,
                        refundPercent: 50,
                        enabled: true,
                      },
                    ]);
                    flash("Policy added.");
                  }}
                  className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add policy
                </button>
              </div>
              <div className="space-y-3">
                {settings.cancellationPolicies.map((policy, index) => (
                  <article key={policy.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={policy.label}
                        onChange={(e) => updateCancellation(index, { label: e.target.value })}
                        className={cn(inputClass, "font-semibold")}
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 shrink-0">
                        <input
                          type="checkbox"
                          checked={policy.enabled}
                          onChange={(e) => updateCancellation(index, { enabled: e.target.checked })}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Enabled
                      </label>
                    </div>
                    <input
                      value={policy.shortDescription}
                      onChange={(e) => updateCancellation(index, { shortDescription: e.target.value })}
                      placeholder="Short description for host picker"
                      className={inputClass}
                    />
                    <textarea
                      value={policy.fullText}
                      onChange={(e) => updateCancellation(index, { fullText: e.target.value })}
                      rows={3}
                      placeholder="Full policy text shown to guests"
                      className={cn(inputClass, "resize-none")}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs text-gray-500">
                        Refund days before
                        <input
                          type="number"
                          min={0}
                          value={policy.refundDaysBefore}
                          onChange={(e) =>
                            updateCancellation(index, { refundDaysBefore: Number(e.target.value) || 0 })
                          }
                          className={cn(inputClass, "mt-1")}
                        />
                      </label>
                      <label className="block text-xs text-gray-500">
                        Refund %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={policy.refundPercent}
                          onChange={(e) =>
                            updateCancellation(index, { refundPercent: Number(e.target.value) || 0 })
                          }
                          className={cn(inputClass, "mt-1")}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-green-700" /> Host announcement
              </h3>
              <p className="text-xs text-gray-500">
                Shows on matching host overviews and notification inboxes. Leave a group unchecked
                to include all in that group.
              </p>
              <input
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement title"
                className={inputClass}
              />
              <textarea
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                rows={3}
                placeholder="Message body…"
                className={cn(inputClass, "resize-none")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AudienceCheckList
                  label="Countries"
                  options={countryOptions}
                  selected={annCountries}
                  onToggle={(value) => setAnnCountries((prev) => toggleListValue(prev, value))}
                />
                <AudienceCheckList
                  label="Parent categories"
                  options={parentOptions}
                  selected={annParents}
                  onToggle={(value) => {
                    const nextParents = toggleListValue(annParents, value);
                    setAnnParents(nextParents);
                    const allowedParentIds = new Set(
                      taxonomy.parents
                        .filter(
                          (parent) =>
                            isFilterEnabled(parent) && nextParents.includes(parent.name)
                        )
                        .map((parent) => parent.id)
                    );
                    setAnnCategories((prev) =>
                      prev.filter((name) => {
                        if (allowedParentIds.size === 0) return true;
                        return taxonomy.categories.some(
                          (category) =>
                            category.name === name && allowedParentIds.has(category.parentId)
                        );
                      })
                    );
                  }}
                />
                <AudienceCheckList
                  label="Categories"
                  options={categoryOptions}
                  selected={annCategories}
                  onToggle={(value) => setAnnCategories((prev) => toggleListValue(prev, value))}
                />
              </div>
              <p className="text-xs text-gray-500">
                Audience: {formatAudienceLabel(announcementAudience)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!annTitle.trim() || !annMessage.trim()}
                  onClick={() => {
                    addAnnouncement({
                      title: annTitle.trim(),
                      message: annMessage.trim(),
                      priority: "high",
                      ...announcementAudience,
                    });
                    resetAnnouncementForm();
                    flash("Draft saved — push when ready.");
                  }}
                  className="text-xs font-semibold border border-gray-200 hover:border-green-400 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={!annTitle.trim() || !annMessage.trim()}
                  onClick={() => {
                    pushAnnouncementNow({
                      title: annTitle.trim(),
                      message: annMessage.trim(),
                      priority: "high",
                      ...announcementAudience,
                    });
                    resetAnnouncementForm();
                    flash(
                      isAllHostsAudience(announcementAudience)
                        ? "Announcement shown on host overviews."
                        : `Announcement shown for ${formatAudienceLabel(announcementAudience)}.`
                    );
                  }}
                  className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Save & push now
                </button>
              </div>
            </section>

            <div className="space-y-3">
              {settings.platformAnnouncements.map((ann) => (
                <article key={ann.id} className="bg-white rounded-2xl border p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                            ann.status === "sent"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {ann.status}
                        </span>
                        {ann.priority === "high" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            High priority
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{ann.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatAudienceLabel(ann)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created {new Date(ann.createdAt).toLocaleString("en-GB")}
                        {ann.pushedAt && ` · Pushed ${new Date(ann.pushedAt).toLocaleString("en-GB")}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {ann.status !== "sent" && (
                        <button
                          type="button"
                          onClick={() => {
                            pushAnnouncement(ann.id);
                            flash(
                              `Pushed to ${formatAudienceLabel(ann).toLowerCase()}.`
                            );
                          }}
                          className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> Push
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          removeAnnouncement(ann.id);
                          flash("Announcement removed.");
                        }}
                        className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Automated templates for booking confirmations, reminders, payouts, and policy notices. Use{" "}
              <code className="text-[10px] bg-gray-100 px-1 rounded">{`{{variableName}}`}</code> placeholders.
            </p>
            {settings.messageTemplates.map((tpl, index) => (
              <article key={tpl.id} className="bg-white rounded-2xl border p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      tpl.channel === "email" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}
                  >
                    {tpl.channel}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {tpl.audience}
                  </span>
                  <input
                    value={tpl.name}
                    onChange={(e) => updateTemplate(index, { name: e.target.value })}
                    className={cn(inputClass, "flex-1 min-w-[140px] font-semibold")}
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 ms-auto">
                    <input
                      type="checkbox"
                      checked={tpl.enabled}
                      onChange={(e) => updateTemplate(index, { enabled: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    Active
                  </label>
                </div>
                {tpl.channel === "email" && (
                  <input
                    value={tpl.subject ?? ""}
                    onChange={(e) => updateTemplate(index, { subject: e.target.value })}
                    placeholder="Email subject"
                    className={inputClass}
                  />
                )}
                <textarea
                  value={tpl.body}
                  onChange={(e) => updateTemplate(index, { body: e.target.value })}
                  rows={4}
                  className={cn(inputClass, "resize-none font-mono text-xs")}
                />
                <p className="text-[10px] text-gray-400">
                  Variables: {tpl.variables.map((v) => `{{${v}}}`).join(", ")}
                </p>
              </article>
            ))}
          </div>
        )}

        {activeTab === "cms" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-700" /> Homepage hero
              </h3>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.cms.heroEnabled}
                  onChange={(e) => saveCms({ ...settings.cms, heroEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Override default hero with CMS copy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={settings.cms.heroTitle}
                  onChange={(e) => saveCms({ ...settings.cms, heroTitle: e.target.value })}
                  placeholder="Hero line 1"
                  className={inputClass}
                />
                <input
                  value={settings.cms.heroHighlight}
                  onChange={(e) => saveCms({ ...settings.cms, heroHighlight: e.target.value })}
                  placeholder="Highlighted phrase"
                  className={inputClass}
                />
                <input
                  value={settings.cms.heroTitleEnd}
                  onChange={(e) => saveCms({ ...settings.cms, heroTitleEnd: e.target.value })}
                  placeholder="Hero line end"
                  className={inputClass}
                />
                <input
                  value={settings.cms.heroSubtitle}
                  onChange={(e) => saveCms({ ...settings.cms, heroSubtitle: e.target.value })}
                  placeholder="Subtitle"
                  className={inputClass}
                />
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-700" /> Featured farms
              </h3>
              <p className="text-xs text-gray-500">
                Curated listings promoted on homepage — syncs featured flag on approved listings.
              </p>
              <div className="space-y-2">
                {approvedListings.length === 0 ? (
                  <p className="text-sm text-gray-400">No approved listings yet.</p>
                ) : (
                  approvedListings.map((listing) => {
                    const featured = settings.cms.featuredListingIds.includes(listing.id);
                    return (
                      <label
                        key={listing.id}
                        className={cn(
                          "flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors",
                          featured ? "border-green-200 bg-green-50/50" : "border-gray-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={featured}
                          onChange={() => {
                            toggleFeaturedListing(listing.id);
                            flash(featured ? "Removed from featured." : "Added to featured farms.");
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
                          <p className="text-xs text-gray-500">
                            {listing.hostName} · {listing.city}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-700" /> Blog & content
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    addBlogPost({
                      title: "New post",
                      excerpt: "",
                      slug: `post-${Date.now()}`,
                      published: false,
                    });
                    flash("Blog post added.");
                  }}
                  className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add post
                </button>
              </div>
              <div className="space-y-3">
                {settings.cms.blogPosts.map((post) => (
                  <article key={post.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <input
                        value={post.title}
                        onChange={(e) => updateBlogPost(post.id, { title: e.target.value })}
                        className={cn(inputClass, "font-semibold")}
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 shrink-0">
                        <input
                          type="checkbox"
                          checked={post.published}
                          onChange={(e) =>
                            updateBlogPost(post.id, {
                              published: e.target.checked,
                              publishedAt: e.target.checked
                                ? new Date().toISOString()
                                : undefined,
                            })
                          }
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Published
                      </label>
                    </div>
                    <input
                      value={post.slug}
                      onChange={(e) => updateBlogPost(post.id, { slug: e.target.value })}
                      placeholder="URL slug"
                      className={inputClass}
                    />
                    <textarea
                      value={post.excerpt}
                      onChange={(e) => updateBlogPost(post.id, { excerpt: e.target.value })}
                      rows={2}
                      placeholder="Excerpt"
                      className={cn(inputClass, "resize-none")}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        removeBlogPost(post.id);
                        flash("Post removed.");
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete post
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-700" /> Homepage sections
              </h3>
              <p className="text-xs text-gray-500">Toggle visibility of homepage content blocks.</p>
              {settings.cms.contentSections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                    {section.subtitle && (
                      <p className="text-xs text-gray-500">{section.subtitle}</p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => {
                      toggleCmsSection(section.id);
                      flash(`${section.title} ${section.enabled ? "hidden" : "shown"}.`);
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </label>
              ))}
            </section>
          </div>
        )}
      </div>
    </AdminDashboardShell>
  );
}
