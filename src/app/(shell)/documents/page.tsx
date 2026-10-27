"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  vehicle_code: string | null;
  registration_number: string | null;
  manufacturer: string;
  model: string;
};

type VehicleDocument = {
  id: string;
  vehicle_id: string | null;
  document_name: string;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_status: string;
  file_path: string | null;
  notes: string | null;
  created_at: string;
};

const DOCUMENT_TYPES = [
  "RC",
  "Insurance",
  "PUC",
  "NOC",
  "Purchase Agreement",
  "Sale Agreement",
  "Invoice",
  "Identity Proof",
  "Address Proof",
  "Other",
];

const DOCUMENT_STATUSES = [
  "Available",
  "Pending",
  "Expired",
  "Not Applicable",
];

const emptyForm = {
  vehicle_id: "",
  document_name: "",
  document_type: "RC",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  document_status: "Available",
  notes: "",
};

export default function DocumentsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [vehicleResult, documentResult] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, vehicle_code, registration_number, manufacturer, model")
        .order("created_at", { ascending: false }),

      supabase
        .from("vehicle_documents")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (vehicleResult.error) {
      setError(`Could not load vehicles: ${vehicleResult.error.message}`);
      setLoading(false);
      return;
    }

    if (documentResult.error) {
      setError(`Could not load documents: ${documentResult.error.message}`);
      setLoading(false);
      return;
    }

    setVehicles(vehicleResult.data ?? []);
    setDocuments((documentResult.data ?? []) as VehicleDocument[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (document: VehicleDocument) => {
    setForm({
      vehicle_id: document.vehicle_id ?? "",
      document_name: document.document_name,
      document_type: document.document_type,
      document_number: document.document_number ?? "",
      issue_date: document.issue_date ?? "",
      expiry_date: document.expiry_date ?? "",
      document_status: document.document_status,
      notes: document.notes ?? "",
    });

    setEditingId(document.id);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.document_name.trim()) {
      setError("Please enter a document name.");
      return;
    }

    if (
      form.issue_date &&
      form.expiry_date &&
      form.expiry_date < form.issue_date
    ) {
      setError("Expiry date cannot be earlier than the issue date.");
      return;
    }

    setSaving(true);

    const payload = {
      vehicle_id: form.vehicle_id || null,
      document_name: form.document_name.trim(),
      document_type: form.document_type,
      document_number: form.document_number.trim() || null,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      document_status: form.document_status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("vehicle_documents")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("vehicle_documents").insert(payload);

    if (result.error) {
      setError(`Could not save document: ${result.error.message}`);
      setSaving(false);
      return;
    }

    resetForm();
    setMessage(editingId ? "Document updated successfully." : "Document saved successfully.");
    await loadData();
    setSaving(false);
  };

  const deleteDocument = async (document: VehicleDocument) => {
    if (
      !window.confirm(
        `Delete the document record "${document.document_name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("vehicle_documents")
      .delete()
      .eq("id", document.id);

    if (deleteError) {
      setError(`Could not delete document: ${deleteError.message}`);
      return;
    }

    if (editingId === document.id) resetForm();

    setMessage("Document record deleted successfully.");
    await loadData();
  };

  const vehicleFor = (vehicleId: string | null) =>
    vehicles.find((vehicle) => vehicle.id === vehicleId);

  const getEffectiveStatus = (document: VehicleDocument) => {
    if (
      document.expiry_date &&
      document.document_status === "Available" &&
      document.expiry_date < new Date().toLocaleDateString("en-CA")
    ) {
      return "Expired";
    }

    return document.document_status;
  };

  const filteredDocuments = documents.filter((document) => {
    const vehicle = vehicleFor(document.vehicle_id);

    const searchText = [
      document.document_name,
      document.document_type,
      document.document_number,
      document.notes,
      vehicle?.vehicle_code,
      vehicle?.registration_number,
      vehicle?.manufacturer,
      vehicle?.model,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase());

    const matchesType =
      typeFilter === "All" || document.document_type === typeFilter;

    const matchesStatus =
      statusFilter === "All" ||
      getEffectiveStatus(document) === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const expiredCount = documents.filter(
    (document) => getEffectiveStatus(document) === "Expired",
  ).length;

  const pendingCount = documents.filter(
    (document) => getEffectiveStatus(document) === "Pending",
  ).length;

  const availableCount = documents.filter(
    (document) => getEffectiveStatus(document) === "Available",
  ).length;

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  const statusClass = (status: string) => {
    if (status === "Available") return "bg-green-100 text-green-800";
    if (status === "Expired") return "bg-red-100 text-red-800";
    if (status === "Pending") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage vehicle paperwork, document references, and expiry dates.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Documents</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {documents.length}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-800">Available</p>
          <p className="mt-2 text-3xl font-bold text-green-900">
            {availableCount}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800">Expired</p>
          <p className="mt-2 text-3xl font-bold text-red-900">
            {expiredCount}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {editingId ? "Edit Document" : "Add Document"}
        </h2>

        <form onSubmit={saveDocument} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Document Name *</label>
              <input
                className={inputClass}
                placeholder="e.g. Insurance Certificate"
                value={form.document_name}
                onChange={(event) =>
                  updateField("document_name", event.target.value)
                }
                required
              />
            </div>

            <div>
              <label className={labelClass}>Document Type</label>
              <select
                className={inputClass}
                value={form.document_type}
                onChange={(event) =>
                  updateField("document_type", event.target.value)
                }
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Link to Vehicle</label>
              <select
                className={inputClass}
                value={form.vehicle_id}
                onChange={(event) =>
                  updateField("vehicle_id", event.target.value)
                }
              >
                <option value="">General / Not linked to a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_code ? `${vehicle.vehicle_code} — ` : ""}
                    {vehicle.manufacturer} {vehicle.model}
                    {vehicle.registration_number
                      ? ` (${vehicle.registration_number})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Document Number / Reference</label>
              <input
                className={inputClass}
                placeholder="Enter reference number"
                value={form.document_number}
                onChange={(event) =>
                  updateField("document_number", event.target.value)
                }
              />
            </div>

            <div>
              <label className={labelClass}>Issue Date</label>
              <input
                className={inputClass}
                type="date"
                value={form.issue_date}
                onChange={(event) =>
                  updateField("issue_date", event.target.value)
                }
              />
            </div>

            <div>
              <label className={labelClass}>Expiry Date</label>
              <input
                className={inputClass}
                type="date"
                value={form.expiry_date}
                onChange={(event) =>
                  updateField("expiry_date", event.target.value)
                }
              />
            </div>

            <div>
              <label className={labelClass}>Document Status</label>
              <select
                className={inputClass}
                value={form.document_status}
                onChange={(event) =>
                  updateField("document_status", event.target.value)
                }
              >
                {DOCUMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Additional details or follow-up notes..."
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Document"
                  : "Save Document"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Document Register
          </h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className={inputClass}
              placeholder="Search documents..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className={inputClass}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="All">All types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              className={inputClass}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {DOCUMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Loading documents...
          </p>
        ) : filteredDocuments.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No documents found. Add your first document above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-3 font-medium">Document</th>
                  <th className="px-3 py-3 font-medium">Vehicle</th>
                  <th className="px-3 py-3 font-medium">Reference No.</th>
                  <th className="px-3 py-3 font-medium">Issue Date</th>
                  <th className="px-3 py-3 font-medium">Expiry Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((document) => {
                  const vehicle = vehicleFor(document.vehicle_id);
                  const status = getEffectiveStatus(document);

                  return (
                    <tr
                      key={document.id}
                      className="border-b border-gray-100"
                    >
                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-900">
                          {document.document_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {document.document_type}
                        </p>
                      </td>

                      <td className="px-3 py-4 text-gray-600">
                        {vehicle
                          ? `${vehicle.manufacturer} ${vehicle.model}`
                          : document.vehicle_id
                            ? "Vehicle unavailable"
                            : "General"}
                      </td>

                      <td className="px-3 py-4 text-gray-600">
                        {document.document_number || "—"}
                      </td>

                      <td className="px-3 py-4 text-gray-600">
                        {document.issue_date || "—"}
                      </td>

                      <td className="px-3 py-4 text-gray-600">
                        {document.expiry_date || "—"}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(document)}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteDocument(document)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Delete
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
      </section>
    </main>
  );
}