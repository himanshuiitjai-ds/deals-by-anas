"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  notes: string | null;
};

type CustomerForm = {
  full_name: string;
  phone: string;
  address: string;
  customer_type: "buyer" | "seller" | "both";
  notes: string;
};

const emptyForm: CustomerForm = {
  full_name: "",
  phone: "",
  address: "",
  customer_type: "buyer",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("customers")
      .select("id, full_name, phone, address, customer_type, notes")
      .order("full_name", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setCustomers([]);
    } else {
      setCustomers((data ?? []) as Customer[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function openForm(customer?: Customer) {
    setError("");
    setSuccess("");

    if (customer) {
      setEditingId(customer.id);
      setForm({
        full_name: customer.full_name ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        customer_type:
          customer.customer_type === "seller" ||
          customer.customer_type === "both"
            ? customer.customer_type
            : "buyer",
        notes: customer.notes ?? "",
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

  async function saveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Please enter the customer's name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const customerData = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      customer_type: form.customer_type,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingId)
      : await supabase.from("customers").insert(customerData);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    closeForm();
    setSuccess(editingId ? "Customer updated successfully." : "Customer added successfully.");
    await loadCustomers();
    setSaving(false);
  }

  async function deleteCustomer(customer: Customer) {
    const confirmed = window.confirm(
      `Delete ${customer.full_name}?\n\nIf this customer is linked to a purchase record, the database may prevent deletion.`
    );

    if (!confirmed) return;

    setDeletingId(customer.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (deleteError) {
      setError(
        `Could not delete customer. They may be linked to existing purchase records. Details: ${deleteError.message}`
      );
      setDeletingId(null);
      return;
    }

    setSuccess("Customer deleted successfully.");
    await loadCustomers();
    setDeletingId(null);
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = search.toLowerCase().trim();

    return (
      customer.full_name.toLowerCase().includes(query) ||
      (customer.phone ?? "").toLowerCase().includes(query) ||
      (customer.address ?? "").toLowerCase().includes(query) ||
      (customer.customer_type ?? "").toLowerCase().includes(query)
    );
  });

  const buyers = customers.filter(
    (customer) =>
      customer.customer_type === "buyer" ||
      customer.customer_type === "both"
  ).length;

  const sellers = customers.filter(
    (customer) =>
      customer.customer_type === "seller" ||
      customer.customer_type === "both"
  ).length;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage buyers, sellers, and their contact details.
          </p>
        </div>

        <button
          onClick={() => openForm()}
          className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Customer
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="mt-2 text-3xl font-bold">{customers.length}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Buyers</p>
          <p className="mt-2 text-3xl font-bold">{buyers}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Sellers</p>
          <p className="mt-2 text-3xl font-bold">{sellers}</p>
        </div>
      </div>

      {formOpen && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Customer" : "Add New Customer"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={saveCustomer} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Full Name *
                <input
                  required
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                  placeholder="Enter full name"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Phone Number
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="Enter phone number"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>

              <label className="block text-sm font-medium">
                Customer Type
                <select
                  value={form.customer_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customer_type: event.target.value as CustomerForm["customer_type"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-black"
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="both">Buyer & Seller</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Address
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="City, area, or full address"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black"
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Additional details..."
                rows={3}
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
                  : "Save Customer"}
            </button>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold">Customer Records</h2>

            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, address..."
                className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black sm:w-72"
              />

              <button
                onClick={() => void loadCustomers()}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No customers found</p>
            <p className="mt-1 text-sm text-gray-500">
              Add a customer or try a different search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {customer.full_name}
                    </td>
                    <td className="px-4 py-3">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize">
                        {(customer.customer_type ?? "buyer").replace(
                          "_",
                          " "
                        )}
                      </span>
                    </td>
                    <td className="max-w-48 truncate px-4 py-3">
                      {customer.address || "—"}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3">
                      {customer.notes || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openForm(customer)}
                          className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteCustomer(customer)}
                          disabled={deletingId === customer.id}
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === customer.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </section>
    </main>
  );
}