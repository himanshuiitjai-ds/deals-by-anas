"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  vehicle_code: string;
  manufacturer: string;
  model: string;
  registration_number: string | null;
};

type Expense = {
  id: string;
  vehicle_id: string | null;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  vendor_name: string | null;
  notes: string | null;
};

type ExpenseForm = {
  vehicle_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  vendor_name: string;
  notes: string;
};

const categories = [
  "Repairs",
  "Servicing",
  "Spare Parts",
  "Fuel",
  "Cleaning",
  "Insurance",
  "Transportation",
  "Documentation",
  "Other",
];

const emptyForm: ExpenseForm = {
  vehicle_id: "",
  expense_date: "",
  category: "Repairs",
  description: "",
  amount: "",
  vendor_name: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [today, setToday] = useState("");

  // Initialize the current date in the browser, not during prerendering.
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    setToday(`${year}-${month}-${day}`);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [expenseResult, vehicleResult] = await Promise.all([
      supabase
        .from("vehicle_expenses")
        .select(
          "id, vehicle_id, expense_date, category, description, amount, vendor_name, notes"
        )
        .order("expense_date", { ascending: false }),

      supabase
        .from("vehicles")
        .select("id, vehicle_code, manufacturer, model, registration_number")
        .order("created_at", { ascending: false }),
    ]);

    if (expenseResult.error) {
      setError(`Expenses: ${expenseResult.error.message}`);
      setExpenses([]);
    } else {
      setExpenses((expenseResult.data ?? []) as Expense[]);
    }

    if (vehicleResult.error) {
      setError((previous) =>
        previous
          ? `${previous} | Vehicles: ${vehicleResult.error.message}`
          : `Vehicles: ${vehicleResult.error.message}`
      );
      setVehicles([]);
    } else {
      setVehicles((vehicleResult.data ?? []) as Vehicle[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openForm(expense?: Expense) {
    setError("");
    setSuccess("");

    if (expense) {
      setEditingId(expense.id);

      setForm({
        vehicle_id: expense.vehicle_id ?? "",
        expense_date: expense.expense_date,
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        vendor_name: expense.vendor_name ?? "",
        notes: expense.notes ?? "",
      });
    } else {
      setEditingId(null);

      setForm({
        ...emptyForm,
        expense_date: today,
      });
    }

    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);

    setForm({
      ...emptyForm,
      expense_date: today,
    });
  }

  async function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const amount = Number(form.amount);

    if (!form.description.trim()) {
      setError("Please enter an expense description.");
      return;
    }

    if (
      !form.amount.trim() ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setError("Please enter a valid non-negative expense amount.");
      return;
    }

    if (!form.expense_date) {
      setError("Please select the expense date.");
      return;
    }

    setSaving(true);

    const expenseData = {
      vehicle_id: form.vehicle_id || null,
      expense_date: form.expense_date,
      category: form.category,
      description: form.description.trim(),
      amount,
      vendor_name: form.vendor_name.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("vehicle_expenses")
          .update(expenseData)
          .eq("id", editingId)
      : await supabase
          .from("vehicle_expenses")
          .insert(expenseData);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    const wasEditing = Boolean(editingId);

    closeForm();

    setSuccess(
      wasEditing
        ? "Expense updated successfully."
        : "Expense recorded successfully."
    );

    await loadData();
    setSaving(false);
  }

  async function deleteExpense(expense: Expense) {
    const confirmed = window.confirm(
      `Delete this expense?\n\n${expense.description}\nAmount: ${formatCurrency(Number(expense.amount))}`
    );

    if (!confirmed) return;

    setDeletingId(expense.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("vehicle_expenses")
      .delete()
      .eq("id", expense.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setSuccess("Expense deleted successfully.");

    await loadData();
    setDeletingId(null);
  }

  const filteredExpenses = expenses.filter((expense) => {
    const query = search.toLowerCase().trim();

    const vehicle = vehicles.find(
      (item) => item.id === expense.vehicle_id
    );

    const vehicleName = vehicle
      ? `${vehicle.vehicle_code} ${vehicle.manufacturer} ${vehicle.model} ${vehicle.registration_number ?? ""}`
      : "general expense";

    const searchableText = [
      expense.description,
      expense.category,
      expense.vendor_name ?? "",
      expense.notes ?? "",
      vehicleName,
      expense.expense_date,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !query || searchableText.includes(query);

    const matchesCategory =
      categoryFilter === "All" ||
      expense.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0
  );

  const currentMonth = today ? today.slice(0, 7) : "";

  const monthlyExpenses = expenses
    .filter(
      (expense) =>
        currentMonth &&
        expense.expense_date.startsWith(currentMonth)
    )
    .reduce(
      (total, expense) => total + Number(expense.amount),
      0
    );

  const vehicleExpenseCount = expenses.filter(
    (expense) => expense.vehicle_id !== null
  ).length;

  function vehicleLabel(vehicle: Vehicle) {
    return `${vehicle.vehicle_code} — ${vehicle.manufacturer} ${vehicle.model}${
      vehicle.registration_number
        ? ` (${vehicle.registration_number})`
        : ""
    }`;
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Expenses & Repairs
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track workshop bills, spare parts, servicing, and running costs.
          </p>
        </div>

        <button
          onClick={() => openForm()}
          className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Expense
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Total Recorded Expenses
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalExpenses)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {expenses.length} expense records
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Expenses This Month
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(monthlyExpenses)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {today
              ? new Date(`${today}T12:00:00`).toLocaleDateString(
                  "en-IN",
                  { month: "long", year: "numeric" }
                )
              : "Loading date..."}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Vehicle-Linked Expenses
          </p>

          <p className="mt-2 text-2xl font-bold">
            {vehicleExpenseCount}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Expenses linked to inventory vehicles
          </p>
        </div>
      </div>

      {formOpen && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Expense" : "Record New Expense"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={saveExpense} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Vehicle

                <select
                  value={form.vehicle_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vehicle_id: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-black"
                >
                  <option value="">
                    General expense (not vehicle-specific)
                  </option>

                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicleLabel(vehicle)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Expense Date *

                <input
                  type="date"
                  required
                  value={form.expense_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      expense_date: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Category *

                <select
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
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
                Amount (₹) *

                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      amount: event.target.value,
                    })
                  }
                  placeholder="e.g. 2500"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium sm:col-span-2">
                Description *

                <input
                  required
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="e.g. Front brake pad replacement"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium sm:col-span-2">
                Workshop / Vendor

                <input
                  value={form.vendor_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vendor_name: event.target.value,
                    })
                  }
                  placeholder="Mechanic, workshop, or supplier name"
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
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                placeholder="Additional details..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
              />
            </label>

            <button
              type="submit"
              disabled={saving || !today}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Save Expense"}
            </button>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold">
              Expense Records
            </h2>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search expenses..."
                className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black sm:w-64"
              />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="All">All Categories</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                onClick={() => void loadData()}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading expenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No expenses found</p>

            <p className="mt-1 text-sm text-gray-500">
              Record an expense or adjust your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.map((expense) => {
                  const vehicle = vehicles.find(
                    (item) => item.id === expense.vehicle_id
                  );

                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        {expense.expense_date}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle
                          ? `${vehicle.vehicle_code} · ${vehicle.manufacturer} ${vehicle.model}`
                          : "General"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium">
                          {expense.category}
                        </span>
                      </td>

                      <td className="max-w-56 truncate px-4 py-3">
                        {expense.description}
                      </td>

                      <td className="px-4 py-3">
                        {expense.vendor_name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                        {formatCurrency(Number(expense.amount))}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openForm(expense)}
                            className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void deleteExpense(expense)}
                            disabled={deletingId === expense.id}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === expense.id
                              ? "Deleting..."
                              : "Delete"}
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
          Showing {filteredExpenses.length} of {expenses.length} expense records
        </div>
      </section>
    </main>
  );
}

