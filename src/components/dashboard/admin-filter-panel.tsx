"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Layers, Pencil, Plus, Sparkles, Trash2, X, Check } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import type { FilterTab } from "@/lib/admin/taxonomy-types";
import {
  isBuiltInMainTab,
  isDefaultPropertyTab,
  isFilterEnabled,
  resolveBuiltInMainTabId,
} from "@/lib/admin/taxonomy-types";
import { cn } from "@/lib/utils";

interface AdminFilterPanelProps {
  showTitle?: boolean;
}

export function AdminFilterPanel({ showTitle = true }: AdminFilterPanelProps) {
  const taxonomy = useAdminTaxonomy();
  const { data, ready, addMainTab, editMainTab, deleteMainTab, setMainTabEnabled } = taxonomy;
  const allTabs = data.mainTabs;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const countryFromUrl = searchParams.get("country") || "";
  const stateFromUrl = searchParams.get("state") || "";
  const districtFromUrl = searchParams.get("district") || "";
  const allowedTabIds = allTabs.map((t) => t.id);
  const activeTab =
    tabParam && allowedTabIds.includes(tabParam) ? tabParam : (allowedTabIds[0] ?? "country");
  const [addingTab, setAddingTab] = useState(false);

  function selectTab(id: string) {
    const params = new URLSearchParams();
    params.set("tab", id);
    const geoTabs = new Set(["state", "district", "city"]);
    if (geoTabs.has(id) && countryFromUrl) params.set("country", countryFromUrl);
    if ((id === "district" || id === "city") && stateFromUrl) params.set("state", stateFromUrl);
    if (id === "city" && districtFromUrl) params.set("district", districtFromUrl);
    router.replace(`/admin/settings/filters?${params.toString()}`);
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-8 text-sm text-gray-400">
        Loading locations and filters…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-5 border-b">
        {showTitle && (
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-green-600" />
            Filter control panel
          </h3>
        )}
        <p className="text-xs text-gray-500 mt-0.5">
          Manage locations and category filters used across listings and search. Country opens by
          default. Add cities on the City tab after picking a district — they belong to that
          district, not to the whole country.
        </p>
      </div>

      <FilterTabBar
        tabs={allTabs}
        activeTab={activeTab}
        onSelect={selectTab}
        accent="green"
        onAddingChange={setAddingTab}
        onAdd={(label) => {
          const id = addMainTab(label);
          if (!id) {
            alert(
              `Could not add "${label}". Use a unique filter tab name — built-in names like Country, Parent Category, Category, and Sub Category already exist. Country names belong in Countries.`
            );
            return;
          }
          selectTab(id);
        }}
        onEdit={(id, label) => editMainTab(id, label)}
        deleteLockReason={(tab) =>
          Boolean(tab.builtIn) ||
          isDefaultPropertyTab(tab.id) ||
          ["country", "state", "district", "city"].includes(tab.id)
            ? `"${tab.label}" is a built-in tab and cannot be deleted. Untick Active to hide it from listing forms and search.`
            : null
        }
        onDelete={(id) => {
          const deleted = deleteMainTab(id);
          if (deleted) {
            selectTab(allTabs.find((t) => t.id !== id)?.id ?? "country");
          }
          return deleted;
        }}
        onToggleEnabled={setMainTabEnabled}
      />

      <div className="p-5">
        <MainTabContent
          tabId={activeTab}
          hideAdd={addingTab}
          initialCountryId={countryFromUrl}
          initialStateId={stateFromUrl}
          initialDistrictId={districtFromUrl}
        />
      </div>
    </div>
  );
}

export function AdminExtraFiltersPanel() {
  const { data, addExtraTab, editExtraTab, deleteExtraTab, setExtraTabEnabled } =
    useAdminTaxonomy();
  const [activeTab, setActiveTab] = useState(data.extraTabs[0]?.id ?? "amenity");
  const [addingTab, setAddingTab] = useState(false);

  useEffect(() => {
    if (!data.extraTabs.some((t) => t.id === activeTab)) {
      setActiveTab(data.extraTabs[0]?.id ?? "amenity");
    }
  }, [data.extraTabs, activeTab]);

  const activeLabel = data.extraTabs.find((t) => t.id === activeTab)?.label ?? "Extra filter";

  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-5 border-b">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Extra filters
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Amenities, tags, price ranges, and activities for search and listing filters. Optionally
          tag each option to a parent category (Stays, Experiences, …) so listing forms only show
          relevant choices. Leave parent as All to show everywhere. Toggle Active to show or hide
          options.
        </p>
      </div>

      <FilterTabBar
        tabs={data.extraTabs}
        activeTab={activeTab}
        onSelect={setActiveTab}
        accent="blue"
        onAddingChange={setAddingTab}
        onAdd={(label) => {
          const id = addExtraTab(label);
          if (!id) {
            alert(`A tab named "${label}" already exists.`);
            return;
          }
          setActiveTab(id);
        }}
        onEdit={(id, label) => editExtraTab(id, label)}
        deleteLockReason={(tab) =>
          tab.builtIn
            ? `"${tab.label}" is a built-in tab and cannot be deleted. Untick Active to hide it from listing forms and search.`
            : null
        }
        onDelete={(id) => {
          const deleted = deleteExtraTab(id);
          if (deleted) {
            setActiveTab(data.extraTabs.find((t) => t.id !== id)?.id ?? "amenity");
          }
          return deleted;
        }}
        onToggleEnabled={setExtraTabEnabled}
      />

      <div className="p-5">
        <ExtraTabContent tabId={activeTab} title={activeLabel} hideAdd={addingTab} />
      </div>
    </div>
  );
}

