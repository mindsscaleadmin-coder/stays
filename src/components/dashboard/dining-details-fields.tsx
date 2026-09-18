"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  DiningChipSelect,
  DiningCollapsibleCard,
  DiningFormCard,
  DiningFormSection,
  DiningYesNoField,
} from "@/components/dashboard/dining-form-section";
import {
  DINING_CANCELLATION_POLICY_OPTIONS,
  DINING_CHILDREN_POLICY_OPTIONS,
  DINING_DISH_CATEGORY_OPTIONS,
  DINING_DISH_DIETARY_OPTIONS,
  DINING_DRESS_CODE_OPTIONS,
  DINING_ENQUIRY_METHOD_OPTIONS,
  DINING_SEATING_OPTIONS,
  DINING_SUITABLE_FOR_OPTIONS,
  getDayPeriods,
  MEAL_PERIODS,
  PRICE_LEVEL_OPTIONS,
  WEEKDAYS,
  type DayHours,
  type DiningDetails,
  type DiningMenuItem,
  type DiningMenuSection,
  type MealPeriod,
  type WeekdayKey,
} from "@/lib/listings/dining-details-types";

function inputClassName(compact?: boolean) {
  return compact
    ? "mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
    : "mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";
}

function summarizeOpeningHours(openingHours: DayHours[] = []) {
  const rows = WEEKDAYS.map((day) => openingHours.find((item) => item.day === day.key)).filter(
    Boolean
  ) as DayHours[];
  const closedCount = rows.filter((row) => row.closed).length;
  const withHours = rows.filter((row) => {
    if (row.closed) return false;
    return getDayPeriods(row).some((period) => period.open?.trim() || period.close?.trim());
  }).length;

  if (withHours === 0 && closedCount === 0) {
    return { headline: "Weekly schedule not set", detail: "Expand to add breakfast, lunch, brunch, and dinner hours." };
  }

  const openLabels = WEEKDAYS.filter((day) => {
    const row = openingHours.find((item) => item.day === day.key);
    return row && !row.closed;
  }).map((day) => day.short);

  return {
    headline:
      withHours > 0
        ? `${withHours} open day${withHours === 1 ? "" : "s"}${closedCount > 0 ? ` · ${closedCount} closed` : ""}`
        : `${closedCount} day${closedCount === 1 ? "" : "s"} marked closed`,
    detail: (
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day) => {
          const row = openingHours.find((item) => item.day === day.key);
          const closed = Boolean(row?.closed);
          const hasHours =
            row &&
            !closed &&
            getDayPeriods(row).some((period) => period.open?.trim() || period.close?.trim());
          return (
            <span
              key={day.key}
              className={
                closed
                  ? "rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-400"
                  : hasHours
                    ? "rounded-full bg-green-50 px-2 py-0.5 text-2xs font-semibold text-green-800 ring-1 ring-inset ring-green-200/80"
                    : "rounded-full bg-white px-2 py-0.5 text-2xs font-semibold text-gray-500 ring-1 ring-inset ring-gray-200"
              }
            >
              {day.short}
            </span>
          );
        })}
        {openLabels.length > 0 ? (
          <span className="text-gray-400">· {openLabels.join(", ")}</span>
        ) : null}
      </div>
    ),
  };
}

function CurrencyInput({
  currency,
  currencySymbol,
  value,
  onChange,
  placeholder,
}: {
  currency: string;
  currencySymbol?: string;
  value?: number;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-1.5 flex items-stretch">
      <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2.5 text-xs text-gray-700 shrink-0">
        <span className="font-semibold text-gray-900">{currency}</span>
        {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
      </div>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0)
          )
        }
        placeholder={placeholder}
        className="w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

