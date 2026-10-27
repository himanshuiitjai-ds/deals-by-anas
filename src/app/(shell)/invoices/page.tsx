"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  vehicle_id: string;
  customer_id: string | null;
  sale_date: string;
  sale_price: number;
  amount_received: number;
  payment_status: string;
  payment_method: string;
};

type Vehicle = {
  id: string;
  vehicle_code: string | null;
  registration_number: string | null;
  manufacturer: string;
  model: string;
  manufacturing_year: number | null;
  chassis_number: string | null;
  engine_number: string | null;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  sale_id: string;
  invoice_date: string;
  notes: string | null;
  discount_amount: number;
  additional_charges: number;
  customer_identity_reference: string | null;
  vehicle_financed: boolean;
  financier_name: string | null;
  payment_mode: string | null;
  payment_remarks: string | null;
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
};

const emptyForm = {
  sale_id: "",
  invoice_date: "",
  discount_amount: "0",
  additional_charges: "0",
  customer_identity_reference: "",
  vehicle_financed: false,
  financier_name: "",
  payment_mode: "Cash",
  payment_remarks: "",
  notes: "",
};

export default function InvoicesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [salesResult, vehiclesResult, customersResult, invoicesResult] =
      await Promise.all([
        supabase
          .from("vehicle_sales")
          .select(
            "id, vehicle_id, customer_id, sale_date, sale_price, amount_received, payment_status, payment_method",
          )
          .order("sale_date", { ascending: false }),
        supabase
          .from("vehicles")
          .select(
            "id, vehicle_code, registration_number, manufacturer, model, manufacturing_year, chassis_number, engine_number",
          ),
        supabase
          .from("customers")
          .select("id, full_name, phone, address"),
        supabase
          .from("vehicle_invoices")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

    const firstError =
      salesResult.error ||
      vehiclesResult.error ||
      customersResult.error ||
      invoicesResult.error;

    if (firstError) {
      setError(`Could not load invoice data: ${firstError.message}`);
      setLoading(false);
      return;
    }

    setSales((salesResult.data ?? []) as Sale[]);
    setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
    setCustomers((customersResult.data ?? []) as Customer[]);
    setInvoices((invoicesResult.data ?? []) as Invoice[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      invoice_date: current.invoice_date || today(),
    }));
    void loadData();
  }, [loadData]);

  const vehicleFor = (id: string) => vehicles.find((v) => v.id === id);
  const customerFor = (id: string | null) =>
    customers.find((c) => c.id === id);

  const invoiceForSale = (saleId: string) =>
    invoices.find((invoice) => invoice.sale_id === saleId);

  const selectedSale = sales.find((sale) => sale.id === form.sale_id);
  const selectedVehicle = selectedSale
    ? vehicleFor(selectedSale.vehicle_id)
    : undefined;
  const selectedCustomer = selectedSale
    ? customerFor(selectedSale.customer_id)
    : undefined;

  const discount = Math.max(0, Number(form.discount_amount) || 0);
  const additionalCharges = Math.max(
    0,
    Number(form.additional_charges) || 0,
  );
  const salePrice = Number(selectedSale?.sale_price ?? 0);
  const totalAmount = Math.max(0, salePrice - discount + additionalCharges);
  const amountReceived = Number(selectedSale?.amount_received ?? 0);
  const outstanding = Math.max(0, totalAmount - amountReceived);

  const resetForm = () => {
    setForm({ ...emptyForm, invoice_date: today() });
    setEditingId(null);
    setError("");
  };

  const editInvoice = (invoice: Invoice) => {
    const sale = sales.find((item) => item.id === invoice.sale_id);

    setForm({
      sale_id: invoice.sale_id,
      invoice_date: invoice.invoice_date,
      discount_amount: String(invoice.discount_amount ?? 0),
      additional_charges: String(invoice.additional_charges ?? 0),
      customer_identity_reference:
        invoice.customer_identity_reference ?? "",
      vehicle_financed: invoice.vehicle_financed ?? false,
      financier_name: invoice.financier_name ?? "",
      payment_mode: invoice.payment_mode ?? sale?.payment_method ?? "Cash",
      payment_remarks: invoice.payment_remarks ?? "",
      notes: invoice.notes ?? "",
    });

    setEditingId(invoice.id);
    setSelectedInvoice(null);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.sale_id) {
      setError("Select a vehicle sale first.");
      return;
    }

    if (discount > salePrice) {
      setError("Discount cannot exceed the vehicle's agreed selling price.");
      return;
    }

    if (
      !Number.isFinite(discount) ||
      !Number.isFinite(additionalCharges) ||
      discount < 0 ||
      additionalCharges < 0
    ) {
      setError("Discount and additional charges must be valid non-negative amounts.");
      return;
    }

    if (form.vehicle_financed && !form.financier_name.trim()) {
      setError("Enter the financier's name when the vehicle is financed.");
      return;
    }

    if (
      !editingId &&
      invoiceForSale(form.sale_id)
    ) {
      setError("An invoice already exists for this sale. Edit the existing invoice instead.");
      return;
    }

    setSaving(true);

    const invoiceNumber = editingId
      ? invoices.find((invoice) => invoice.id === editingId)?.invoice_number
      : `DBA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const payload = {
      invoice_number: invoiceNumber,
      sale_id: form.sale_id,
      invoice_date: form.invoice_date,
      discount_amount: discount,
      additional_charges: additionalCharges,
      customer_identity_reference:
        form.customer_identity_reference.trim() || null,
      vehicle_financed: form.vehicle_financed,
      financier_name: form.vehicle_financed
        ? form.financier_name.trim()
        : null,
      payment_mode: form.payment_mode,
      payment_remarks: form.payment_remarks.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("vehicle_invoices")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single()
      : await supabase
          .from("vehicle_invoices")
          .insert(payload)
          .select()
          .single();

    if (result.error) {
      setError(`Could not save invoice: ${result.error.message}`);
      setSaving(false);
      return;
    }

    const savedInvoice = result.data as Invoice;
    setSelectedInvoice(savedInvoice);
    setMessage(
      editingId
        ? `Invoice ${savedInvoice.invoice_number} updated successfully.`
        : `Invoice ${savedInvoice.invoice_number} created successfully.`,
    );
    resetForm();
    await loadData();
    setSelectedInvoice(savedInvoice);
    setSaving(false);
  };

  const deleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}? The sale itself will not be deleted.`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("vehicle_invoices")
      .delete()
      .eq("id", invoice.id);

    if (deleteError) {
      setError(`Could not delete invoice: ${deleteError.message}`);
      return;
    }

    if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
    if (editingId === invoice.id) resetForm();
    setMessage("Invoice deleted.");
    await loadData();
  };

  const printInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    window.setTimeout(() => window.print(), 200);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const sale = sales.find((item) => item.id === invoice.sale_id);
    const vehicle = sale ? vehicleFor(sale.vehicle_id) : undefined;
    const customer = sale ? customerFor(sale.customer_id) : undefined;

    return [
      invoice.invoice_number,
      vehicle?.manufacturer,
      vehicle?.model,
      vehicle?.registration_number,
      customer?.full_name,
      customer?.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const printSale = selectedInvoice
    ? sales.find((sale) => sale.id === selectedInvoice.sale_id)
    : undefined;
  const printVehicle = printSale ? vehicleFor(printSale.vehicle_id) : undefined;
  const printCustomer = printSale ? customerFor(printSale.customer_id) : undefined;

  const printDiscount = Number(selectedInvoice?.discount_amount ?? 0);
  const printCharges = Number(selectedInvoice?.additional_charges ?? 0);
  const printTotal = Math.max(
    0,
    Number(printSale?.sale_price ?? 0) - printDiscount + printCharges,
  );
  const printReceived = Number(printSale?.amount_received ?? 0);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          .invoice-print,
          .invoice-print * {
            visibility: visible !important;
          }

          .invoice-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 190mm !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }

          .no-print {
            display: none !important;
          }

          .invoice-print * {
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <header className="no-print">
        <h1 className="text-2xl font-bold text-gray-900">
          Invoices & Receipts
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and print invoices using the approved Deals by Anas template.
        </p>
      </header>

      {error && (
        <div className="no-print rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="no-print rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <section className="no-print grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="mt-2 text-3xl font-bold">{invoices.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Value Invoiced</p>
          <p className="mt-2 text-xl font-bold">
            {money(
              invoices.reduce((sum, invoice) => {
                const sale = sales.find((item) => item.id === invoice.sale_id);
                return (
                  sum +
                  Math.max(
                    0,
                    Number(sale?.sale_price ?? 0) -
                      Number(invoice.discount_amount ?? 0) +
                      Number(invoice.additional_charges ?? 0),
                  )
                );
              }, 0),
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Sales Without Invoices</p>
          <p className="mt-2 text-3xl font-bold">
            {sales.filter((sale) => !invoiceForSale(sale.id)).length}
          </p>
        </div>
      </section>

      <section className="no-print rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? "Edit Invoice" : "Create Invoice"}
        </h2>

        <form onSubmit={saveInvoice} className="space-y-4">
          <div>
            <label className={labelClass}>Vehicle Sale *</label>
            <select
              className={inputClass}
              value={form.sale_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sale_id: event.target.value,
                }))
              }
              required
              disabled={Boolean(editingId)}
            >
              <option value="">Select a sale</option>
              {sales
                .filter(
                  (sale) =>
                    editingId
                      ? sale.id === form.sale_id
                      : !invoiceForSale(sale.id),
                )
                .map((sale) => {
                  const vehicle = vehicleFor(sale.vehicle_id);
                  const customer = customerFor(sale.customer_id);
                  return (
                    <option key={sale.id} value={sale.id}>
                      {vehicle
                        ? `${vehicle.manufacturer} ${vehicle.model}`
                        : "Vehicle"}{" "}
                      — {customer?.full_name ?? "Customer not recorded"} —{" "}
                      {money(Number(sale.sale_price))}
                    </option>
                  );
                })}
            </select>
          </div>

          {selectedSale && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm">
              <p>
                <strong>Customer:</strong>{" "}
                {selectedCustomer?.full_name ?? "Not recorded"}
              </p>
              <p>
                <strong>Vehicle:</strong>{" "}
                {selectedVehicle
                  ? `${selectedVehicle.manufacturer} ${selectedVehicle.model}`
                  : "Not available"}
              </p>
              <p>
                <strong>Agreed selling price:</strong> {money(salePrice)}
              </p>
              <p>
                <strong>Amount received (from Sales):</strong>{" "}
                {money(amountReceived)}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Invoice Date *</label>
              <input
                className={inputClass}
                type="date"
                value={form.invoice_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    invoice_date: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className={labelClass}>Payment Mode</label>
              <select
                className={inputClass}
                value={form.payment_mode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    payment_mode: event.target.value,
                  }))
                }
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank / Cheque</option>
                <option>Vehicle Finance</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Discount / Adjustment (₹)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={form.discount_amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discount_amount: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                Additional Charges (₹)
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={form.additional_charges}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    additional_charges: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                Customer Aadhaar / PAN Reference (optional)
              </label>
              <input
                className={inputClass}
                placeholder="Prefer masked reference only"
                value={form.customer_identity_reference}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer_identity_reference: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Financed?</label>
              <select
                className={inputClass}
                value={form.vehicle_financed ? "Yes" : "No"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    vehicle_financed: event.target.value === "Yes",
                    financier_name:
                      event.target.value === "Yes"
                        ? current.financier_name
                        : "",
                  }))
                }
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            {form.vehicle_financed && (
              <div>
                <label className={labelClass}>Financier Name *</label>
                <input
                  className={inputClass}
                  value={form.financier_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      financier_name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Payment Notes / Remarks</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.payment_remarks}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payment_remarks: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className={labelClass}>Additional Invoice Notes</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-sm">
            <p>
              Selling Price: <strong>{money(salePrice)}</strong>
            </p>
            <p>
              Discount: <strong>{money(discount)}</strong>
            </p>
            <p>
              Additional Charges: <strong>{money(additionalCharges)}</strong>
            </p>
            <p>
              Total Invoice Amount:{" "}
              <strong>{money(totalAmount)}</strong>
            </p>
            <p>
              Amount Received: <strong>{money(amountReceived)}</strong>
            </p>
            <p>
              Outstanding Balance:{" "}
              <strong>{money(outstanding)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Invoice"
                  : "Create Invoice"}
            </button>
            {editingId && (
              <button
                className="rounded-lg border px-5 py-2.5 text-sm"
                type="button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="no-print rounded-xl border bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Invoice History</h2>
          <input
            className={`${inputClass} sm:max-w-sm`}
            placeholder="Search invoice, customer, vehicle..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Loading invoices...
          </p>
        ) : filteredInvoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No invoices found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="px-3 py-3">Invoice Number</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Vehicle</th>
                  <th className="px-3 py-3">Invoice Total</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const sale = sales.find((s) => s.id === invoice.sale_id);
                  const vehicle = sale
                    ? vehicleFor(sale.vehicle_id)
                    : undefined;
                  const customer = sale
                    ? customerFor(sale.customer_id)
                    : undefined;
                  const total = Math.max(
                    0,
                    Number(sale?.sale_price ?? 0) -
                      Number(invoice.discount_amount ?? 0) +
                      Number(invoice.additional_charges ?? 0),
                  );

                  return (
                    <tr key={invoice.id} className="border-b">
                      <td className="px-3 py-4 font-medium">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-3 py-4">{invoice.invoice_date}</td>
                      <td className="px-3 py-4">
                        {customer?.full_name ?? "—"}
                      </td>
                      <td className="px-3 py-4">
                        {vehicle
                          ? `${vehicle.manufacturer} ${vehicle.model}`
                          : "—"}
                      </td>
                      <td className="px-3 py-4">{money(total)}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="font-medium text-blue-600 hover:underline"
                            onClick={() => printInvoice(invoice)}
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            className="font-medium text-gray-700 hover:underline"
                            onClick={() => editInvoice(invoice)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="font-medium text-red-600 hover:underline"
                            onClick={() => void deleteInvoice(invoice)}
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

      {selectedInvoice && printSale && (
        <section className="invoice-print mx-auto max-w-4xl border border-gray-400 bg-white p-6 text-black">
          <header className="flex items-center justify-between gap-4 border-b-2 border-black pb-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-wide">
                DEALS BY ANAS
              </h2>
              <p className="mt-1 text-[10px] font-semibold">
                SECOND HAND TWO WHEELERS — OFFICIAL VEHICLE SALES INVOICE
              </p>
              <p className="mt-2 text-[10px]">
                Address: Beside Salim Radium Arts, Behind Nagar Parishad,
                Itwari, Umred-441203
              </p>
              <p className="text-[10px]">
                Phone: +91 7387598017 | Email: dealsbyanas@gmail.com
              </p>
            </div>
            <div className="shrink-0 text-right">
              <h3 className="text-2xl font-bold">INVOICE</h3>
              <p className="mt-2 text-[10px]">
                Invoice No: {selectedInvoice.invoice_number}
              </p>
              <p className="text-[10px]">
                Date: {selectedInvoice.invoice_date}
              </p>
            </div>
          </header>

          <div className="my-4 grid grid-cols-2 gap-3 text-[10px]">
            <div className="border border-gray-500">
              <h4 className="border-b border-gray-500 bg-gray-100 px-2 py-2 font-bold">
                CUSTOMER DETAILS (BILL TO)
              </h4>
              <div className="space-y-2 p-2">
                <p>Customer Name: {printCustomer?.full_name ?? "—"}</p>
                <p>Address: {printCustomer?.address ?? "—"}</p>
                <p>Phone Number: {printCustomer?.phone ?? "—"}</p>
                <p>Date of Invoice: {selectedInvoice.invoice_date}</p>
                <p>
                  Aadhaar / PAN Ref:{" "}
                  {selectedInvoice.customer_identity_reference || "—"}
                </p>
              </div>
            </div>
            <div className="border border-gray-500">
              <h4 className="border-b border-gray-500 bg-gray-100 px-2 py-2 font-bold">
                VEHICLE SPECIFICATIONS
              </h4>
              <div className="space-y-2 p-2">
                <p>
                  Manufacturer & Model:{" "}
                  {printVehicle
                    ? `${printVehicle.manufacturer} ${printVehicle.model}`
                    : "—"}
                </p>
                <p>
                  Registration Number:{" "}
                  {printVehicle?.registration_number || "—"}
                </p>
                <p>
                  Manufacturing Year: {printVehicle?.manufacturing_year ?? "—"}
                </p>
                <p>Chassis Number: {printVehicle?.chassis_number || "—"}</p>
                <p>Engine Number: {printVehicle?.engine_number || "—"}</p>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-left">SR.</th>
                <th className="border border-black px-2 py-2 text-left">
                  PARTICULARS / DESCRIPTION
                </th>
                <th className="border border-black px-2 py-2 text-right">
                  AMOUNT (INR)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1", "Vehicle Agreed Selling Price", Number(printSale.sale_price)],
                ["2", "Discount / Adjustment (if any)", printDiscount],
                [
                  "3",
                  "Additional Charges (RTO Ownership Transfer / Documentation)",
                  printCharges,
                ],
              ].map(([number, description, amount]) => (
                <tr key={String(number)}>
                  <td className="border border-black px-2 py-2">{number}</td>
                  <td className="border border-black px-2 py-2">
                    {description}
                  </td>
                  <td className="border border-black px-2 py-2 text-right">
                    {money(Number(amount))}
                  </td>
                </tr>
              ))}
              {[
                ["Total Invoice Amount:", printTotal],
                ["Advance / Amount Received:", printReceived],
                ["Outstanding Balance Due:", Math.max(0, printTotal - printReceived)],
              ].map(([label, amount]) => (
                <tr key={String(label)}>
                  <td
                    colSpan={2}
                    className="border border-black bg-gray-50 px-2 py-2 text-right font-bold"
                  >
                    {label}
                  </td>
                  <td className="border border-black px-2 py-2 text-right font-bold">
                    {money(Number(amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-3 flex flex-wrap justify-between gap-2 border border-black p-2 text-[10px]">
            <p>
              Payment Mode:{" "}
              {["Cash", "UPI", "Bank / Cheque"].map((mode) => (
                <span key={mode} className="mr-2">
                  {selectedInvoice.payment_mode === mode ? "☑" : "☐"} {mode}
                </span>
              ))}
            </p>
            <p>
              Vehicle Financed: {selectedInvoice.vehicle_financed ? "☑ Yes" : "☐ Yes"}{" "}
              {selectedInvoice.vehicle_financed ? "☐ No" : "☑ No"}
            </p>
            <p>Financier: {selectedInvoice.financier_name || "—"}</p>
          </div>

          <div className="border border-black p-2 text-[9px]">
            <p className="mb-2">
              <strong>Payment Notes / Remarks:</strong>{" "}
              {selectedInvoice.payment_remarks || "—"}
            </p>
            <h4 className="mb-1 font-bold underline">
              TERMS & CONDITIONS OF SALE
            </h4>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                The vehicle is sold on an &quot;as-is, where-is&quot; basis
                after thorough physical inspection and test ride satisfaction
                by the customer.
              </li>
              <li>
                From the exact date and time of vehicle delivery, the buyer
                assumes full legal responsibility for RTO ownership transfer,
                insurance validity, road taxes, challans, and any traffic/legal
                liabilities.
              </li>
              <li>
                Original RC transfer documentation and Dealership NOC will be
                released upon 100% full financial settlement and clearance of
                all agreed dues or finance disbursement.
              </li>
            </ol>
            {selectedInvoice.notes && (
              <p className="mt-2">
                <strong>Additional Notes:</strong> {selectedInvoice.notes}
              </p>
            )}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div className="border-t border-black pt-2">
              <strong>Customer Signature</strong>
              <p>(Buyer Acceptance & Delivery Confirmation)</p>
            </div>
            <div className="border-t border-black pt-2">
              <strong>Authorized Signatory</strong>
              <p>For Deals by Anas</p>
            </div>
          </div>

          <footer className="mt-10 flex justify-between border-t border-gray-400 pt-2 text-[9px]">
            <span>
              Thank you for your business! Please retain this official invoice
              for your vehicle records.
            </span>
            <span>Official Vehicle Sales Invoice</span>
          </footer>

          <div className="no-print mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Close Preview
            </button>
          </div>
        </section>
      )}
    </main>
  );
}