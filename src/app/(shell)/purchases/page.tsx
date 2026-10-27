"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  manufacturer: string;
  model: string;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  customer_type: string;
};

type Purchase = {
  id: string;
  vehicle_id: string;
  seller_id: string | null;
  purchase_date: string;
  purchase_price: number;
  notes: string | null;
};

type PurchaseRow = Purchase & {
  vehicle: Vehicle | null;
  seller: Customer | null;
};



const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function PurchasesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sellers, setSellers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    vehicle_id: "",
    seller_id: "",
    purchase_date: "",
    purchase_price: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [vehicleResult, sellerResult, purchaseResult] =
        await Promise.all([
          supabase
            .from("vehicles")
            .select(
              "id, vehicle_code, registration_number, chassis_number, engine_number, manufacturer, model",
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("customers")
            .select("id, full_name, phone, customer_type")
            .in("customer_type", ["seller", "both"])
            .order("full_name"),

          supabase
            .from("vehicle_purchases")
            .select(
              "id, vehicle_id, seller_id, purchase_date, purchase_price, notes",
            )
            .order("purchase_date", { ascending: false }),
        ]);

      if (vehicleResult.error) throw vehicleResult.error;
      if (sellerResult.error) throw sellerResult.error;
      if (purchaseResult.error) throw purchaseResult.error;

      const vehicleList = (vehicleResult.data ?? []) as Vehicle[];
      const sellerList = (sellerResult.data ?? []) as Customer[];
      const purchaseList = (purchaseResult.data ?? []) as Purchase[];

      setVehicles(vehicleList);
      setSellers(sellerList);

      const vehicleMap = new Map(vehicleList.map((v) => [v.id, v]));
      const sellerMap = new Map(sellerList.map((s) => [s.id, s]));

      setPurchases(
        purchaseList.map((purchase) => ({
          ...purchase,
          purchase_price: Number(purchase.purchase_price),
          vehicle: vehicleMap.get(purchase.vehicle_id) ?? null,
          seller: purchase.seller_id
            ? sellerMap.get(purchase.seller_id) ?? null
            : null,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load purchase records from Supabase.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
  
    setCurrentMonth(`${now.getFullYear()}-${month}`);
    void loadData();
  }, [loadData]);

  const totalSpent = purchases.reduce(
    (sum, purchase) => sum + purchase.purchase_price,
    0,
  );

  const monthlyPurchases = purchases.filter(
    (purchase) => purchase.purchase_date.slice(0, 7) === currentMonth,
  );

  const filteredPurchases = purchases.filter((purchase) => {
    const query = search.trim().toLowerCase();

    const searchable = [
      purchase.vehicle?.vehicle_code,
      purchase.vehicle?.registration_number,
      purchase.vehicle?.chassis_number,
      purchase.vehicle?.engine_number,
      purchase.vehicle?.manufacturer,
      purchase.vehicle?.model,
      purchase.seller?.full_name,
      purchase.seller?.phone,
      purchase.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  function openForm(purchase?: PurchaseRow) {
    setEditingId(purchase?.id ?? null);
  
    setForm({
      vehicle_id: purchase?.vehicle_id ?? "",
      seller_id: purchase?.seller_id ?? "",
      purchase_date:
        purchase?.purchase_date ??
        (() => {
          const now = new Date();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const day = String(now.getDate()).padStart(2, "0");
          return `${now.getFullYear()}-${month}-${day}`;
        })(),
      purchase_price:
        purchase != null ? String(purchase.purchase_price) : "",
      notes: purchase?.notes ?? "",
    });
  
    setError("");
    setSuccess("");
    setShowForm(true);
  }

 
async function savePurchase(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError("");
  setSuccess("");

  const price = Number(form.purchase_price);

  if (!form.vehicle_id) {
    setError("Please select a vehicle.");
    return;
  }

  if (
    form.purchase_price.trim() === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    setError("Enter a valid purchase price of zero or more.");
    return;
  }

  if (!form.purchase_date) {
    setError("Please select the purchase date.");
    return;
  }

  setSaving(true);

  try {
    const purchaseData = {
      vehicle_id: form.vehicle_id,
      seller_id: form.seller_id || null,
      purchase_date: form.purchase_date,
      purchase_price: price,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from("vehicle_purchases")
        .update(purchaseData)
        .eq("id", editingId);

      if (updateError) throw updateError;

      setSuccess("Purchase updated successfully.");
    } else {
      const { error: insertError } = await supabase
        .from("vehicle_purchases")
        .insert(purchaseData);

      if (insertError) throw insertError;

      setSuccess("Purchase saved successfully.");
    }

    setShowForm(false);
    setEditingId(null);

    await loadData();
  } catch (err: unknown) {
    console.error("Purchase save failed:", err);

    if (err && typeof err === "object" && "message" in err) {
      setError(String(err.message));
    } else {
      setError("Could not save the purchase.");
    }
  } finally {
    setSaving(false);
  }
}
async function deletePurchase(purchase: PurchaseRow) {
  const vehicleName = purchase.vehicle
    ? `${purchase.vehicle.manufacturer} ${purchase.vehicle.model}`
    : purchase.vehicle_id;

  const confirmed = window.confirm(
    `Delete the purchase record for ${vehicleName}? This will not delete the vehicle from Inventory.`,
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");
  setDeletingId(purchase.id);

  try {
    const { error: deleteError } = await supabase
      .from("vehicle_purchases")
      .delete()
      .eq("id", purchase.id);

    if (deleteError) throw deleteError;

    setSuccess("Purchase record deleted.");
    await loadData();
  } catch (err: unknown) {
    console.error("Purchase deletion failed:", err);

    if (err && typeof err === "object" && "message" in err) {
      setError(String(err.message));
    } else {
      setError("Could not delete the purchase.");
    }
  } finally {
    setDeletingId(null);
  }
}

  const inputClass =
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100";

  const labelClass = "block text-sm font-medium text-stone-700";

  return (
    <main className="space-y-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
            Deals by Anas / Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            Purchases
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Track vehicle acquisitions, sellers, and purchase costs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openForm()}
          disabled={vehicles.length === 0}
          className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Record Purchase
        </button>
      </header>

      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <strong>Supabase integration:</strong> Purchase records are loaded
        from your database.
      </div>

      {error && (
        <div
          role="alert"
          className="break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Total purchases", value: purchases.length.toString() },
          { title: "Total amount spent", value: money(totalSpent) },
          {
            title: "Purchases this month",
            value: monthlyPurchases.length.toString(),
          },
        ].map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-stone-500">{card.title}</p>
            <p className="mt-3 text-2xl font-bold text-stone-900">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Search purchases"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vehicle, registration, or seller..."
            className={inputClass + " mt-0"}
          />

          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-3 py-3">Vehicle</th>
                <th className="px-3 py-3">Seller</th>
                <th className="px-3 py-3">Purchase date</th>
                <th className="px-3 py-3">Purchase price</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPurchases.map((purchase) => (
                <tr
                  key={purchase.id}
                  className="border-b border-stone-100 last:border-0"
                >
                  <td className="px-3 py-4">
                    <p className="font-semibold text-stone-900">
                      {purchase.vehicle
                        ? `${purchase.vehicle.manufacturer} ${purchase.vehicle.model}`
                        : "Vehicle unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {purchase.vehicle?.vehicle_code ?? purchase.vehicle_id}
                    </p>
                    {purchase.vehicle?.registration_number && (
                      <p className="mt-1 text-xs text-stone-500">
                        Registration: {purchase.vehicle.registration_number}
                      </p>
                    )}
                    {purchase.vehicle?.chassis_number && (
                      <p className="mt-1 text-xs text-stone-500">
                        Chassis: {purchase.vehicle.chassis_number}
                      </p>
                    )}
                    {purchase.vehicle?.engine_number && (
                      <p className="mt-1 text-xs text-stone-500">
                        Engine: {purchase.vehicle.engine_number}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {purchase.seller?.full_name ?? "Not specified"}
                    {purchase.seller?.phone && (
                      <p className="mt-1 text-xs text-stone-500">
                        {purchase.seller.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-4">{purchase.purchase_date}</td>
                  <td className="px-3 py-4 font-semibold">
                    {money(purchase.purchase_price)}
                  </td>
                  <td className="max-w-xs whitespace-pre-wrap px-3 py-4">
                    {purchase.notes || "—"}
                  </td>
                  <td className="px-3 py-4">
  <div className="flex gap-3">
    <button
      type="button"
      onClick={() => openForm(purchase)}
      className="font-medium text-orange-700 hover:underline"
    >
      Edit
    </button>

    <button
      type="button"
      onClick={() => void deletePurchase(purchase)}
      disabled={deletingId === purchase.id}
      className="font-medium text-red-700 hover:underline disabled:opacity-50"
    >
      {deletingId === purchase.id ? "Deleting..." : "Delete"}
    </button>
  </div>
</td>
                </tr>
              ))}

              {!loading && filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="font-semibold text-stone-800">
                      {search ? "No matching purchases" : "No purchases yet"}
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      {search
                        ? "Try another search."
                        : "Record your first vehicle purchase to get started."}
                    </p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-14 text-center text-stone-500"
                  >
                    Loading purchases...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Showing {filteredPurchases.length} of {purchases.length} purchases
        </p>

        {vehicles.length === 0 && !loading && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Add a vehicle in Inventory before recording its purchase.
          </p>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 md:pt-14">
          <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
              <h2 className="text-xl font-bold text-stone-900">
  {editingId ? "Edit vehicle purchase" : "Record vehicle purchase"}
</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Enter the acquisition details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg px-3 py-2 text-stone-500 hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={savePurchase} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Vehicle *
                  <select
                    required
                    value={form.vehicle_id}
                    onChange={(event) =>
                      setForm({ ...form, vehicle_id: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_code} — {vehicle.manufacturer}{" "}
                        {vehicle.model}
                        {vehicle.registration_number
                          ? ` (${vehicle.registration_number})`
                          : ""}
                        {vehicle.chassis_number
                          ? ` | Chassis: ${vehicle.chassis_number}`
                          : ""}
                        {vehicle.engine_number
                          ? ` | Engine: ${vehicle.engine_number}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selectedVehicle = vehicles.find(
                      (vehicle) => vehicle.id === form.vehicle_id,
                    );
                    if (!selectedVehicle) return null;
                    return (
                      <div className="mt-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                        <p>
                          <span className="font-semibold">Chassis number:</span>{" "}
                          {selectedVehicle.chassis_number || "Not entered in Inventory"}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold">Engine number:</span>{" "}
                          {selectedVehicle.engine_number || "Not entered in Inventory"}
                        </p>
                      </div>
                    );
                  })()}
                </label>

                <label className={labelClass}>
                  Seller
                  <select
                    value={form.seller_id}
                    onChange={(event) =>
                      setForm({ ...form, seller_id: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">Not specified</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.full_name}
                        {seller.phone ? ` — ${seller.phone}` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-stone-500">
                    Only customers marked as seller or both are shown.
                  </span>
                </label>

                <label className={labelClass}>
                  Purchase date *
                  <input
                    required
                    type="date"
                    value={form.purchase_date}
                    onChange={(event) =>
                      setForm({ ...form, purchase_date: event.target.value })
                    }
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Purchase price (₹) *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_price}
                    onChange={(event) =>
                      setForm({ ...form, purchase_price: event.target.value })
                    }
                    className={inputClass}
                    placeholder="35000"
                  />
                </label>
              </div>

              <label className={labelClass}>
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Purchase condition, agreement details, etc."
                />
              </label>

              {error && (
                <p role="alert" className="break-words text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-stone-200 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-50"
                >
                  {saving
  ? "Saving..."
  : editingId
    ? "Save changes"
    : "Save purchase"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

