"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  vehicle_code: string;
  manufacturer: string;
  model: string;
  registration_number: string | null;
  purchase_price: number | null;
  asking_price: number | null;
  status: string;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  customer_type: string | null;
};

type Sale = {
  id: string;
  vehicle_id: string;
  customer_id: string | null;
  sale_date: string;
  sale_price: number;
  payment_method: string;
  payment_status: string;
  amount_received: number;
  notes: string | null;
};

type Purchase = {
  vehicle_id: string;
  purchase_price: number;
};

type Expense = {
  vehicle_id: string | null;
  amount: number;
};

type SaleForm = {
  vehicle_id: string;
  customer_id: string;
  sale_date: string;
  sale_price: string;
  payment_method: string;
  payment_status: string;
  amount_received: string;
  notes: string;
};

const paymentMethods = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Card",
  "Finance",
  "Other",
];

const emptyForm: SaleForm = {
  vehicle_id: "",
  customer_id: "",
  sale_date: "",
  sale_price: "",
  payment_method: "Cash",
  payment_status: "Paid",
  amount_received: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<SaleForm>(emptyForm);
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setToday(getToday());
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      salesResult,
      vehiclesResult,
      customersResult,
      purchasesResult,
      expensesResult,
    ] = await Promise.all([
      supabase
        .from("vehicle_sales")
        .select(
          "id, vehicle_id, customer_id, sale_date, sale_price, payment_method, payment_status, amount_received, notes"
        )
        .order("sale_date", { ascending: false }),

      supabase
        .from("vehicles")
        .select(
          "id, vehicle_code, manufacturer, model, registration_number, purchase_price, asking_price, status"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("customers")
        .select("id, full_name, phone, customer_type")
        .order("full_name", { ascending: true }),

      supabase
        .from("vehicle_purchases")
        .select("vehicle_id, purchase_price"),

      supabase
        .from("vehicle_expenses")
        .select("vehicle_id, amount"),
    ]);

    const errors = [
      salesResult.error && `Sales: ${salesResult.error.message}`,
      vehiclesResult.error && `Vehicles: ${vehiclesResult.error.message}`,
      customersResult.error && `Customers: ${customersResult.error.message}`,
      purchasesResult.error && `Purchases: ${purchasesResult.error.message}`,
      expensesResult.error && `Expenses: ${expensesResult.error.message}`,
    ].filter(Boolean);

    if (errors.length > 0) {
      setError(errors.join(" | "));
    }

    setSales((salesResult.data ?? []) as Sale[]);
    setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
    setCustomers((customersResult.data ?? []) as Customer[]);
    setPurchases((purchasesResult.data ?? []) as Purchase[]);
    setExpenses((expensesResult.data ?? []) as Expense[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function getPurchaseCost(vehicleId: string) {
    const purchaseRecords = purchases.filter(
      (purchase) => purchase.vehicle_id === vehicleId
    );

    if (purchaseRecords.length > 0) {
      return purchaseRecords.reduce(
        (total, purchase) => total + Number(purchase.purchase_price),
        0
      );
    }

    const vehicle = vehicles.find((item) => item.id === vehicleId);

    return Number(vehicle?.purchase_price ?? 0);
  }

  function getVehicleExpenses(vehicleId: string) {
    return expenses
      .filter((expense) => expense.vehicle_id === vehicleId)
      .reduce((total, expense) => total + Number(expense.amount), 0);
  }

  function getProfit(sale: Sale) {
    return (
      Number(sale.sale_price) -
      getPurchaseCost(sale.vehicle_id) -
      getVehicleExpenses(sale.vehicle_id)
    );
  }

  function getVehicleLabel(vehicle: Vehicle) {
    return `${vehicle.vehicle_code} — ${vehicle.manufacturer} ${vehicle.model}${
      vehicle.registration_number
        ? ` (${vehicle.registration_number})`
        : ""
    }`;
  }

  function openForm(sale?: Sale) {
    setError("");
    setSuccess("");

    if (sale) {
      setEditingId(sale.id);

      setForm({
        vehicle_id: sale.vehicle_id,
        customer_id: sale.customer_id ?? "",
        sale_date: sale.sale_date,
        sale_price: String(sale.sale_price),
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        amount_received: String(sale.amount_received),
        notes: sale.notes ?? "",
      });
    } else {
      setEditingId(null);

      setForm({
        ...emptyForm,
        sale_date: today,
      });
    }

    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm({
      ...emptyForm,
      sale_date: today,
    });
  }

  async function saveSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const salePrice = Number(form.sale_price);
    const amountReceived = Number(form.amount_received);

    if (!form.vehicle_id) {
      setError("Please select a vehicle.");
      return;
    }

    if (
      !form.sale_price.trim() ||
      !Number.isFinite(salePrice) ||
      salePrice <= 0
    ) {
      setError("Enter a valid sale price greater than zero.");
      return;
    }

    if (
      form.amount_received.trim() === "" ||
      !Number.isFinite(amountReceived) ||
      amountReceived < 0 ||
      amountReceived > salePrice
    ) {
      setError(
        "Amount received must be between zero and the sale price."
      );
      return;
    }

    if (!form.sale_date) {
      setError("Please select the sale date.");
      return;
    }

    if (
      !editingId &&
      sales.some((sale) => sale.vehicle_id === form.vehicle_id)
    ) {
      setError(
        "This vehicle already has a sale record. Edit the existing sale instead."
      );
      return;
    }

    const selectedVehicle = vehicles.find(
      (vehicle) => vehicle.id === form.vehicle_id
    );

    if (!selectedVehicle) {
      setError("The selected vehicle could not be found.");
      return;
    }

    if (
      !editingId &&
      selectedVehicle.status.toLowerCase() === "sold"
    ) {
      setError("This vehicle is already marked as sold.");
      return;
    }

    const paymentStatus =
      amountReceived === 0
        ? "Unpaid"
        : amountReceived < salePrice
          ? "Partially Paid"
          : "Paid";

    setSaving(true);

    const saleData = {
      vehicle_id: form.vehicle_id,
      customer_id: form.customer_id || null,
      sale_date: form.sale_date,
      sale_price: salePrice,
      payment_method: form.payment_method,
      payment_status: paymentStatus,
      amount_received: amountReceived,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const previousSale = editingId
      ? sales.find((sale) => sale.id === editingId)
      : undefined;

    const result = editingId
      ? await supabase
          .from("vehicle_sales")
          .update(saleData)
          .eq("id", editingId)
      : await supabase.from("vehicle_sales").insert(saleData);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    // Mark the sold vehicle as sold. If this fails, report it explicitly.
    const { error: vehicleUpdateError } = await supabase
      .from("vehicles")
      .update({ status: "sold" })
      .eq("id", form.vehicle_id);

    if (vehicleUpdateError) {
      setError(
        `Sale record saved, but the vehicle status could not be updated: ${vehicleUpdateError.message}. Refresh and check the vehicle inventory.`
      );
      await loadData();
      setSaving(false);
      return;
    }

    // If an existing sale was moved to another vehicle, restore the old
    // vehicle to purchased status only if it has no other sale record.
    if (
      previousSale &&
      previousSale.vehicle_id !== form.vehicle_id
    ) {
      const otherSale = sales.some(
        (sale) =>
          sale.id !== editingId &&
          sale.vehicle_id === previousSale.vehicle_id
      );

      if (!otherSale) {
        await supabase
          .from("vehicles")
          .update({ status: "purchased" })
          .eq("id", previousSale.vehicle_id);
      }
    }

    const wasEditing = Boolean(editingId);

    closeForm();

    setSuccess(
      wasEditing
        ? "Sale updated and vehicle status refreshed."
        : "Sale recorded and vehicle marked as sold."
    );

    await loadData();
    setSaving(false);
  }

  async function deleteSale(sale: Sale) {
    const confirmed = window.confirm(
      "Delete this sales record? The vehicle will be returned to inventory."
    );

    if (!confirmed) return;

    setDeletingId(sale.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("vehicle_sales")
      .delete()
      .eq("id", sale.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    // Only restore the vehicle if no other sale record exists.
    const { data: remainingSales, error: checkError } = await supabase
      .from("vehicle_sales")
      .select("id")
      .eq("vehicle_id", sale.vehicle_id)
      .limit(1);

    if (checkError) {
      setError(
        `Sale deleted, but vehicle status could not be verified: ${checkError.message}`
      );
      await loadData();
      setDeletingId(null);
      return;
    }

    if (!remainingSales || remainingSales.length === 0) {
      const { error: restoreError } = await supabase
        .from("vehicles")
        .update({ status: "purchased" })
        .eq("id", sale.vehicle_id);

      if (restoreError) {
        setError(
          `Sale deleted, but vehicle status could not be restored: ${restoreError.message}`
        );
        await loadData();
        setDeletingId(null);
        return;
      }
    }

    setSuccess("Sales record deleted and inventory refreshed.");
    await loadData();
    setDeletingId(null);
  }

  const filteredSales = sales.filter((sale) => {
    const vehicle = vehicles.find(
      (item) => item.id === sale.vehicle_id
    );

    const customer = customers.find(
      (item) => item.id === sale.customer_id
    );

    const query = search.toLowerCase().trim();

    const searchableText = [
      vehicle ? getVehicleLabel(vehicle) : "",
      customer?.full_name ?? "",
      customer?.phone ?? "",
      sale.payment_method,
      sale.payment_status,
      sale.sale_date,
      sale.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return !query || searchableText.includes(query);
  });

  const totalSales = sales.reduce(
    (total, sale) => total + Number(sale.sale_price),
    0
  );

  const totalReceived = sales.reduce(
    (total, sale) => total + Number(sale.amount_received),
    0
  );

  const totalOutstanding = totalSales - totalReceived;

  const totalProfit = sales.reduce(
    (total, sale) => total + getProfit(sale),
    0
  );

  const availableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status.toLowerCase() !== "sold" &&
      !sales.some((sale) => sale.vehicle_id === vehicle.id)
  );

  const buyers = customers.filter(
    (customer) =>
      customer.customer_type === "buyer" ||
      customer.customer_type === "both"
  );

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record vehicle sales, track payments, and estimate profits.
          </p>
        </div>

        <button
          onClick={() => openForm()}
          className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Record Sale
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
          <p className="text-sm text-gray-500">Total Sales Value</p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalSales)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {sales.length} recorded sales
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Payments Received</p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalReceived)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Outstanding Payments</p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Estimated Total Profit</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              totalProfit < 0 ? "text-red-600" : "text-green-700"
            }`}
          >
            {formatCurrency(totalProfit)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Sale value minus recorded costs
          </p>
        </div>
      </div>

      {formOpen && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Sale" : "Record Vehicle Sale"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={saveSale} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Vehicle *
                <select
                  required
                  value={form.vehicle_id}
                  onChange={(event) => {
                    const vehicleId = event.target.value;
                    const vehicle = vehicles.find(
                      (item) => item.id === vehicleId
                    );

                    setForm({
                      ...form,
                      vehicle_id: vehicleId,
                      sale_price:
                        !editingId && vehicle?.asking_price != null
                          ? String(vehicle.asking_price)
                          : form.sale_price,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-black"
                >
                  <option value="">Select an available vehicle</option>

                  {(editingId
                    ? vehicles.filter(
                        (vehicle) =>
                          vehicle.id === form.vehicle_id ||
                          availableVehicles.some(
                            (item) => item.id === vehicle.id
                          )
                      )
                    : availableVehicles
                  ).map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {getVehicleLabel(vehicle)}
                    </option>
                  ))}
                </select>

                {availableVehicles.length === 0 && !editingId && (
                  <span className="mt-1 block text-xs text-amber-700">
                    No available vehicles found. Add a vehicle to inventory first.
                  </span>
                )}
              </label>

              <label className="block text-sm font-medium">
                Buyer
                <select
                  value={form.customer_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customer_id: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-black"
                >
                  <option value="">No buyer selected</option>

                  {buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.full_name}
                      {buyer.phone ? ` — ${buyer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Sale Date *
                <input
                  type="date"
                  required
                  value={form.sale_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sale_date: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Sale Price (₹) *
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.sale_price}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sale_price: event.target.value,
                    })
                  }
                  placeholder="e.g. 65000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Payment Method *
                <select
                  required
                  value={form.payment_method}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      payment_method: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-black"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Amount Received (₹) *
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount_received}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      amount_received: event.target.value,
                    })
                  }
                  placeholder="Amount paid so far"
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
                placeholder="Payment details, delivery information, or other notes..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
              />
            </label>

            <p className="text-xs text-gray-500">
              Payment status is calculated automatically from the sale price
              and amount received. Profit is an estimate based on recorded
              purchase cost and vehicle-linked expenses.
            </p>

            <button
              type="submit"
              disabled={saving || !today}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Record Sale"}
            </button>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold">Sales History</h2>

            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search vehicle, buyer, payment..."
                className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black sm:w-72"
              />

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
            Loading sales...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No sales found</p>
            <p className="mt-1 text-sm text-gray-500">
              Record a sale or adjust your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 text-right font-medium">Sale Price</th>
                  <th className="px-4 py-3 text-right font-medium">Received</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-right font-medium">Est. Profit</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((sale) => {
                  const vehicle = vehicles.find(
                    (item) => item.id === sale.vehicle_id
                  );

                  const customer = customers.find(
                    (item) => item.id === sale.customer_id
                  );

                  const balance =
                    Number(sale.sale_price) -
                    Number(sale.amount_received);

                  const profit = getProfit(sale);

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        {sale.sale_date}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle ? getVehicleLabel(vehicle) : "Vehicle unavailable"}
                      </td>

                      <td className="px-4 py-3">
                        {customer?.full_name ?? "—"}
                        {customer?.phone && (
                          <div className="mt-1 text-xs text-gray-500">
                            {customer.phone}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {formatCurrency(Number(sale.sale_price))}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {formatCurrency(Number(sale.amount_received))}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {formatCurrency(balance)}
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                          profit < 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {formatCurrency(profit)}
                      </td>

                      <td className="px-4 py-3">
                        <div>{sale.payment_method}</div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-1 text-xs ${
                            sale.payment_status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : sale.payment_status === "Unpaid"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {sale.payment_status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openForm(sale)}
                            className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void deleteSale(sale)}
                            disabled={deletingId === sale.id}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === sale.id
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
          Showing {filteredSales.length} of {sales.length} sales records
        </div>
      </section>
    </main>
  );
}

