"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  vehicle_code: string | null;
  registration_number: string | null;
  manufacturer: string;
  model: string;
  manufacturing_year: number | null;
};

type TrackingRecord = {
  id: string;
  vehicle_id: string;
  rc_status: string;
  rc_application_date: string | null;
  rc_received_date: string | null;
  noc_status: string;
  noc_application_date: string | null;
  noc_received_date: string | null;
  notes: string | null;
};

const RC_STATUSES = ["Pending", "Applied", "Received", "Not Required"];
const NOC_STATUSES = ["Pending", "Requested", "Received", "Not Required"];

const emptyForm = {
  vehicle_id: "",
  rc_status: "Pending",
  rc_application_date: "",
  rc_received_date: "",
  noc_status: "Pending",
  noc_application_date: "",
  noc_received_date: "",
  notes: "",
};

export default function RcNocPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [vehicleResult, trackingResult] = await Promise.all([
      supabase
        .from("vehicles")
        .select(
          "id, vehicle_code, registration_number, manufacturer, model, manufacturing_year",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("rc_noc_tracking")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (vehicleResult.error) {
      setError(`Could not load vehicles: ${vehicleResult.error.message}`);
      setLoading(false);
      return;
    }

    if (trackingResult.error) {
      setError(
        `Could not load RC/NOC records: ${trackingResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    setVehicles(vehicleResult.data ?? []);
    setRecords((trackingResult.data ?? []) as TrackingRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = (
    field: keyof typeof emptyForm,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const startEdit = (record: TrackingRecord) => {
    setForm({
      vehicle_id: record.vehicle_id,
      rc_status: record.rc_status,
      rc_application_date: record.rc_application_date ?? "",
      rc_received_date: record.rc_received_date ?? "",
      noc_status: record.noc_status,
      noc_application_date: record.noc_application_date ?? "",
      noc_received_date: record.noc_received_date ?? "",
      notes: record.notes ?? "",
    });
    setEditingId(record.id);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.vehicle_id) {
      setError("Please select a vehicle.");
      return;
    }

    setSaving(true);

    const payload = {
      vehicle_id: form.vehicle_id,
      rc_status: form.rc_status,
      rc_application_date: form.rc_application_date || null,
      rc_received_date: form.rc_received_date || null,
      noc_status: form.noc_status,
      noc_application_date: form.noc_application_date || null,
      noc_received_date: form.noc_received_date || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("rc_noc_tracking")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("rc_noc_tracking").insert(payload);

    if (result.error) {
      setError(
        result.error.code === "23505"
          ? "This vehicle already has an RC/NOC tracking record. Edit its existing record instead."
          : `Could not save record: ${result.error.message}`,
      );
      setSaving(false);
      return;
    }

    resetForm();
    setSuccess(editingId ? "Record updated successfully." : "Record added successfully.");
    await loadData();
    setSaving(false);
  };

  const deleteRecord = async (record: TrackingRecord) => {
    const vehicle = vehicles.find((item) => item.id === record.vehicle_id);
    const label = vehicle
      ? `${vehicle.manufacturer} ${vehicle.model}`
      : "this record";

    if (!window.confirm(`Delete RC/NOC tracking for ${label}?`)) return;

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("rc_noc_tracking")
      .delete()
      .eq("id", record.id);

    if (deleteError) {
      setError(`Could not delete record: ${deleteError.message}`);
      return;
    }

    if (editingId === record.id) resetForm();
    setSuccess("Record deleted successfully.");
    await loadData();
  };

  const vehicleFor = (vehicleId: string) =>
    vehicles.find((vehicle) => vehicle.id === vehicleId);

  const visibleRecords = records.filter((record) => {
    const vehicle = vehicleFor(record.vehicle_id);
    const searchable = [
      vehicle?.vehicle_code,
      vehicle?.registration_number,
      vehicle?.manufacturer,
      vehicle?.model,
      record.rc_status,
      record.noc_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "RC Pending" &&
        !["Received", "Not Required"].includes(record.rc_status)) ||
      (filter === "NOC Pending" &&
        !["Received", "Not Required"].includes(record.noc_status));

    return matchesSearch && matchesFilter;
  });

  const rcPending = records.filter(
    (record) => !["Received", "Not Required"].includes(record.rc_status),
  ).length;

  const nocPending = records.filter(
    (record) => !["Received", "Not Required"].includes(record.noc_status),
  ).length;

  const selectClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500";
  const inputClass = selectClass;
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  const statusClass = (status: string) => {
    if (status === "Received") return "bg-green-100 text-green-800";
    if (status === "Not Required") return "bg-gray-100 text-gray-700";
    if (status === "Applied" || status === "Requested")
      return "bg-blue-100 text-blue-800";
    return "bg-amber-100 text-amber-800";
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RC & NOC Tracking</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track registration certificates and no-objection certificates for
          your dealership vehicles.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Tracking Records</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {records.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">RC Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{rcPending}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-800">NOC Pending</p>
          <p className="mt-2 text-3xl font-bold text-blue-900">{nocPending}</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {editingId ? "Edit RC/NOC Record" : "Add RC/NOC Record"}
        </h2>

        <form onSubmit={saveRecord} className="space-y-5">
          <div>
            <label className={labelClass}>Vehicle *</label>
            <select
              className={inputClass}
              value={form.vehicle_id}
              onChange={(event) => updateField("vehicle_id", event.target.value)}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_code
                    ? `${vehicle.vehicle_code} — `
                    : ""}
                  {vehicle.manufacturer} {vehicle.model}
                  {vehicle.registration_number
                    ? ` (${vehicle.registration_number})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">RC Details</h3>
              <div>
                <label className={labelClass}>RC Status</label>
                <select
                  className={inputClass}
                  value={form.rc_status}
                  onChange={(event) => updateField("rc_status", event.target.value)}
                >
                  {RC_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Application Date</label>
                <input
                  className={inputClass}
                  type="date"
                  value={form.rc_application_date}
                  onChange={(event) =>
                    updateField("rc_application_date", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Date Received</label>
                <input
                  className={inputClass}
                  type="date"
                  value={form.rc_received_date}
                  onChange={(event) =>
                    updateField("rc_received_date", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">NOC Details</h3>
              <div>
                <label className={labelClass}>NOC Status</label>
                <select
                  className={inputClass}
                  value={form.noc_status}
                  onChange={(event) => updateField("noc_status", event.target.value)}
                >
                  {NOC_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Application Date</label>
                <input
                  className={inputClass}
                  type="date"
                  value={form.noc_application_date}
                  onChange={(event) =>
                    updateField("noc_application_date", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Date Received</label>
                <input
                  className={inputClass}
                  type="date"
                  value={form.noc_received_date}
                  onChange={(event) =>
                    updateField("noc_received_date", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes / Follow-up Details</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Add application references, pending actions, or follow-up notes..."
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
                  ? "Update Record"
                  : "Save Record"}
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
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            RC/NOC Records
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={inputClass}
              placeholder="Search vehicle..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className={inputClass}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option>All</option>
              <option>RC Pending</option>
              <option>NOC Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading records...</p>
        ) : visibleRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No records found. Add an RC/NOC record above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-3 font-medium">Vehicle</th>
                  <th className="px-3 py-3 font-medium">Registration</th>
                  <th className="px-3 py-3 font-medium">RC Status</th>
                  <th className="px-3 py-3 font-medium">NOC Status</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => {
                  const vehicle = vehicleFor(record.vehicle_id);
                  return (
                    <tr key={record.id} className="border-b border-gray-100">
                      <td className="px-3 py-4 font-medium text-gray-900">
                        {vehicle
                          ? `${vehicle.manufacturer} ${vehicle.model}`
                          : "Vehicle unavailable"}
                        {vehicle?.manufacturing_year
                          ? ` (${vehicle.manufacturing_year})`
                          : ""}
                      </td>
                      <td className="px-3 py-4 text-gray-600">
                        {vehicle?.registration_number || "—"}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(record.rc_status)}`}
                        >
                          {record.rc_status}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(record.noc_status)}`}
                        >
                          {record.noc_status}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-3 py-4 text-gray-600">
                        {record.notes || "—"}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRecord(record)}
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