export function DiningDetailsFields({
  value,
  onChange,
  currency,
  currencySymbol,
}: {
  value: DiningDetails;
  onChange: (next: DiningDetails) => void;
  currency: string;
  currencySymbol?: string;
}) {
  function patch(partial: Partial<DiningDetails>) {
    onChange({ ...value, ...partial });
  }

  function patchHours(day: WeekdayKey, partial: Partial<DayHours>) {
    const openingHours = (value.openingHours ?? []).map((row) =>
      row.day === day ? { ...row, ...partial } : row
    );
    patch({ openingHours });
  }

  function patchMealPeriod(
    day: WeekdayKey,
    meal: MealPeriod,
    partial: Partial<{ open: string; close: string }>
  ) {
    const openingHours = (value.openingHours ?? []).map((row) => {
      if (row.day !== day) return row;
      const periods = getDayPeriods(row).map((period) =>
        period.meal === meal ? { ...period, ...partial } : period
      );
      return { ...row, periods };
    });
    patch({ openingHours });
  }

  function updateMenuSection(index: number, nextSection: DiningMenuSection) {
    const menuSections = [...(value.menuSections ?? [])];
    menuSections[index] = nextSection;
    patch({ menuSections });
  }

  function addMenuSection() {
    patch({
      menuSections: [...(value.menuSections ?? []), { name: "", items: [{ name: "" }] }],
    });
  }

  function removeMenuSection(index: number) {
    patch({
      menuSections: (value.menuSections ?? []).filter((_, i) => i !== index),
    });
  }

  function addMenuItem(sectionIndex: number) {
    const menuSections = [...(value.menuSections ?? [])];
    const section = menuSections[sectionIndex];
    if (!section) return;
    menuSections[sectionIndex] = {
      ...section,
      items: [...section.items, { name: "" }],
    };
    patch({ menuSections });
  }

  function updateMenuItem(sectionIndex: number, itemIndex: number, nextItem: DiningMenuItem) {
    const menuSections = [...(value.menuSections ?? [])];
    const section = menuSections[sectionIndex];
    if (!section) return;
    const items = [...section.items];
    items[itemIndex] = nextItem;
    menuSections[sectionIndex] = { ...section, items };
    patch({ menuSections });
  }

  function removeMenuItem(sectionIndex: number, itemIndex: number) {
    const menuSections = [...(value.menuSections ?? [])];
    const section = menuSections[sectionIndex];
    if (!section) return;
    menuSections[sectionIndex] = {
      ...section,
      items: section.items.filter((_, i) => i !== itemIndex),
    };
    patch({ menuSections });
  }

  function updateFeaturedDish(index: number, nextItem: DiningMenuItem) {
    const featuredDishes = [...(value.featuredDishes ?? [])];
    featuredDishes[index] = nextItem;
    patch({ featuredDishes });
  }

  function addFeaturedDish() {
    patch({
      featuredDishes: [...(value.featuredDishes ?? []), { name: "", isSignature: false }],
    });
  }

  function removeFeaturedDish(index: number) {
    patch({
      featuredDishes: (value.featuredDishes ?? []).filter((_, i) => i !== index),
    });
  }

  const openingHoursSummary = summarizeOpeningHours(value.openingHours);

  return (
    <div className="space-y-0">
      <DiningFormSection
        title="Seating & capacity"
        tier="required"
        description="Help guests understand how many people you can host and where they can sit."
      >
        <DiningFormCard>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Indoor seating capacity</span>
              <input
                type="number"
                min={0}
                value={value.indoorCapacity ?? ""}
                onChange={(e) =>
                  patch({
                    indoorCapacity:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="80"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Outdoor seating capacity</span>
              <input
                type="number"
                min={0}
                value={value.outdoorCapacity ?? ""}
                onChange={(e) =>
                  patch({
                    outdoorCapacity:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="40"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Private dining capacity</span>
              <input
                type="number"
                min={0}
                value={value.privateDiningCapacity ?? ""}
                onChange={(e) =>
                  patch({
                    privateDiningCapacity:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="12"
                className={inputClassName()}
              />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Seating options</p>
            <DiningChipSelect
              options={DINING_SEATING_OPTIONS}
              value={value.seatingOptions ?? []}
              onChange={(seatingOptions) => patch({ seatingOptions })}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(value.familySeatingAvailable)}
                onChange={(e) => patch({ familySeatingAvailable: e.target.checked })}
              />
              Family seating available
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(value.wheelchairAccessibleSeating)}
                onChange={(e) => patch({ wheelchairAccessibleSeating: e.target.checked })}
              />
              Wheelchair-accessible seating
            </label>
          </div>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Dining experience"
        tier="recommended"
        description="Choose who this venue works best for. Atmosphere and setting are covered in Search filters above."
      >
        <DiningFormCard title="Suitable for">
          <DiningChipSelect
            options={DINING_SUITABLE_FOR_OPTIONS}
            value={value.suitableFor ?? []}
            onChange={(suitableFor) => patch({ suitableFor })}
          />
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Opening hours"
        tier="required"
        description="Set regular weekly hours by meal service. Leave a row blank if that service is not offered."
      >
        <DiningCollapsibleCard
          summary={openingHoursSummary.headline}
          summaryDetail={openingHoursSummary.detail}
          expandLabel="Edit hours"
          collapseLabel="Minimize"
        >
          <div className="space-y-3">
            {WEEKDAYS.map((day) => {
              const row = (value.openingHours ?? []).find((item) => item.day === day.key);
              if (!row) return null;
              const periods = getDayPeriods(row);
              return (
                <div
                  key={day.key}
                  className="border-b border-gray-100 pb-4 space-y-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{day.label}</p>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={Boolean(row.closed)}
                        onChange={(e) => patchHours(day.key, { closed: e.target.checked })}
                      />
                      Closed all day
                    </label>
                  </div>
                  {!row.closed ? (
                    <div className="space-y-2">
                      <div className="hidden sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 text-2xs font-semibold uppercase tracking-wide text-gray-400">
                        <span>Service</span>
                        <span>Opens</span>
                        <span>Closes</span>
                      </div>
                      {MEAL_PERIODS.map((meal) => {
                        const period = periods.find((item) => item.meal === meal.key);
                        if (!period) return null;
                        return (
                          <div
                            key={meal.key}
                            className="grid grid-cols-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center"
                          >
                            <span className="text-xs font-semibold text-gray-700">{meal.label}</span>
                            <input
                              type="text"
                              value={period.open ?? ""}
                              onChange={(e) =>
                                patchMealPeriod(day.key, meal.key, { open: e.target.value })
                              }
                              placeholder="7:00 AM"
                              className={inputClassName(true)}
                            />
                            <input
                              type="text"
                              value={period.close ?? ""}
                              onChange={(e) =>
                                patchMealPeriod(day.key, meal.key, { close: e.target.value })
                              }
                              placeholder="10:30 AM"
                              className={inputClassName(true)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Seasonal hours note</span>
              <input
                type="text"
                value={value.seasonalHoursNote ?? ""}
                onChange={(e) => patch({ seasonalHoursNote: e.target.value })}
                placeholder="Summer terrace hours differ"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Holiday / special hours</span>
              <input
                type="text"
                value={value.specialHoursNote ?? ""}
                onChange={(e) => patch({ specialHoursNote: e.target.value })}
                placeholder="Closed on public holidays"
                className={inputClassName()}
              />
            </label>
          </div>
        </DiningCollapsibleCard>
      </DiningFormSection>

      <DiningFormSection
        title="Menu"
        tier="recommended"
        description="Featured dishes plus a menu link or PDF are enough. You don't need to enter every item."
      >
        <DiningFormCard>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Menu PDF / link</span>
            <input
              type="url"
              value={value.menuUrl ?? ""}
              onChange={(e) => patch({ menuUrl: e.target.value })}
              placeholder="https://…"
              className={inputClassName()}
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Featured dishes
              </p>
              <button
                type="button"
                onClick={addFeaturedDish}
                className="text-xs font-semibold text-green-800 hover:text-green-900"
              >
                + Add featured dish
              </button>
            </div>
            {(value.featuredDishes ?? []).map((dish, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 space-y-3 last:border-b-0">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_auto] gap-2">
                  <input
                    type="text"
                    value={dish.name}
                    onChange={(e) => updateFeaturedDish(index, { ...dish, name: e.target.value })}
                    placeholder="Truffle pasta"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="number"
                    min={0}
                    value={dish.price ?? ""}
                    onChange={(e) =>
                      updateFeaturedDish(index, {
                        ...dish,
                        price:
                          e.target.value === ""
                            ? undefined
                            : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="Price"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeaturedDish(index)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    aria-label="Remove featured dish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={dish.description ?? ""}
                  onChange={(e) =>
                    updateFeaturedDish(index, { ...dish, description: e.target.value })
                  }
                  rows={2}
                  placeholder="Creamy pasta with black truffle and parmesan."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={dish.category ?? ""}
                    onChange={(e) =>
                      updateFeaturedDish(index, { ...dish, category: e.target.value })
                    }
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Category</option>
                    {DINING_DISH_CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={dish.imageUrl ?? ""}
                    onChange={(e) =>
                      updateFeaturedDish(index, { ...dish, imageUrl: e.target.value })
                    }
                    placeholder="Dish image URL"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <DiningChipSelect
                    options={DINING_DISH_DIETARY_OPTIONS}
                    value={dish.dietaryTags ?? []}
                    onChange={(dietaryTags) =>
                      updateFeaturedDish(index, { ...dish, dietaryTags })
                    }
                  />
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(dish.isSignature)}
                      onChange={(e) =>
                        updateFeaturedDish(index, { ...dish, isSignature: e.target.checked })
                      }
                    />
                    Signature dish
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Full menu sections</p>
            {(value.menuSections ?? []).map((section, sectionIndex) => (
              <div key={sectionIndex} className="border-b border-gray-100 pb-4 space-y-3 last:border-b-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) =>
                      updateMenuSection(sectionIndex, { ...section, name: e.target.value })
                    }
                    placeholder="Section name (e.g. Starters)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeMenuSection(sectionIndex)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    aria-label="Remove menu section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_auto] gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          updateMenuItem(sectionIndex, itemIndex, { ...item, name: e.target.value })
                        }
                        placeholder="Dish name"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        min={0}
                        value={item.price ?? ""}
                        onChange={(e) =>
                          updateMenuItem(sectionIndex, itemIndex, {
                            ...item,
                            price:
                              e.target.value === ""
                                ? undefined
                                : Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder="Price"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeMenuItem(sectionIndex, itemIndex)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        aria-label="Remove menu item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addMenuItem(sectionIndex)}
                  className="text-xs font-semibold text-green-800 hover:text-green-900"
                >
                  + Add dish
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMenuSection}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 hover:text-green-900"
            >
              <Plus className="w-4 h-4" />
              Add menu section
            </button>
          </div>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Pricing"
        tier="required"
        description="Indicative only — guests are not charged through this platform."
      >
        <DiningFormCard>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Price level</p>
            <div className="flex flex-wrap gap-2">
              {PRICE_LEVEL_OPTIONS.map((option) => {
                const active = value.priceLevel === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => patch({ priceLevel: option.value })}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-green-700 bg-green-50 text-green-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="tabular-nums">{option.symbol}</span>
                    <span className="ms-2 text-xs font-medium text-gray-500">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Average spend (min)</span>
              <CurrencyInput
                currency={currency}
                currencySymbol={currencySymbol}
                value={value.averagePriceMin}
                onChange={(averagePriceMin) => patch({ averagePriceMin })}
                placeholder="150"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Average spend (max)</span>
              <CurrencyInput
                currency={currency}
                currencySymbol={currencySymbol}
                value={value.averagePriceMax}
                onChange={(averagePriceMax) => patch({ averagePriceMax })}
                placeholder="250"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">What the starting price represents</span>
            <input
              type="text"
              value={value.startingPriceLabel ?? ""}
              onChange={(e) => patch({ startingPriceLabel: e.target.value })}
              placeholder="Per person, minimum spend, tasting menu…"
              className={inputClassName()}
            />
          </label>
          <DiningYesNoField
            label="Deposit required?"
            value={value.depositRequired}
            onChange={(depositRequired) => patch({ depositRequired })}
          />
          {value.depositRequired ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Deposit amount</span>
                <CurrencyInput
                  currency={currency}
                  currencySymbol={currencySymbol}
                  value={value.depositAmount}
                  onChange={(depositAmount) => patch({ depositAmount })}
                  placeholder="100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Deposit conditions</span>
                <input
                  type="text"
                  value={value.depositConditions ?? ""}
                  onChange={(e) => patch({ depositConditions: e.target.value })}
                  placeholder="Refundable up to 24 hours before"
                  className={inputClassName()}
                />
              </label>
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12rem] gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Minimum spend</span>
              <CurrencyInput
                currency={currency}
                currencySymbol={currencySymbol}
                value={value.minimumSpend}
                onChange={(minimumSpend) => patch({ minimumSpend })}
                placeholder="500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Minimum spend unit</span>
              <select
                value={value.minimumSpendUnit ?? "per_person"}
                onChange={(e) =>
                  patch({
                    minimumSpendUnit: e.target.value as DiningDetails["minimumSpendUnit"],
                  })
                }
                className={inputClassName()}
              >
                <option value="per_person">Per person</option>
                <option value="per_table">Per table</option>
              </select>
            </label>
          </div>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Reservation / enquiry information"
        tier="required"
        description="Guests send requests through our platform. Contact details are shared only after you confirm."
      >
        <DiningFormCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DiningYesNoField
              label="Reservation required?"
              value={value.reservationRequired}
              onChange={(reservationRequired) => patch({ reservationRequired })}
            />
            <DiningYesNoField
              label="Advance booking required?"
              value={value.advanceBookingRequired}
              onChange={(advanceBookingRequired) => patch({ advanceBookingRequired })}
            />
            <DiningYesNoField
              label="Group booking available?"
              value={value.groupBookingAvailable}
              onChange={(groupBookingAvailable) => patch({ groupBookingAvailable })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Minimum advance notice</span>
              <input
                type="text"
                value={value.minimumAdvanceNotice ?? ""}
                onChange={(e) => patch({ minimumAdvanceNotice: e.target.value })}
                placeholder="24 hours, same-day before 4pm…"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Maximum group size</span>
              <input
                type="number"
                min={0}
                value={value.maxGroupSize ?? ""}
                onChange={(e) =>
                  patch({
                    maxGroupSize:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="20"
                className={inputClassName()}
              />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Preferred enquiry method</p>
            <div className="flex flex-wrap gap-2">
              {DINING_ENQUIRY_METHOD_OPTIONS.map((option) => {
                const active = value.preferredEnquiryMethod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => patch({ preferredEnquiryMethod: option.value })}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-green-700 bg-green-50 text-green-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Reservation phone</span>
              <input
                type="tel"
                value={value.reservationPhone ?? ""}
                onChange={(e) => patch({ reservationPhone: e.target.value })}
                placeholder="+971 …"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Reservation WhatsApp</span>
              <input
                type="tel"
                value={value.reservationWhatsapp ?? ""}
                onChange={(e) => patch({ reservationWhatsapp: e.target.value })}
                placeholder="+971 …"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Reservation email</span>
              <input
                type="email"
                value={value.reservationEmail ?? ""}
                onChange={(e) => patch({ reservationEmail: e.target.value })}
                placeholder="reservations@…"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Reservation URL</span>
              <input
                type="url"
                value={value.reservationUrl ?? ""}
                onChange={(e) => patch({ reservationUrl: e.target.value })}
                placeholder="https://…"
                className={inputClassName()}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Reservation policy</span>
            <textarea
              value={value.reservationPolicy ?? ""}
              onChange={(e) => patch({ reservationPolicy: e.target.value })}
              rows={2}
              placeholder="Walk-ins accepted, reservation recommended, minimum notice…"
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
          </label>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Location"
        tier="recommended"
        description="Directions for guests. Country, city, map, and parking options are set above."
      >
        <DiningFormCard>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Landmark</span>
            <input
              type="text"
              value={value.landmark ?? ""}
              onChange={(e) => patch({ landmark: e.target.value })}
              placeholder="Near Dubai Marina Walk"
              className={inputClassName()}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Getting-here instructions</span>
            <textarea
              value={value.gettingHere ?? ""}
              onChange={(e) => patch({ gettingHere: e.target.value })}
              rows={2}
              placeholder="5 min walk from Dubai Marina metro, valet at hotel entrance…"
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Additional location notes</span>
            <textarea
              value={value.locationNotes ?? ""}
              onChange={(e) => patch({ locationNotes: e.target.value })}
              rows={2}
              placeholder="Entrance via lobby level 2…"
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
          </label>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Dining policies"
        tier="recommended"
        description="Structured policies are easier for guests to scan than long free-text blocks."
      >
        <DiningFormCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Dress code</span>
              <select
                value={value.dressCodeType ?? ""}
                onChange={(e) => patch({ dressCodeType: e.target.value })}
                className={inputClassName()}
              >
                <option value="">Select dress code</option>
                {DINING_DRESS_CODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Children policy</span>
              <select
                value={value.childrenPolicyType ?? ""}
                onChange={(e) => patch({ childrenPolicyType: e.target.value })}
                className={inputClassName()}
              >
                <option value="">Select children policy</option>
                {DINING_CHILDREN_POLICY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Cancellation policy</span>
              <select
                value={value.cancellationPolicyType ?? ""}
                onChange={(e) => patch({ cancellationPolicyType: e.target.value })}
                className={inputClassName()}
              >
                <option value="">Select cancellation policy</option>
                {DINING_CANCELLATION_POLICY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Minimum age</span>
              <input
                type="number"
                min={0}
                value={value.minimumAge ?? ""}
                onChange={(e) =>
                  patch({
                    minimumAge:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="21"
                className={inputClassName()}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Custom dress code</span>
              <input
                type="text"
                value={value.dressCode ?? ""}
                onChange={(e) => patch({ dressCode: e.target.value })}
                placeholder="Jacket required for gentlemen"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Table time limit</span>
              <input
                type="text"
                value={value.tableTimeLimit ?? ""}
                onChange={(e) => patch({ tableTimeLimit: e.target.value })}
                placeholder="2 hours per table"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">No-show policy</span>
              <input
                type="text"
                value={value.noShowPolicy ?? ""}
                onChange={(e) => patch({ noShowPolicy: e.target.value })}
                placeholder="Table released after 15 minutes"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Late arrival policy</span>
              <input
                type="text"
                value={value.lateArrivalPolicy ?? ""}
                onChange={(e) => patch({ lateArrivalPolicy: e.target.value })}
                placeholder="Table held for 15 minutes"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Children policy details</span>
              <input
                type="text"
                value={value.childrenPolicy ?? ""}
                onChange={(e) => patch({ childrenPolicy: e.target.value })}
                placeholder="Kids welcome until 9pm"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Pet policy</span>
              <input
                type="text"
                value={value.petPolicy ?? ""}
                onChange={(e) => patch({ petPolicy: e.target.value })}
                placeholder="No pets indoors"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Smoking policy</span>
              <input
                type="text"
                value={value.smokingPolicy ?? ""}
                onChange={(e) => patch({ smokingPolicy: e.target.value })}
                placeholder="Outdoor terrace only"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Outside food policy</span>
              <input
                type="text"
                value={value.outsideFoodPolicy ?? ""}
                onChange={(e) => patch({ outsideFoodPolicy: e.target.value })}
                placeholder="Outside food not permitted"
                className={inputClassName()}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Group policy</span>
              <input
                type="text"
                value={value.groupPolicy ?? ""}
                onChange={(e) => patch({ groupPolicy: e.target.value })}
                placeholder="Groups of 8+ require set menu"
                className={inputClassName()}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Special occasion policy</span>
              <input
                type="text"
                value={value.specialOccasionPolicy ?? ""}
                onChange={(e) => patch({ specialOccasionPolicy: e.target.value })}
                placeholder="Birthday cakes allowed with advance notice"
                className={inputClassName()}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Custom cancellation policy</span>
              <textarea
                value={value.cancellationPolicy ?? ""}
                onChange={(e) => patch({ cancellationPolicy: e.target.value })}
                rows={2}
                placeholder="Free cancellation until 24 hours before…"
                className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
              />
            </label>
          </div>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="Contact & social information"
        tier="optional"
        description="Private contact details used after a reservation is confirmed — not shown on the public listing."
      >
        <DiningFormCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Phone</span>
              <input type="tel" value={value.contactPhone ?? ""} onChange={(e) => patch({ contactPhone: e.target.value })} className={inputClassName()} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">WhatsApp</span>
              <input type="tel" value={value.contactWhatsapp ?? ""} onChange={(e) => patch({ contactWhatsapp: e.target.value })} className={inputClassName()} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input type="email" value={value.contactEmail ?? ""} onChange={(e) => patch({ contactEmail: e.target.value })} className={inputClassName()} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Website</span>
              <input type="url" value={value.website ?? ""} onChange={(e) => patch({ website: e.target.value })} className={inputClassName()} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Instagram</span>
              <input type="url" value={value.instagram ?? ""} onChange={(e) => patch({ instagram: e.target.value })} className={inputClassName()} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Facebook</span>
              <input type="url" value={value.facebook ?? ""} onChange={(e) => patch({ facebook: e.target.value })} className={inputClassName()} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Other social link</span>
              <input type="url" value={value.otherSocialUrl ?? ""} onChange={(e) => patch({ otherSocialUrl: e.target.value })} className={inputClassName()} />
            </label>
          </div>
        </DiningFormCard>
      </DiningFormSection>

      <DiningFormSection
        title="SEO information"
        tier="optional"
        description="Optional overrides. If left blank, we generate these from your listing name, cuisine, and location."
      >
        <DiningFormCard>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">SEO title</span>
            <input
              type="text"
              value={value.seoTitle ?? ""}
              onChange={(e) => patch({ seoTitle: e.target.value })}
              placeholder="Luxury Italian Restaurant in Dubai Marina"
              className={inputClassName()}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Meta description</span>
            <textarea
              value={value.seoDescription ?? ""}
              onChange={(e) => patch({ seoDescription: e.target.value })}
              rows={2}
              placeholder="Romantic rooftop Italian dining with marina views…"
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">SEO keywords</span>
              <input
                type="text"
                value={value.seoKeywords ?? ""}
                onChange={(e) => patch({ seoKeywords: e.target.value })}
                placeholder="Italian, fine dining, Dubai Marina"
                className={inputClassName()}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Custom URL slug</span>
              <input
                type="text"
                value={value.customSlug ?? ""}
                onChange={(e) => patch({ customSlug: e.target.value })}
                placeholder="luxury-italian-dubai-marina"
                className={inputClassName()}
              />
            </label>
          </div>
        </DiningFormCard>
      </DiningFormSection>

      <p className="pt-2 text-sm text-gray-600">
        Guests check availability and send reservation requests through our platform only. After you
        confirm, contact details are shared with the guest — not shown on the public listing
        beforehand.
      </p>
    </div>
  );
}
