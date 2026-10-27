"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SparePart = {
  id: string;
  part_name: string;
  part_code: string | null;
  category: string;
  quantity: number;
  minimum_stock: number;
  unit_cost: number;
  supplier_name: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
};

type PartForm = {
  part_name: string;
  part_code: string;
  category: string;
  quantity: string;
  minimum_stock: string;
  unit_cost: string;
  supplier_name: string;
  location: string;
  notes: string;
};

const categories = [
  "Engine",
  "Brakes",
  "Electrical",
  "Tyres & Wheels",
  "Transmission",
  "Suspension",
  "Body Parts",
  "Filters",
  "Oil & Fluids",
  "Accessories",
  "Other",
];

const emptyForm: PartForm = {
  part_name: "",
  part_code: "",
  category: "Other",
  quantity: "0",
  minimum_stock: "2",
  unit_cost: "0",
  supplier_name: "",
  location: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartForm>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadParts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("spare_parts")
      .select(
        "id, part_name, part_code, category, quantity, minimum_stock, unit_cost, supplier_name, location, notes, created_at"
      )
      .order("part_name", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setParts([]);
    } else {
      setParts((data ?? []) as SparePart[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadParts();
  }, [loadParts]);

  function openForm(part?: SparePart) {
    setError("");
    setSuccess("");

    if (part) {
      setEditingId(part.id);
      setForm({
        part_name: part.part_name,
        part_code: part.part_code ?? "",
        category: part.category,
        quantity: String(part.quantity),
        minimum_stock: String(part.minimum_stock),
        unit_cost: String(part.unit_cost),
        supplier_name: part.supplier_name ?? "",
        location: part.location ?? "",
        notes: part.notes ?? "",
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }

    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function savePart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const quantity = Number(form.quantity);
    const minimumStock = Number(form.minimum_stock);
    const unitCost = Number(form.unit_cost);

    if (!form.part_name.trim()) {
      setError("Please enter the spare part name.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Number.isInteger(minimumStock) ||
      minimumStock < 0
    ) {
      setError("Quantity and minimum stock must be non-negative whole numbers.");
      return;
    }

    if (
      !form.unit_cost.trim() ||
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      setError("Please enter a valid non-negative unit cost.");
      return;
    }

    setSaving(true);

    const partData = {
      part_name: form.part_name.trim(),
      part_code: form.part_code.trim() || null,
      category: form.category,
      quantity,
      minimum_stock: minimumStock,
      unit_cost: unitCost,
      supplier_name: form.supplier_name.trim() || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("spare_parts")
          .update(partData)
          .eq("id", editingId)
      : await supabase.from("spare_parts").insert(partData);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    const wasEditing = Boolean(editingId);
    closeForm();

    setSuccess(
      wasEditing
        ? "Spare part updated successfully."
        : "Spare part added successfully."
    );

    await loadParts();
    setSaving(false);
  }

  async function deletePart(part: SparePart) {
    const confirmed = window.confirm(
      `Delete "${part.part_name}" from spare parts inventory?`
    );

    if (!confirmed) return;

    setDeletingId(part.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("spare_parts")
      .delete()
      .eq("id", part.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setSuccess("Spare part deleted successfully.");
    await loadParts();
    setDeletingId(null);
  }

  const lowStockParts = parts.filter(
    (part) => Number(part.quantity) <= Number(part.minimum_stock)
  );

  const totalStockValue = parts.reduce(
    (total, part) =>
      total + Number(part.quantity) * Number(part.unit_cost),
    0
  );

  const totalUnits = parts.reduce(
    (total, part) => total + Number(part.quantity),
    0
  );

  const filteredParts = parts.filter((part) => {
    const query = search.toLowerCase().trim();

    const searchableText = [
      part.part_name,
      part.part_code ?? "",
      part.category,
      part.supplier_name ?? "",
      part.location ?? "",
      part.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);

    const matchesCategory =
      categoryFilter === "All" || part.category === categoryFilter;

    const isLowStock =
      Number(part.quantity) <= Number(part.minimum_stock);

    const matchesStock =
      stockFilter === "All" ||
      (stockFilter === "Low Stock" && isLowStock) ||
      (stockFilter === "In Stock" && Number(part.quantity) > 0) ||
      (stockFilter === "Out of Stock" && Number(part.quantity) === 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spare Parts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage parts inventory, stock levels, suppliers, and costs.
          </p>
        </div>

        <button
          onClick={() => openForm()}
          className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Spare Part
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Unique Spare Parts</p>
          <p className="mt-2 text-2xl font-bold">{parts.length}</p>
          <p className="mt-1 text-xs text-gray-500">
            Different part records
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Units in Stock</p>
          <p className="mt-2 text-2xl font-bold">{totalUnits}</p>
          <p className="mt-1 text-xs text-gray-500">
            Units across all parts
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Stock Value</p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalStockValue)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Quantity × unit cost
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              lowStockParts.length > 0 ? "text-red-600" : ""
            }`}
          >
            {lowStockParts.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            At or below minimum stock
          </p>
        </div>
      </div>

      {lowStockParts.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">
            Low Stock Warning
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            These parts have reached or fallen below their minimum stock level:
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {lowStockParts.map((part) => (
              <span
                key={part.id}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-amber-900"
              >
                {part.part_name}: {part.quantity} left
              </span>
            ))}
          </div>
        </section>
      )}

      {formOpen && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Spare Part" : "Add New Spare Part"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={savePart} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm font-medium">
                Part Name *
                <input
                  required
                  value={form.part_name}
                  onChange={(event) =>
                    setForm({ ...form, part_name: event.target.value })
                  }
                  placeholder="e.g. Front brake pads"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Part Code
                <input
                  value={form.part_code}
                  onChange={(event) =>
                    setForm({ ...form, part_code: event.target.value })
                  }
                  placeholder="e.g. BP001"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Category *
                <select
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-black"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Quantity *
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({ ...form, quantity: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Minimum Stock *
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.minimum_stock}
                  onChange={(event) =>
                    setForm({ ...form, minimum_stock: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Unit Cost (₹) *
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.unit_cost}
                  onChange={(event) =>
                    setForm({ ...form, unit_cost: event.target.value })
                  }
                  placeholder="e.g. 350"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Supplier
                <input
                  value={form.supplier_name}
                  onChange={(event) =>
                    setForm({ ...form, supplier_name: event.target.value })
                  }
                  placeholder="Supplier or shop name"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Storage Location
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  placeholder="e.g. Shelf A"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Compatibility, brand, or other details..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Save Spare Part"}
            </button>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <h2 className="text-lg font-semibold">Parts Inventory</h2>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search parts or suppliers..."
                className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black sm:w-56"
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="All">All Stock</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>

              <button
                onClick={() => void loadParts()}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading spare parts...
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No spare parts found</p>
            <p className="mt-1 text-sm text-gray-500">
              Add a part or adjust your search and filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Part</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Min. Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Stock Value</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredParts.map((part) => {
                  const isLowStock =
                    Number(part.quantity) <= Number(part.minimum_stock);

                  return (
                    <tr key={part.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{part.part_name}</div>
                        {part.part_code && (
                          <div className="mt-1 text-xs text-gray-500">
                            {part.part_code}
                          </div>
                        )}
                        {part.location && (
                          <div className="mt-1 text-xs text-gray-500">
                            Location: {part.location}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">{part.category}</td>

                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          Number(part.quantity) === 0
                            ? "text-red-600"
                            : isLowStock
                              ? "text-amber-600"
                              : ""
                        }`}
                      >
                        {part.quantity}
                        {Number(part.quantity) === 0 && (
                          <div className="text-xs">Out of stock</div>
                        )}
                        {Number(part.quantity) > 0 && isLowStock && (
                          <div className="text-xs">Low stock</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {part.minimum_stock}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {formatCurrency(Number(part.unit_cost))}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {formatCurrency(
                          Number(part.quantity) * Number(part.unit_cost)
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {part.supplier_name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openForm(part)}
                            className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void deletePart(part)}
                            disabled={deletingId === part.id}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === part.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
          Showing {filteredParts.length} of {parts.length} part records
        </div>
      </section>
    </main>
  );
}

