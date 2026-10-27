"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Settings = {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  date_format: string;
  invoice_prefix: string;
  invoice_footer: string;
  invoice_terms: string;
  updated_at?: string;
};

const defaults: Settings = {
  id: 1,
  business_name: "Deals by Anas",
  address: "Beside Salim Radium Arts, Behind Nagar Parishad, Itwari, Umred-441203",
  phone: "+91 7387598017",
  email: "dealsbyanas@gmail.com",
  currency: "INR",
  date_format: "DD/MM/YYYY",
  invoice_prefix: "DBA",
  invoice_footer: "Thank you for your business! Please retain this invoice for your records.",
  invoice_terms:
    "1. Vehicle sold as-is, where-is after inspection/test ride satisfaction.\n2. From the date and time of delivery, the buyer assumes responsibility for RTO transfer, insurance, taxes, challans and liabilities.\n3. Original RC transfer documentation and dealership NOC are released after full settlement of dues or finance disbursement.",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "block text-sm font-medium text-slate-700";

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    const [settingsResult, userResult] = await Promise.all([
      supabase.from("business_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.auth.getUser(),
    ]);

    if (settingsResult.error) {
      setError(settingsResult.error.message);
    } else if (settingsResult.data) {
      setForm({ ...defaults, ...settingsResult.data } as Settings);
    }
    if (userResult.data.user?.email) setAccountEmail(userResult.data.user.email);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      id: 1,
      business_name: form.business_name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      invoice_prefix: form.invoice_prefix.trim() || "DBA",
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("business_settings")
      .upsert(payload, { onConflict: "id" });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setForm(payload);
    setMessage("Settings saved successfully.");
    setSaving(false);
  }

  async function signOut() {
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-full bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Deals by Anas</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage your dealership details and default invoice information.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <form onSubmit={saveSettings} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold">Dealership profile</h2>
              <p className="mt-1 text-sm text-slate-500">These are your business contact details. Saving them here does not automatically change other pages until those pages are connected to this settings table.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="business-name">Business name *</label>
                <input id="business-name" required className={inputClass} value={form.business_name} onChange={(e) => updateField("business_name", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="business-phone">Phone number</label>
                <input id="business-phone" type="tel" className={inputClass} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="business-email">Business email</label>
                <input id="business-email" type="email" className={inputClass} value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="business-currency">Currency</label>
                <select id="business-currency" className={inputClass} value={form.currency} onChange={(e) => updateField("currency", e.target.value)}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="business-address">Business address</label>
                <textarea id="business-address" rows={3} className={inputClass} value={form.address} onChange={(e) => updateField("address", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold">Invoice preferences</h2>
              <p className="mt-1 text-sm text-slate-500">Set defaults for future invoice integration.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="invoice-prefix">Invoice number prefix</label>
                <input id="invoice-prefix" maxLength={12} className={inputClass} value={form.invoice_prefix} onChange={(e) => updateField("invoice_prefix", e.target.value)} />
                <p className="mt-1 text-xs text-slate-500">Example: DBA-2026-0001. Existing invoice numbers will not be changed.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="date-format">Date format</label>
                <select id="date-format" className={inputClass} value={form.date_format} onChange={(e) => updateField("date_format", e.target.value)}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="DD MMM YYYY">DD MMM YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="invoice-footer">Invoice footer message</label>
                <textarea id="invoice-footer" rows={2} className={inputClass} value={form.invoice_footer} onChange={(e) => updateField("invoice_footer", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="invoice-terms">Invoice terms and conditions</label>
                <textarea id="invoice-terms" rows={6} className={inputClass} value={form.invoice_terms} onChange={(e) => updateField("invoice_terms", e.target.value)} />
                <p className="mt-1 text-xs text-slate-500">Review legal wording for your business before using it on customer invoices.</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => void loadSettings()} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50">
              Reload saved settings
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Account</h2>
          <p className="mt-1 text-sm text-slate-500">Signed-in account for this session.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-1 font-medium">{accountEmail || "Unable to read account email"}</p>
            </div>
            <button type="button" onClick={() => void signOut()} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              Sign out
            </button>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          Settings are saved in Supabase. The invoice preferences are stored here, but your existing invoice page must be connected to these values separately before they affect printed invoices.
        </p>
      </div>
    </main>
  );
}