export function AdminFeatureFiltersPanel() {
  const { data, addFeatureFilter, editFeatureFilter, deleteFeatureFilter, setFeatureFilterEnabled } =
    useAdminTaxonomy();

  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-5 border-b">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Feature filters
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Category-specific features shown in the advanced search filter popup. Tag each feature to a
          parent category, and optionally to a sub category.
        </p>
      </div>

      <div className="p-5">
        <ItemCrud
          title="Features"
          items={data.featureFilters.map((ff) => ({
            id: ff.id,
            name: ff.name,
            enabled: isFilterEnabled(ff),
            parentLabel: data.parents.find((p) => p.id === ff.parentId)?.name ?? "—",
            tagId: ff.subcategoryId,
            tagLabel: data.subcategories.find((sc) => sc.id === ff.subcategoryId)?.name,
          }))}
          parentOptions={data.parents
            .filter((p) => isFilterEnabled(p))
            .map((p) => ({ value: p.id, label: p.name }))}
          parentLabel="Parent category"
          tagOptions={data.subcategories
            .filter((sc) => isFilterEnabled(sc))
            .map((sc) => ({
              value: sc.id,
              label: sc.name,
              parentValue: sc.parentId,
            }))}
          tagLabel="Sub category"
          onAdd={(name, pid, tagId) => addFeatureFilter(name, pid!, tagId)}
          onEdit={(id, name, pid, tagId) => editFeatureFilter(id, name, pid!, tagId)}
          onDelete={deleteFeatureFilter}
          onToggleEnabled={setFeatureFilterEnabled}
          placeholder="e.g. Private Pool"
        />
      </div>
    </div>
  );
}

