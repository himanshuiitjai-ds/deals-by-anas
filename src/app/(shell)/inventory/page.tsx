"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type VehicleStatus =
  | "purchased"
  | "under_repair"
  | "ready_for_sale"
  | "reserved"
  | "sold"
  | "on_hold";

type Vehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string;
  chassis_number: string;
  engine_number: string;
  manufacturer: string;
  model: string;
  manufacturing_year: string;
  fuel_type: string;
  odometer_km: string;
  colour: string;
  purchase_price: string;
  asking_price: string;
  status: VehicleStatus;
  condition_notes: string;
};

type VehicleForm = Omit<Vehicle, "id">;

const emptyForm: VehicleForm = {
  vehicle_code: "",
  registration_number: "",
  chassis_number: "",
  engine_number: "",
  manufacturer: "",
  model: "",
  manufacturing_year: "",
  fuel_type: "Petrol",
  odometer_km: "",
  colour: "",
  purchase_price: "",
  asking_price: "",
  status: "purchased",
  condition_notes: "",
};

const statusOptions: { value: VehicleStatus; label: string }[] = [
  { value: "purchased", label: "Purchased" },
  { value: "under_repair", label: "Under repair" },
  { value: "ready_for_sale", label: "Ready for sale" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "on_hold", label: "On hold" },
];

