"use client";

import { useState } from "react";
import { CloudRain, Leaf, Loader2, Package, Plus, Sprout } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostAddons } from "@/lib/host/use-host-addons";
import { cn, formatPrice } from "@/lib/utils";

const EMPTY_ACTIVITY = {
  name: "",
  description: "",
  price: "",
  duration: "",
  currency: "AED",
};

const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: "",
  unit: "jar",
  currency: "AED",
};

export function HostAddonsContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready, toggleActivity, toggleProductStock, addActivity, addProduct } =
    useHostAddons(hostId);
  const [formOpen, setFormOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [newActivity, setNewActivity] = useState(EMPTY_ACTIVITY);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [message, setMessage] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!newActivity.name.trim() || !newActivity.description.trim()) return;
    const price = Math.max(0, Number(newActivity.price) || 0);
    if (price <= 0) {
      flash("Enter a valid price.");
      return;
    }
    addActivity({
      name: newActivity.name.trim(),
      description: newActivity.description.trim(),
      price,
      currency: newActivity.currency,
      duration: newActivity.duration.trim() || "1 hr",
      enabled: true,
    });
    setNewActivity(EMPTY_ACTIVITY);
    setFormOpen(false);
    flash("Experience added.");
  }

  function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.description.trim()) return;
    const price = Math.max(0, Number(newProduct.price) || 0);
    if (price <= 0) {
      flash("Enter a valid price.");
      return;
    }
    addProduct({
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      price,
      currency: newProduct.currency,
      unit: newProduct.unit.trim() || "item",
      inStock: true,
    });
    setNewProduct(EMPTY_PRODUCT);
    setProductFormOpen(false);
    flash("Product added.");
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
          <h2 className="text-xl font-bold text-gray-900 font-display">Farm Add-ons</h2>
          <p className="text-gray-500 text-sm mt-1">
            Activity bookings, produce sales, and weather advisories for outdoor experiences.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Activities & experiences</h3>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Add experience
            </button>
          </div>

          {formOpen && (
            <form
              onSubmit={handleAddActivity}
              className="border border-green-100 bg-green-50/40 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Name</span>
                <input
                  value={newActivity.name}
                  onChange={(e) => setNewActivity((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Cultural cooking class"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Description</span>
                <textarea
                  value={newActivity.description}
                  onChange={(e) =>
                    setNewActivity((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="What guests will do and what's included"
                  required
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Price</span>
                <input
                  type="number"
                  min={1}
                  value={newActivity.price}
                  onChange={(e) => setNewActivity((p) => ({ ...p, price: e.target.value }))}
                  placeholder="75"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Duration</span>
                <input
                  value={newActivity.duration}
                  onChange={(e) => setNewActivity((p) => ({ ...p, duration: e.target.value }))}
                  placeholder="90 min"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  Save experience
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setNewActivity(EMPTY_ACTIVITY);
                  }}
                  className="text-sm font-medium text-gray-600 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {data.activities.length === 0 ? (
            <p className="text-sm text-gray-400">No experiences yet. Add your first add-on above.</p>
          ) : (
            <ul className="space-y-2">
              {data.activities.map((act) => (
              <li
                key={act.id}
                className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{act.name}</p>
                  <p className="text-xs text-gray-500">
                    {act.description} · {act.duration} ·{" "}
                    {formatPrice(act.price, act.currency)}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer">
                  <span className="text-xs text-gray-500">{act.enabled ? "On" : "Off"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={act.enabled}
                    onClick={() => toggleActivity(act.id)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      act.enabled ? "bg-green-600" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        act.enabled && "translate-x-5"
                      )}
                    />
                  </button>
                </label>
              </li>
            ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Produce & product sales</h3>
            </div>
            <button
              type="button"
              onClick={() => setProductFormOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Add product
            </button>
          </div>

          {productFormOpen && (
            <form
              onSubmit={handleAddProduct}
              className="border border-green-100 bg-green-50/40 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Product name</span>
                <input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Farm honey (500g)"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Description</span>
                <textarea
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Short description for guests"
                  required
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Price (AED)</span>
                <input
                  type="number"
                  min={1}
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                  placeholder="45"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Unit</span>
                <input
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="jar, kg, bottle"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  Save product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductFormOpen(false);
                    setNewProduct(EMPTY_PRODUCT);
                  }}
                  className="text-sm font-medium text-gray-600 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {data.products.length === 0 ? (
            <p className="text-sm text-gray-400">No products yet. Add farm produce or goods above.</p>
          ) : (
            <ul className="space-y-2">
              {data.products.map((prod) => (
              <li
                key={prod.id}
                className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{prod.name}</p>
                  <p className="text-xs text-gray-500">
                    {prod.description} · {formatPrice(prod.price, prod.currency)} / {prod.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleProductStock(prod.id)}
                  className={cn(
                    "text-xs font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
                    prod.inStock
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {prod.inStock ? "In stock" : "Out of stock"}
                </button>
              </li>
            ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Weather advisories</h3>
          </div>
          <ul className="space-y-2">
            {data.weatherAdvisories.map((wx) => (
              <li
                key={wx.id}
                className={cn(
                  "border rounded-xl p-4 space-y-2",
                  wx.severity === "alert" && "border-red-200 bg-red-50/50",
                  wx.severity === "warning" && "border-amber-200 bg-amber-50/50",
                  wx.severity === "info" && "border-blue-100 bg-blue-50/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{wx.title}</p>
                  <span className="text-[10px] font-bold uppercase text-gray-500">{wx.date}</span>
                </div>
                <p className="text-sm text-gray-600">{wx.message}</p>
                {wx.affectsActivities.length > 0 && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Leaf className="w-3 h-3" />
                    Affects: {wx.affectsActivities.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </HostDashboardShell>
  );
}