function FilterTabBar({
  tabs,
  activeTab,
  onSelect,
  accent,
  onAdd,
  onEdit,
  onDelete,
  deleteLockReason,
  onToggleEnabled,
  onAddingChange,
}: {
  tabs: FilterTab[];
  activeTab: string;
  onSelect: (id: string) => void;
  accent: "green" | "blue";
  onAdd: (label: string) => void;
  onEdit: (id: string, label: string) => void;
  /** Returns false when the tab could not be removed. */
  onDelete: (id: string) => boolean | void;
  /** Non-null message means the tab cannot be deleted, only deactivated. */
  deleteLockReason?: (tab: FilterTab) => string | null;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onAddingChange?: (adding: boolean) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [notice, setNotice] = useState("");

  const active = tabs.find((t) => t.id === activeTab);
  const activeEnabled = isFilterEnabled(active);
  const lockReason = active ? (deleteLockReason?.(active) ?? null) : null;

  const activeCls = accent === "green" ? "bg-green-700 text-white" : "bg-blue-600 text-white";
  const btnCls =
    accent === "green"
      ? "bg-green-700 hover:bg-green-800 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  useEffect(() => {
    setConfirmingDelete(false);
    setNotice("");
  }, [activeTab]);

  function setAddingState(next: boolean) {
    setAdding(next);
    onAddingChange?.(next);
  }

  function requestDelete() {
    if (!active) return;
    setEditing(false);
    setAddingState(false);
    setNotice("");
    if (lockReason) {
      setConfirmingDelete(false);
      setNotice(lockReason);
      return;
    }
    setConfirmingDelete(true);
  }

  function confirmDelete() {
    if (!active) return;
    const removed = onDelete(active.id);
    setConfirmingDelete(false);
    if (removed === false) {
      setNotice(`"${active.label}" could not be deleted.`);
    }
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onAdd(newLabel.trim());
    setNewLabel("");
    setAddingState(false);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !editLabel.trim()) return;
    onEdit(active.id, editLabel.trim());
    setEditing(false);
  }

  return (
    <div className="border-b bg-gray-50">
      <div className="flex flex-wrap items-center gap-2 p-3">
        {tabs.map((tab) => {
          const enabled = isFilterEnabled(tab);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSelect(tab.id);
                setEditing(false);
                setAddingState(false);
                setConfirmingDelete(false);
                setNotice("");
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? activeCls
                  : enabled
                    ? "text-gray-600 hover:bg-white hover:text-gray-900"
                    : "text-gray-400 line-through hover:bg-white"
              )}
              title={enabled ? tab.label : `${tab.label} (inactive)`}
            >
              {tab.label}
            </button>
          );
        })}

        <div className="flex items-center gap-1 ms-auto shrink-0">
          {onToggleEnabled && active && (
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={activeEnabled}
                onChange={(e) => onToggleEnabled(active.id, e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              Active
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              setAddingState(!adding);
              setEditing(false);
            }}
            className={cn("inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold", btnCls)}
          >
            <Plus className="w-3.5 h-3.5" /> Add tab
          </button>
          <button
            type="button"
            disabled={!active}
            onClick={() => {
              if (!active) return;
              setEditLabel(active.label);
              setEditing(true);
              setAddingState(false);
              setConfirmingDelete(false);
              setNotice("");
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            disabled={!active}
            onClick={requestDelete}
            title={lockReason ?? undefined}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {confirmingDelete && active && (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
          <p className="text-xs text-gray-700 flex-1 min-w-[200px]">
            Delete <span className="font-semibold">{active.label}</span> and all of its items?
            This cannot be undone.
          </p>
          <button
            type="button"
            onClick={confirmDelete}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
          >
            Delete tab
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="mx-3 mb-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
        >
          {notice}
        </p>
      )}

      {adding && (
        <form onSubmit={submitAdd} className="flex flex-wrap items-center gap-2 px-3 pb-3">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New tab name..."
            className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <button type="submit" className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold", btnCls)}>
            <Check className="w-3.5 h-3.5 inline" /> Save tab
          </button>
          <button
            type="button"
            onClick={() => setAddingState(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-gray-600"
          >
            Cancel
          </button>
        </form>
      )}

      {editing && active && (
        <form onSubmit={submitEdit} className="flex flex-wrap items-center gap-2 px-3 pb-3">
          <span className="text-xs text-gray-500">Rename &quot;{active.label}&quot;:</span>
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <button type="submit" className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold", btnCls)}>
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-gray-600"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

function MainTabContent({
  tabId,
  hideAdd = false,
  initialCountryId = "",
  initialStateId = "",
  initialDistrictId = "",
}: {
  tabId: string;
  hideAdd?: boolean;
  initialCountryId?: string;
  initialStateId?: string;
  initialDistrictId?: string;
}) {
  const taxonomy = useAdminTaxonomy();
  const { data } = taxonomy;
  const tab = data.mainTabs.find((t) => t.id === tabId);
  const builtInId =
    (tab ? resolveBuiltInMainTabId(tab) : null) ??
    (isBuiltInMainTab(tabId) ? tabId : null);

  if (builtInId) {
    switch (builtInId) {
      case "country":
        return (
          <ItemCrud
            title="Countries"
            hideAdd={hideAdd}
            nameColumnLabel="Country"
            detailColumnLabel="Locations"
            items={data.countries.map((c) => {
              const countryStates = data.states.filter((s) => s.countryId === c.id);
              const stateIds = new Set(countryStates.map((s) => s.id));
              const districts = data.districts.filter((d) => stateIds.has(d.stateId)).length;
              return {
                id: c.id,
                name: c.name,
                enabled: isFilterEnabled(c),
                detail: `${countryStates.length} states · ${districts} districts`,
                href: `/admin/settings/filters?tab=state&country=${encodeURIComponent(c.id)}`,
              };
            })}
            onAdd={(name) => taxonomy.addCountry(name)}
            onEdit={(id, name) => taxonomy.editCountry(id, name)}
            onDelete={taxonomy.deleteCountry}
            onToggleEnabled={taxonomy.setCountryEnabled}
            placeholder="e.g. United Arab Emirates"
          />
        );
      case "state":
        return (
          <ItemCrud
            title="States / Emirates"
            hideAdd={hideAdd}
            nameColumnLabel="State"
            items={data.states.map((s) => ({
              id: s.id,
              name: s.name,
              enabled: isFilterEnabled(s),
              parentId: s.countryId,
              parentLabel: data.countries.find((c) => c.id === s.countryId)?.name ?? "—",
            }))}
            parentOptions={data.countries.map((c) => ({ value: c.id, label: c.name }))}
            parentLabel="Country"
            initialParentId={initialCountryId}
            onAdd={(name, pid) => taxonomy.addState(name, pid!)}
            onEdit={(id, name, pid) => taxonomy.editState(id, name, pid!)}
            onDelete={taxonomy.deleteState}
            onToggleEnabled={taxonomy.setStateEnabled}
            placeholder="e.g. Abu Dhabi"
          />
        );
      case "district":
        return (
          <ItemCrud
            title="Districts"
            hideAdd={hideAdd}
            nameColumnLabel="District"
            detailColumnLabel="Cities"
            items={data.districts.map((d) => {
              const state = data.states.find((s) => s.id === d.stateId);
              const cityCount = (data.cities ?? []).filter((c) => c.districtId === d.id).length;
              return {
                id: d.id,
                name: d.name,
                enabled: isFilterEnabled(d),
                parentId: d.stateId,
                parentLabel: state?.name ?? "—",
                groupId: state?.countryId,
                detail: `${cityCount} cities`,
                href: `/admin/settings/filters?tab=city&country=${encodeURIComponent(state?.countryId ?? "")}&state=${encodeURIComponent(d.stateId)}&district=${encodeURIComponent(d.id)}`,
              };
            })}
            groupOptions={data.countries.map((c) => ({ value: c.id, label: c.name }))}
            groupLabel="Country"
            initialGroupId={initialCountryId}
            parentOptions={data.states.map((s) => ({
              value: s.id,
              label: s.name,
              groupValue: s.countryId,
            }))}
            parentLabel="State"
            initialParentId={initialStateId}
            onAdd={(name, pid) => taxonomy.addDistrict(name, pid!)}
            onEdit={(id, name, pid) => taxonomy.editDistrict(id, name, pid!)}
            onDelete={taxonomy.deleteDistrict}
            onToggleEnabled={taxonomy.setDistrictEnabled}
            placeholder="e.g. Idukki"
          />
        );
      case "city":
        return (
          <ItemCrud
            title="Cities"
            hideAdd={hideAdd}
            nameColumnLabel="City"
            requireParentScope
            items={(data.cities ?? []).map((c) => {
              const district = data.districts.find((d) => d.id === c.districtId);
              const state = data.states.find((s) => s.id === district?.stateId);
              return {
                id: c.id,
                name: c.name,
                enabled: isFilterEnabled(c),
                parentId: c.districtId,
                parentLabel: district?.name ?? "—",
                midId: district?.stateId,
                midLabel: state?.name ?? "—",
                groupId: state?.countryId,
              };
            })}
            groupOptions={data.countries.map((c) => ({ value: c.id, label: c.name }))}
            groupLabel="Country"
            initialGroupId={initialCountryId}
            midOptions={data.states.map((s) => ({
              value: s.id,
              label: s.name,
              groupValue: s.countryId,
            }))}
            midLabel="State"
            initialMidId={initialStateId}
            parentOptions={data.districts.map((d) => {
              const state = data.states.find((s) => s.id === d.stateId);
              return {
                value: d.id,
                label: d.name,
                groupValue: state?.countryId,
                midValue: d.stateId,
              };
            })}
            parentLabel="District"
            initialParentId={initialDistrictId}
            onAdd={(name, pid) => taxonomy.addCity(name, pid!)}
            onEdit={(id, name, pid) => taxonomy.editCity(id, name, pid!)}
            onDelete={taxonomy.deleteCity}
            onToggleEnabled={taxonomy.setCityEnabled}
            placeholder="e.g. Munnar"
            addButtonLabel="Add city"
            emptyParentMessage="Pick a district first, then add cities that belong to it."
          />
        );
      case "parent":
        return (
          <ItemCrud
            title="Parent categories"
            hideAdd={hideAdd}
            nameColumnLabel="Parent category"
            items={data.parents.map((p) => ({
              id: p.id,
              name: p.name,
              enabled: isFilterEnabled(p),
            }))}
            onAdd={(name) => taxonomy.addParent(name)}
            onEdit={(id, name) => taxonomy.editParent(id, name)}
            onDelete={taxonomy.deleteParent}
            onToggleEnabled={taxonomy.setParentEnabled}
            placeholder="e.g. Stays"
          />
        );
      case "category":
        return (
          <ItemCrud
            title="Categories"
            hideAdd={hideAdd}
            nameColumnLabel="Category"
            items={data.categories.map((c) => ({
              id: c.id,
              name: c.name,
              enabled: isFilterEnabled(c),
              parentLabel: data.parents.find((p) => p.id === c.parentId)?.name ?? "—",
            }))}
            parentOptions={data.parents
              .filter((p) => isFilterEnabled(p))
              .map((p) => ({ value: p.id, label: p.name }))}
            parentLabel="Parent category"
            onAdd={(name, pid) => taxonomy.addCategory(name, pid!)}
            onEdit={(id, name, pid) => taxonomy.editCategory(id, name, pid!)}
            onDelete={taxonomy.deleteCategory}
            onToggleEnabled={taxonomy.setCategoryEnabled}
            placeholder="e.g. Farm Stays"
            addButtonLabel="Add category"
            emptyParentMessage="Add a parent category first (Parent Category tab), then you can add categories here."
          />
        );
      case "subcategory":
        return (
          <ItemCrud
            title="Sub categories"
            hideAdd={hideAdd}
            nameColumnLabel="Sub category"
            items={data.subcategories.map((sc) => {
              const cat = data.categories.find((c) => c.id === sc.categoryId);
              const parentName = data.parents.find((p) => p.id === (cat?.parentId ?? sc.parentId))?.name;
              return {
                id: sc.id,
                name: sc.name,
                enabled: isFilterEnabled(sc),
                parentLabel: cat
                  ? parentName
                    ? `${cat.name} (${parentName})`
                    : cat.name
                  : "—",
              };
            })}
            parentOptions={data.categories
              .filter((c) => isFilterEnabled(c))
              .map((c) => {
                const parentName = data.parents.find((p) => p.id === c.parentId)?.name;
                return {
                  value: c.id,
                  label: parentName ? `${c.name} (${parentName})` : c.name,
                };
              })}
            parentLabel="Category"
            onAdd={(name, pid) => taxonomy.addSubcategory(name, pid!)}
            onEdit={(id, name, pid) => taxonomy.editSubcategory(id, name, pid!)}
            onDelete={taxonomy.deleteSubcategory}
            onToggleEnabled={taxonomy.setSubcategoryEnabled}
            placeholder="e.g. Luxury Farm House"
            addButtonLabel="Add sub category"
            emptyParentMessage="Add a category first (Category tab), then you can add sub categories here."
          />
        );
    }
  }

  return (
    <ItemCrud
      title={tab?.label ?? "Custom filter"}
      hideAdd={hideAdd}
      nameColumnLabel={tab?.label ?? "Name"}
      items={(data.customItems[tabId] ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        enabled: isFilterEnabled(i),
        tagId: i.subcategoryId,
        tagLabel: data.subcategories.find((sc) => sc.id === i.subcategoryId)?.name,
      }))}
      tagOptions={data.subcategories
        .filter((sc) => isFilterEnabled(sc))
        .map((sc) => {
          const parentName = data.parents.find((p) => p.id === sc.parentId)?.name;
          return {
            value: sc.id,
            label: parentName ? `${sc.name} (${parentName})` : sc.name,
            parentValue: sc.parentId,
          };
        })}
      tagLabel="Sub category"
      onAdd={(name, _pid, tagId) => taxonomy.addCustomItem(tabId, name, tagId)}
      onEdit={(id, name, _pid, tagId) => taxonomy.editCustomItem(tabId, id, name, tagId)}
      onDelete={(id) => taxonomy.deleteCustomItem(tabId, id)}
      onToggleEnabled={(id, enabled) => taxonomy.setCustomItemEnabled(tabId, id, enabled)}
      placeholder="Enter filter value..."
    />
  );
}

function ExtraTabContent({
  tabId,
  title,
  hideAdd = false,
}: {
  tabId: string;
  title: string;
  hideAdd?: boolean;
}) {
  const { data, addExtraFilter, editExtraFilter, deleteExtraFilter, setExtraFilterEnabled } =
    useAdminTaxonomy();
  const items = data.extraFilters.filter((ef) => ef.type === tabId);

  return (
    <ItemCrud
      title={title}
      hideAdd={hideAdd}
      items={items.map((ef) => ({
        id: ef.id,
        name: ef.name,
        enabled: isFilterEnabled(ef),
        parentId: ef.parentId,
        parentLabel: ef.parentId
          ? data.parents.find((p) => p.id === ef.parentId)?.name ?? "—"
          : "All parents",
      }))}
      parentOptions={data.parents
        .filter((p) => isFilterEnabled(p))
        .map((p) => ({ value: p.id, label: p.name }))}
      parentLabel="Parent category"
      parentOptional
      onAdd={(name, pid) => addExtraFilter(name, tabId, pid)}
      onEdit={(id, name, pid) => editExtraFilter(id, name, pid)}
      onDelete={deleteExtraFilter}
      onToggleEnabled={setExtraFilterEnabled}
      placeholder="Enter filter value..."
    />
  );
}

interface CrudItem {
  id: string;
  name: string;
  parentId?: string;
  parentLabel?: string;
  groupId?: string;
  midId?: string;
  midLabel?: string;
  detail?: string;
  href?: string;
  tagLabel?: string;
  tagId?: string;
  enabled?: boolean;
}

const LIST_PAGE_SIZE = 80;
const SCOPE_THRESHOLD = 40;

function ItemCrud({
  title,
  items,
  parentOptions,
  parentLabel,
  parentOptional = false,
  tagOptions,
  tagLabel,
  placeholder,
  onAdd,
  onEdit,
  onDelete,
  onToggleEnabled,
  hideAdd = false,
  addButtonLabel = "Add",
  emptyParentMessage,
  nameColumnLabel = "Name",
  detailColumnLabel,
  groupOptions,
  groupLabel,
  midOptions,
  midLabel,
  initialParentId = "",
  initialGroupId = "",
  initialMidId = "",
  requireParentScope = false,
}: {
  title: string;
  items: CrudItem[];
  parentOptions?: { value: string; label: string; groupValue?: string; midValue?: string }[];
  parentLabel?: string;
  /** When true, parent/tag select may be left as "All". */
  parentOptional?: boolean;
  tagOptions?: { value: string; label: string; parentValue?: string }[];
  tagLabel?: string;
  placeholder: string;
  onAdd: (name: string, parentId?: string, tagId?: string) => void;
  onEdit: (id: string, name: string, parentId?: string, tagId?: string) => void;
  onDelete: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  hideAdd?: boolean;
  addButtonLabel?: string;
  emptyParentMessage?: string;
  nameColumnLabel?: string;
  detailColumnLabel?: string;
  groupOptions?: { value: string; label: string }[];
  groupLabel?: string;
  midOptions?: { value: string; label: string; groupValue?: string }[];
  midLabel?: string;
  initialParentId?: string;
  initialGroupId?: string;
  initialMidId?: string;
  requireParentScope?: boolean;
}) {
  const [addName, setAddName] = useState("");
  const [addParentId, setAddParentId] = useState(
    parentOptional || requireParentScope ? "" : parentOptions?.[0]?.value ?? ""
  );
  const [addTagId, setAddTagId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editTagId, setEditTagId] = useState("");
  const [addError, setAddError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const soleGroupId = groupOptions?.length === 1 ? groupOptions[0].value : "";
  const soleMidId = midOptions?.length === 1 ? midOptions[0].value : "";
  const soleParentId =
    !groupOptions?.length && !midOptions?.length && parentOptions?.length === 1
      ? parentOptions[0].value
      : "";
  const [groupId, setGroupId] = useState(initialGroupId || soleGroupId);
  const [midId, setMidId] = useState(initialMidId || soleMidId);
  const [parentFilterId, setParentFilterId] = useState(initialParentId || soleParentId);
  const [page, setPage] = useState(1);

  const needsParent = Boolean(parentOptions?.length) && Boolean(parentLabel);
  const needsTag = Boolean(tagLabel);
  const hasParents = (parentOptions?.length ?? 0) > 0;
  const hasTags = (tagOptions?.length ?? 0) > 0;

  useEffect(() => {
    setGroupId(initialGroupId || soleGroupId);
  }, [initialGroupId, soleGroupId]);

  useEffect(() => {
    setMidId(initialMidId || soleMidId);
  }, [initialMidId, soleMidId]);

  useEffect(() => {
    setParentFilterId(initialParentId || soleParentId);
  }, [initialParentId, soleParentId]);

  useEffect(() => {
    if (parentFilterId && parentOptions?.some((o) => o.value === parentFilterId)) {
      setAddParentId(parentFilterId);
    }
  }, [parentFilterId, parentOptions]);

  const scopedMidOptions = useMemo(() => {
    if (!midOptions) return [];
    if (!groupId) return midOptions;
    return midOptions.filter((o) => !o.groupValue || o.groupValue === groupId);
  }, [midOptions, groupId]);

  const scopedParentOptions = useMemo(() => {
    if (!parentOptions) return [];
    return parentOptions.filter((o) => {
      if (groupId && o.groupValue && o.groupValue !== groupId) return false;
      if (midId && o.midValue && o.midValue !== midId) return false;
      return true;
    });
  }, [parentOptions, groupId, midId]);

  const filteredAddTags = useMemo(() => {
    if (!tagOptions?.length) return [];
    if (!needsParent || !addParentId) return tagOptions;
    return tagOptions.filter((o) => !o.parentValue || o.parentValue === addParentId);
  }, [tagOptions, needsParent, addParentId]);

  const filteredEditTags = useMemo(() => {
    if (!tagOptions?.length) return [];
    if (!needsParent || !editParentId) return tagOptions;
    return tagOptions.filter((o) => !o.parentValue || o.parentValue === editParentId);
  }, [tagOptions, needsParent, editParentId]);

  useEffect(() => {
    if (!parentOptions?.length) {
      if (!parentOptional) setAddParentId("");
      return;
    }
    const options = scopedParentOptions.length ? scopedParentOptions : parentOptions;
    if (addParentId && !options.some((o) => o.value === addParentId)) {
      setAddParentId(parentOptional || requireParentScope ? "" : options[0]?.value ?? "");
    }
  }, [parentOptions, scopedParentOptions, addParentId, parentOptional, requireParentScope]);

  useEffect(() => {
    if (addTagId && !filteredAddTags.some((o) => o.value === addTagId)) {
      setAddTagId("");
    }
  }, [filteredAddTags, addTagId]);

  function startEdit(item: CrudItem) {
    setPendingDeleteId(null);
    setEditingId(item.id);
    setEditName(item.name);
    if (parentOptions?.length) {
      setEditParentId(
        item.parentId ||
          parentOptions.find((o) => o.label === item.parentLabel)?.value ||
          (parentOptional ? "" : parentOptions[0]?.value ?? "")
      );
    }
    setEditTagId(item.tagId ?? "");
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!addName.trim()) {
      setAddError("Enter a name.");
      return;
    }
    if (needsParent && !parentOptional && !hasParents) {
      setAddError(emptyParentMessage || "Add a parent option first.");
      return;
    }
    if (needsParent && !parentOptional && !addParentId) {
      setAddError(`Select a ${parentLabel?.toLowerCase() ?? "parent"}.`);
      return;
    }
    onAdd(
      addName.trim(),
      needsParent ? addParentId || undefined : undefined,
      needsTag ? addTagId || undefined : undefined
    );
    setAddName("");
    if (parentOptional) setAddParentId("");
    setAddTagId("");
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    onEdit(
      editingId,
      editName.trim(),
      needsParent ? editParentId || undefined : undefined,
      needsTag ? editTagId || undefined : undefined
    );
    setEditingId(null);
  }

  const colSpan =
    2 +
    (parentLabel && parentOptions?.length ? 1 : 0) +
    (detailColumnLabel ? 1 : 0) +
    (tagLabel ? 1 : 0) +
    (onToggleEnabled ? 1 : 0);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const parentCmp = (a.parentLabel ?? "").localeCompare(b.parentLabel ?? "", undefined, {
        sensitivity: "base",
      });
      if (parentCmp !== 0) return parentCmp;
      const tagCmp = (a.tagLabel ?? "").localeCompare(b.tagLabel ?? "", undefined, {
        sensitivity: "base",
      });
      if (tagCmp !== 0) return tagCmp;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedItems.filter((item) => {
      if (groupId && item.groupId && item.groupId !== groupId) return false;
      if (midId && item.midId && item.midId !== midId) return false;
      if (parentFilterId && item.parentId !== parentFilterId) return false;
      if (q && !item.name.toLowerCase().includes(q) && !(item.parentLabel ?? "").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [sortedItems, groupId, midId, parentFilterId, query]);

  const waitingOnScope =
    (requireParentScope || items.length > SCOPE_THRESHOLD) &&
    Boolean(
      (groupOptions?.length && !groupId) ||
        (midOptions?.length && !midId) ||
        ((parentOptions?.length ?? 0) > 0 &&
          !parentFilterId &&
          (requireParentScope || !groupOptions?.length))
    );

  const pageCount = Math.max(1, Math.ceil(visibleItems.length / LIST_PAGE_SIZE));
  const pageItems = waitingOnScope
    ? []
    : visibleItems.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [groupId, midId, parentFilterId, query, items.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const showParentColumn = Boolean(parentLabel && parentOptions?.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        {(groupOptions?.length || midOptions?.length || parentOptions?.length || items.length > 8) && (
          <div className="flex flex-wrap items-end gap-2">
            {groupOptions && groupOptions.length > 0 && (
              <label className="text-xs text-gray-500">
                {groupLabel ?? "Group"}
                <select
                  value={groupId}
                  onChange={(e) => {
                    setGroupId(e.target.value);
                    setMidId("");
                    setParentFilterId("");
                  }}
                  className="mt-1 block min-w-[160px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">All countries</option>
                  {groupOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {midOptions && midOptions.length > 0 && (
              <label className="text-xs text-gray-500">
                {midLabel ?? "State"}
                <select
                  value={midId}
                  onChange={(e) => {
                    setMidId(e.target.value);
                    setParentFilterId("");
                  }}
                  className="mt-1 block min-w-[160px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">
                    {waitingOnScope && !midId ? `Select ${(midLabel ?? "state").toLowerCase()}` : `All (${scopedMidOptions.length})`}
                  </option>
                  {scopedMidOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {parentOptions && parentOptions.length > 0 && (
              <label className="text-xs text-gray-500">
                {groupOptions?.length || midOptions?.length
                  ? parentLabel
                  : `Filter by ${parentLabel?.toLowerCase() ?? "parent"}`}
                <select
                  value={parentFilterId}
                  onChange={(e) => setParentFilterId(e.target.value)}
                  className="mt-1 block min-w-[160px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">
                    {waitingOnScope && !parentFilterId
                      ? `Select ${parentLabel?.toLowerCase() ?? "a district"}`
                      : `All (${visibleItems.length})`}
                  </option>
                  {scopedParentOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs text-gray-500">
              Search
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find…"
                className="mt-1 block w-40 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">{nameColumnLabel}</th>
              {showParentColumn && (
                <th className="px-4 py-3 text-start font-semibold">{parentLabel}</th>
              )}
              {detailColumnLabel && (
                <th className="px-4 py-3 text-start font-semibold">{detailColumnLabel}</th>
              )}
              {tagLabel && (
                <th className="px-4 py-3 text-start font-semibold">{tagLabel}</th>
              )}
              {onToggleEnabled && (
                <th className="px-4 py-3 text-start font-semibold w-24">Active</th>
              )}
              <th className="px-4 py-3 text-end font-semibold w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {waitingOnScope ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-500 text-sm">
                  Select a {(parentLabel ?? midLabel ?? groupLabel ?? "country").toLowerCase()}{" "}
                  first. Location names are not unique worldwide — they belong to their parent.
                </td>
              </tr>
            ) : visibleItems.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-500 text-sm">
                  No items yet. Use the form below to add one.
                </td>
              </tr>
            ) : (
              pageItems.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="bg-amber-50">
                    <td colSpan={colSpan} className="px-4 py-3">
                      <form onSubmit={submitEdit} className="flex flex-wrap items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                          aria-label={`Edit ${nameColumnLabel.toLowerCase()}`}
                        />
                        {parentOptions && (
                          <select
                            value={editParentId}
                            onChange={(e) => {
                              setEditParentId(e.target.value);
                              setEditTagId("");
                            }}
                            className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
                          >
                            {parentOptional && (
                              <option value="">All</option>
                            )}
                            {scopedParentOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {needsTag && (
                          <select
                            value={editTagId}
                            onChange={(e) => setEditTagId(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
                          >
                            <option value="">All sub categories</option>
                            {filteredEditTags.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-green-700 hover:bg-green-800 rounded-lg"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={item.id}
                    className={cn("hover:bg-gray-50", item.enabled === false && "opacity-60")}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-start font-medium text-gray-800 hover:text-green-800 hover:underline underline-offset-2"
                      >
                        {item.name}
                      </button>
                    </td>
                    {showParentColumn && (
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.parentLabel || "All"}
                      </td>
                    )}
                    {detailColumnLabel && (
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="text-green-700 font-medium hover:underline"
                          >
                            {item.detail || "View"}
                          </Link>
                        ) : (
                          item.detail || "—"
                        )}
                      </td>
                    )}
                    {tagLabel && (
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.tagLabel || "All"}
                      </td>
                    )}
                    {onToggleEnabled && (
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.enabled !== false}
                            onChange={(e) => onToggleEnabled(item.id, e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          {item.enabled !== false ? "On" : "Off"}
                        </label>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {pendingDeleteId === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(item.id);
                                setPendingDeleteId(null);
                              }}
                              className="px-2 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              aria-label="Cancel delete"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {!waitingOnScope && visibleItems.length > LIST_PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {(page - 1) * LIST_PAGE_SIZE + 1}–
            {Math.min(page * LIST_PAGE_SIZE, visibleItems.length)} of {visibleItems.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-2 py-1 border rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {!hideAdd && (
        <form
          onSubmit={submitAdd}
          className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {nameColumnLabel}
            </label>
            <input
              value={addName}
              onChange={(e) => {
                setAddName(e.target.value);
                if (addError) setAddError("");
              }}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {needsParent && (
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">{parentLabel}</label>
              {hasParents || parentOptional ? (
                <select
                  value={addParentId}
                  onChange={(e) => {
                    setAddParentId(e.target.value);
                    setAddTagId("");
                    if (addError) setAddError("");
                  }}
                  required={!parentOptional}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {parentOptional && <option value="">All</option>}
                  {(scopedParentOptions.length ? scopedParentOptions : parentOptions ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {emptyParentMessage || "No parent options yet."}
                </p>
              )}
            </div>
          )}
          {needsTag && (
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">{tagLabel}</label>
              <select
                value={addTagId}
                onChange={(e) => setAddTagId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">All sub categories</option>
                {filteredAddTags.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {!hasTags && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Add sub categories in the Sub Category tab to tag items.
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={needsParent && !parentOptional && !hasParents}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> {addButtonLabel}
          </button>
          {addError ? <p className="w-full text-xs text-red-600">{addError}</p> : null}
        </form>
      )}
    </div>
  );
}