const formatMoney = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function InventoryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVehicles() {
      setIsLoading(true);
      const { data, error: loadError } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError(`Could not load vehicles from Supabase: ${loadError.message}`);
        setVehicles([]);
      } else {
        setVehicles(
          (data ?? []).map((row) => ({
            id: row.id,
            vehicle_code: row.vehicle_code ?? "",
            registration_number: row.registration_number ?? "",
            chassis_number: row.chassis_number ?? "",
            engine_number: row.engine_number ?? "",
            manufacturer: row.manufacturer ?? "",
            model: row.model ?? "",
            manufacturing_year: row.manufacturing_year == null ? "" : String(row.manufacturing_year),
            fuel_type: row.fuel_type ?? "Petrol",
            odometer_km: row.odometer_km == null ? "" : String(row.odometer_km),
            colour: row.colour ?? "",
            purchase_price: row.purchase_price == null ? "" : String(row.purchase_price),
            asking_price: row.asking_price == null ? "" : String(row.asking_price),
            status: row.status as VehicleStatus,
            condition_notes: row.condition_notes ?? "",
          })),
        );
        setError("");
      }
      setIsLoading(false);
    }

    void loadVehicles();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const searchable = [
        vehicle.vehicle_code,
        vehicle.registration_number,
        vehicle.chassis_number,
        vehicle.engine_number,
        vehicle.manufacturer,
        vehicle.model,
        vehicle.colour,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(query);
      const matchesStatus =
        statusFilter === "all" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  const inStock = vehicles.filter((v) => v.status !== "sold").length;
  const readyForSale = vehicles.filter(
    (v) => v.status === "ready_for_sale",
  ).length;
  const underRepair = vehicles.filter(
    (v) => v.status === "under_repair",
  ).length;

  const inputClass =
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100";

  const labelClass = "block text-sm font-medium text-stone-700";

  function updateField<K extends keyof VehicleForm>(
    field: K,
    value: VehicleForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      vehicle_code: `DBA-${Date.now().toString().slice(-6)}`,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(vehicle: Vehicle) {
    const { id, ...details } = vehicle;
    setEditingId(id);
    setForm(details);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function saveVehicle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setError("");
    setSuccess("");

    const code = form.vehicle_code.trim();
    const manufacturer = form.manufacturer.trim();
    const model = form.model.trim();

    if (!code || !manufacturer || !model) {
      setError("Vehicle code, manufacturer, and model are required.");
      return;
    }

    const priceFields = [
      ["Purchase price", form.purchase_price],
      ["Asking price", form.asking_price],
    ] as const;

    for (const [label, value] of priceFields) {
      if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        setError(`${label} must be a valid non-negative number.`);
        return;
      }
    }

    if (
      form.manufacturing_year &&
      (!Number.isInteger(Number(form.manufacturing_year)) || Number(form.manufacturing_year) < 1900 || Number(form.manufacturing_year) > 2100)
    ) {
      setError("Manufacturing year must be a valid year between 1900 and 2100.");
      return;
    }

    if (form.odometer_km && (!Number.isInteger(Number(form.odometer_km)) || Number(form.odometer_km) < 0)) {
      setError("Kilometres driven must be a non-negative whole number.");
      return;
    }

    if (
      vehicles.some(
        (v) => v.vehicle_code.toLowerCase() === code.toLowerCase() && v.id !== editingId,
      )
    ) {
      setError("That vehicle code already exists.");
      return;
    }

    const registration = form.registration_number.trim().toLowerCase();
    if (
      registration &&
      vehicles.some(
        (v) => v.registration_number.trim().toLowerCase() === registration && v.id !== editingId,
      )
    ) {
      setError("That registration number is already in the inventory.");
      return;
    }

    const payload = {
      vehicle_code: code,
      registration_number: form.registration_number.trim().toUpperCase() || null,
      chassis_number: form.chassis_number.trim() || null,
      engine_number: form.engine_number.trim() || null,
      manufacturer,
      model,
      manufacturing_year: form.manufacturing_year ? Number(form.manufacturing_year) : null,
      fuel_type: form.fuel_type || null,
      odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
      colour: form.colour.trim() || null,
      purchase_price: form.purchase_price === "" ? null : Number(form.purchase_price),
      asking_price: form.asking_price === "" ? null : Number(form.asking_price),
      status: form.status,
      condition_notes: form.condition_notes.trim() || null,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single();

        if (updateError) throw updateError;
        if (!data) throw new Error("Supabase did not return the updated vehicle.");

        const updatedVehicle: Vehicle = {
          id: data.id,
          vehicle_code: data.vehicle_code ?? "",
          registration_number: data.registration_number ?? "",
          chassis_number: data.chassis_number ?? "",
          engine_number: data.engine_number ?? "",
          manufacturer: data.manufacturer ?? "",
          model: data.model ?? "",
          manufacturing_year: data.manufacturing_year == null ? "" : String(data.manufacturing_year),
          fuel_type: data.fuel_type ?? "Petrol",
          odometer_km: data.odometer_km == null ? "" : String(data.odometer_km),
          colour: data.colour ?? "",
          purchase_price: data.purchase_price == null ? "" : String(data.purchase_price),
          asking_price: data.asking_price == null ? "" : String(data.asking_price),
          status: data.status as VehicleStatus,
          condition_notes: data.condition_notes ?? "",
        };
        setVehicles((current) => current.map((v) => v.id === editingId ? updatedVehicle : v));
        setSuccess("Vehicle updated successfully in Supabase.");
      } else {
        const { data, error: insertError } = await supabase
          .from("vehicles")
          .insert(payload)
          .select("*")
          .single();

        if (insertError) throw insertError;
        if (!data) throw new Error("Supabase did not return the new vehicle.");

        const newVehicle: Vehicle = {
          id: data.id,
          vehicle_code: data.vehicle_code ?? "",
          registration_number: data.registration_number ?? "",
          chassis_number: data.chassis_number ?? "",
          engine_number: data.engine_number ?? "",
          manufacturer: data.manufacturer ?? "",
          model: data.model ?? "",
          manufacturing_year: data.manufacturing_year == null ? "" : String(data.manufacturing_year),
          fuel_type: data.fuel_type ?? "Petrol",
          odometer_km: data.odometer_km == null ? "" : String(data.odometer_km),
          colour: data.colour ?? "",
          purchase_price: data.purchase_price == null ? "" : String(data.purchase_price),
          asking_price: data.asking_price == null ? "" : String(data.asking_price),
          status: data.status as VehicleStatus,
          condition_notes: data.condition_notes ?? "",
        };
        setVehicles((current) => [newVehicle, ...current]);
        setSuccess("Vehicle added successfully to Supabase.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unknown error";
      setError(`Could not save vehicle to Supabase: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `Delete ${vehicle.manufacturer} ${vehicle.model} (${vehicle.vehicle_code})? This will delete it from the database.`,
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    const { error: deleteError } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicle.id);

    if (deleteError) {
      setError(`Could not delete vehicle: ${deleteError.message}`);
      return;
    }

    setVehicles((current) => current.filter((v) => v.id !== vehicle.id));
    setSuccess("Vehicle deleted from Supabase.");
  }

  return (
    <main className="space-y-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
            Deals by Anas / Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            Vehicle Inventory
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Manage your used bikes, scooters, prices, and stock status.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800"
        >
          + Add Vehicle
        </button>
      </header>

      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <strong>Supabase connected:</strong> Inventory changes are saved to your database. Your previous browser-only test data has been left untouched.
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
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
          { title: "Vehicles in stock", value: inStock },
          { title: "Ready for sale", value: readyForSale },
          { title: "Under repair", value: underRepair },
        ].map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-stone-500">{card.title}</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {isLoading && (
          <p role="status" className="mb-4 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Loading vehicles from Supabase...
          </p>
        )}
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            aria-label="Search inventory"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vehicle code, registration, make, or model..."
            className={`${inputClass} mt-0 flex-1`}
          />

          <select
            aria-label="Filter by stock status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} mt-0 md:max-w-64`}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-3 py-3">Vehicle</th>
                <th className="px-3 py-3">Registration</th>
                <th className="px-3 py-3">Year / KM</th>
                <th className="px-3 py-3">Purchase price</th>
                <th className="px-3 py-3">Asking price</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!isLoading && filteredVehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-b border-stone-100 last:border-0"
                >
                  <td className="px-3 py-4">
                    <p className="font-semibold text-stone-900">
                      {vehicle.manufacturer} {vehicle.model}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {vehicle.vehicle_code}
                    </p>
                  </td>

                  <td className="px-3 py-4">
                    {vehicle.registration_number || "—"}
                  </td>

                  <td className="px-3 py-4">
                    {vehicle.manufacturing_year || "—"}
                    <p className="mt-1 text-xs text-stone-500">
                      {vehicle.odometer_km
                        ? `${Number(vehicle.odometer_km).toLocaleString("en-IN")} km`
                        : "—"}
                    </p>
                  </td>

                  <td className="px-3 py-4">
                    {formatMoney(vehicle.purchase_price)}
                  </td>

                  <td className="px-3 py-4 font-semibold">
                    {formatMoney(vehicle.asking_price)}
                  </td>

                  <td className="px-3 py-4">
                    <span className="inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                      {
                        statusOptions.find(
                          (option) => option.value === vehicle.status,
                        )?.label
                      }
                    </span>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(vehicle)}
                        className="font-medium text-orange-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVehicle(vehicle)}
                        className="font-medium text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="font-semibold text-stone-800">
                      No vehicles found
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      Add a vehicle or change your search filters.
                    </p>
                    <button
                      type="button"
                      onClick={openAddForm}
                      className="mt-4 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800"
                    >
                      Add your first vehicle
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Showing {filteredVehicles.length} of {vehicles.length} vehicles
        </p>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 md:pt-14">
          <section className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {editingId ? "Edit vehicle" : "Add vehicle"}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Enter the vehicle information below.
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

            <form onSubmit={saveVehicle} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={labelClass}>
                  Vehicle code *
                  <input
                    required
                    value={form.vehicle_code}
                    onChange={(e) => updateField("vehicle_code", e.target.value)}
                    className={inputClass}
                    placeholder="DBA-000001"
                  />
                </label>

                <label className={labelClass}>
                  Manufacturer *
                  <input
                    required
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                    className={inputClass}
                    placeholder="Hero, Honda, TVS..."
                  />
                </label>

                <label className={labelClass}>
                  Model *
                  <input
                    required
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    className={inputClass}
                    placeholder="Splendor Plus"
                  />
                </label>

                <label className={labelClass}>
                  Registration number
                  <input
                    value={form.registration_number}
                    onChange={(e) =>
                      updateField("registration_number", e.target.value.toUpperCase())
                    }
                    className={inputClass}
                    placeholder="MH31AB1234"
                  />
                </label>

                <label className={labelClass}>
                  Chassis number
                  <input
                    value={form.chassis_number}
                    onChange={(e) => updateField("chassis_number", e.target.value.toUpperCase())}
                    className={inputClass}
                    placeholder="Enter the full chassis number"
                  />
                </label>

                <label className={labelClass}>
                  Engine number
                  <input
                    value={form.engine_number}
                    onChange={(e) => updateField("engine_number", e.target.value.toUpperCase())}
                    className={inputClass}
                    placeholder="Enter the full engine number"
                  />
                </label>

                <label className={labelClass}>
                  Manufacturing year
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.manufacturing_year}
                    onChange={(e) => updateField("manufacturing_year", e.target.value)}
                    className={inputClass}
                    placeholder="2022"
                  />
                </label>

                <label className={labelClass}>
                  Fuel type
                  <select
                    value={form.fuel_type}
                    onChange={(e) => updateField("fuel_type", e.target.value)}
                    className={inputClass}
                  >
                    <option>Petrol</option>
                    <option>Electric</option>
                    <option>Diesel</option>
                    <option>CNG</option>
                    <option>Other</option>
                  </select>
                </label>

                <label className={labelClass}>
                  Kilometres driven
                  <input
                    type="number"
                    min="0"
                    value={form.odometer_km}
                    onChange={(e) => updateField("odometer_km", e.target.value)}
                    className={inputClass}
                    placeholder="25000"
                  />
                </label>

                <label className={labelClass}>
                  Colour
                  <input
                    value={form.colour}
                    onChange={(e) => updateField("colour", e.target.value)}
                    className={inputClass}
                    placeholder="Black"
                  />
                </label>

                <label className={labelClass}>
                  Purchase price (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_price}
                    onChange={(e) => updateField("purchase_price", e.target.value)}
                    className={inputClass}
                    placeholder="35000"
                  />
                </label>

                <label className={labelClass}>
                  Asking price (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.asking_price}
                    onChange={(e) => updateField("asking_price", e.target.value)}
                    className={inputClass}
                    placeholder="45000"
                  />
                </label>

                <label className={labelClass}>
                  Stock status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as VehicleStatus)
                    }
                    className={inputClass}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={labelClass}>
                Condition and notes
                <textarea
                  rows={3}
                  value={form.condition_notes}
                  onChange={(e) => updateField("condition_notes", e.target.value)}
                  className={inputClass}
                  placeholder="Condition, repairs required, accessories, etc."
                />
              </label>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-700">
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
                  disabled={isSaving}
                  className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Save changes" : "Save vehicle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

