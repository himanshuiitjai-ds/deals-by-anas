"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type LeadStatus = "New" | "Contacted" | "Interested" | "Negotiating" | "Converted" | "Lost";
type Priority = "Low" | "Medium" | "High";
type FollowUpType = "Call" | "WhatsApp" | "Visit" | "Meeting" | "Other";

type Vehicle = {
  id: string;
  vehicle_code: string | null;
  registration_number: string | null;
  manufacturer: string | null;
  model: string | null;
};

type Lead = {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  interested_in: string | null;
  vehicle_id: string | null;
  lead_source: string;
  status: LeadStatus;
  priority: Priority;
  next_follow_up: string | null;
  notes: string | null;
  customer_id: string | null;
  created_at: string;
};

type FollowUp = {
  id: string;
  lead_id: string;
  follow_up_date: string;
  follow_up_time: string | null;
  follow_up_type: FollowUpType;
  outcome: string | null;
  next_follow_up: string | null;
  notes: string | null;
  created_at: string;
};

type LeadForm = {
  full_name: string;
  phone: string;
  alternate_phone: string;
  address: string;
  interested_in: string;
  vehicle_id: string;
  lead_source: string;
  status: LeadStatus;
  priority: Priority;
  next_follow_up: string;
  notes: string;
};

type FollowUpForm = {
  follow_up_date: string;
  follow_up_time: string;
  follow_up_type: FollowUpType;
  outcome: string;
  next_follow_up: string;
  notes: string;
};

const leadSources = ["Walk-in", "Phone Call", "WhatsApp", "Instagram", "Facebook", "Referral", "Online Listing", "Other"];
const statuses: LeadStatus[] = ["New", "Contacted", "Interested", "Negotiating", "Converted", "Lost"];
const priorities: Priority[] = ["Low", "Medium", "High"];
const followUpTypes: FollowUpType[] = ["Call", "WhatsApp", "Visit", "Meeting", "Other"];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyLeadForm = (): LeadForm => ({
  full_name: "",
  phone: "",
  alternate_phone: "",
  address: "",
  interested_in: "",
  vehicle_id: "",
  lead_source: "Walk-in",
  status: "New",
  priority: "Medium",
  next_follow_up: "",
  notes: "",
});

const emptyFollowUpForm = (): FollowUpForm => ({
  follow_up_date: "",
  follow_up_time: "",
  follow_up_type: "Call",
  outcome: "",
  next_follow_up: "",
  notes: "",
});

function dateLabel(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function vehicleLabel(vehicle?: Vehicle | null) {
  if (!vehicle) return "";
  return [vehicle.manufacturer, vehicle.model, vehicle.registration_number || vehicle.vehicle_code]
    .filter(Boolean)
    .join(" · ");
}

function statusClass(status: string) {
  switch (status) {
    case "Converted": return "bg-emerald-100 text-emerald-800";
    case "Lost": return "bg-rose-100 text-rose-800";
    case "Negotiating": return "bg-violet-100 text-violet-800";
    case "Interested": return "bg-sky-100 text-sky-800";
    case "Contacted": return "bg-amber-100 text-amber-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function priorityClass(priority: string) {
  if (priority === "High") return "bg-rose-100 text-rose-800";
  if (priority === "Low") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-800";
}

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayValue, setTodayValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [followUpFilter, setFollowUpFilter] = useState("All");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm());
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [followUpForm, setFollowUpForm] = useState<FollowUpForm>(emptyFollowUpForm());
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [leadResult, vehicleResult, followUpResult] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id, vehicle_code, registration_number, manufacturer, model").order("created_at", { ascending: false }),
      supabase.from("lead_follow_ups").select("*").order("follow_up_date", { ascending: false }),
    ]);

    const firstError = leadResult.error || vehicleResult.error || followUpResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setLeads((leadResult.data || []) as Lead[]);
    setVehicles((vehicleResult.data || []) as Vehicle[]);
    setFollowUps((followUpResult.data || []) as FollowUp[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Read the current date after the component mounts, not during prerendering.
    setTodayValue(todayISO());
    void loadData();
  }, [loadData]);

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const vehicle = lead.vehicle_id ? vehicleById.get(lead.vehicle_id) : null;
      const matchesSearch = !q || [
        lead.full_name, lead.phone, lead.alternate_phone, lead.interested_in,
        lead.lead_source, lead.notes, vehicleLabel(vehicle),
      ].some((value) => (value || "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || lead.priority === priorityFilter;
      const due = lead.next_follow_up;
      const today = todayValue;
      const matchesFollowUp =
        followUpFilter === "All" ||
        (followUpFilter === "Due" && !!due && due <= today && lead.status !== "Converted" && lead.status !== "Lost") ||
        (followUpFilter === "Upcoming" && !!due && due > today && lead.status !== "Converted" && lead.status !== "Lost") ||
        (followUpFilter === "Not scheduled" && !due);
      return matchesSearch && matchesStatus && matchesPriority && matchesFollowUp;
    });
  }, [leads, search, statusFilter, priorityFilter, followUpFilter, vehicleById, todayValue]);

  const today = todayValue;
  const activeLeads = leads.filter((l) => l.status !== "Converted" && l.status !== "Lost");
  const dueCount = activeLeads.filter((l) => l.next_follow_up && l.next_follow_up <= today).length;
  const upcomingCount = activeLeads.filter((l) => l.next_follow_up && l.next_follow_up > today).length;
  const convertedCount = leads.filter((l) => l.status === "Converted").length;
  const highPriorityCount = activeLeads.filter((l) => l.priority === "High").length;

  function openNewLead() {
    setEditingLead(null);
    setLeadForm(emptyLeadForm());
    setError("");
    setNotice("");
    setShowLeadForm(true);
  }

  function openEditLead(lead: Lead) {
    setEditingLead(lead);
    setLeadForm({
      full_name: lead.full_name || "",
      phone: lead.phone || "",
      alternate_phone: lead.alternate_phone || "",
      address: lead.address || "",
      interested_in: lead.interested_in || "",
      vehicle_id: lead.vehicle_id || "",
      lead_source: lead.lead_source || "Walk-in",
      status: lead.status || "New",
      priority: lead.priority || "Medium",
      next_follow_up: lead.next_follow_up || "",
      notes: lead.notes || "",
    });
    setError("");
    setNotice("");
    setShowLeadForm(true);
  }

  async function saveLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadForm.full_name.trim() || !leadForm.phone.trim()) {
      setError("Customer name and phone number are required.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      full_name: leadForm.full_name.trim(),
      phone: leadForm.phone.trim(),
      alternate_phone: leadForm.alternate_phone.trim() || null,
      address: leadForm.address.trim() || null,
      interested_in: leadForm.interested_in.trim() || null,
      vehicle_id: leadForm.vehicle_id || null,
      lead_source: leadForm.lead_source,
      status: leadForm.status,
      priority: leadForm.priority,
      next_follow_up: leadForm.next_follow_up || null,
      notes: leadForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingLead
      ? await supabase.from("leads").update(payload).eq("id", editingLead.id).select().single()
      : await supabase.from("leads").insert(payload).select().single();

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    setNotice(editingLead ? "Lead updated successfully." : "Lead added successfully.");
    setShowLeadForm(false);
    setEditingLead(null);
    setLeadForm(emptyLeadForm());
    setSaving(false);
    await loadData();
  }

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`Delete the lead for ${lead.full_name}? Its follow-up history will also be deleted.`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("leads").delete().eq("id", lead.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setNotice("Lead deleted.");
    await loadData();
  }

  function openFollowUp(lead: Lead) {
    setFollowUpLead(lead);
    setFollowUpForm({
      ...emptyFollowUpForm(),
      follow_up_date: todayISO(),
      next_follow_up: lead.next_follow_up || "",
    });
    setError("");
    setNotice("");
  }

  async function saveFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUpLead) return;
    setSaving(true);
    setError("");
    setNotice("");
    const { error: insertError } = await supabase.from("lead_follow_ups").insert({
      lead_id: followUpLead.id,
      follow_up_date: followUpForm.follow_up_date || todayISO(),
      follow_up_time: followUpForm.follow_up_time || null,
      follow_up_type: followUpForm.follow_up_type,
      outcome: followUpForm.outcome.trim() || null,
      next_follow_up: followUpForm.next_follow_up || null,
      notes: followUpForm.notes.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const updatePayload: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };
    if (followUpForm.next_follow_up) updatePayload.next_follow_up = followUpForm.next_follow_up;
    else updatePayload.next_follow_up = null;
    if (followUpForm.outcome.trim().toLowerCase().includes("converted")) updatePayload.status = "Converted";
    else if (followUpLead.status === "New") updatePayload.status = "Contacted";

    const { error: updateError } = await supabase.from("leads").update(updatePayload).eq("id", followUpLead.id);
    if (updateError) {
      setError(`Follow-up was saved, but the lead could not be updated: ${updateError.message}`);
      setSaving(false);
      await loadData();
      return;
    }

    setFollowUpLead(null);
    setFollowUpForm(emptyFollowUpForm());
    setNotice("Follow-up recorded successfully.");
    setSaving(false);
    await loadData();
  }

  async function convertToCustomer(lead: Lead) {
    if (lead.customer_id) {
      setNotice("This lead is already linked to a customer record.");
      return;
    }
    if (!window.confirm(`Create a customer record for ${lead.full_name} and mark this lead as Converted?`)) return;

    setSaving(true);
    setError("");
    setNotice("");
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        full_name: lead.full_name,
        phone: lead.phone,
        address: lead.address,
        customer_type: "buyer",
        notes: `Created from lead. ${lead.notes || ""}`.trim(),
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      setError(customerError?.message || "Could not create the customer record.");
      setSaving(false);
      return;
    }

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({ customer_id: customer.id, status: "Converted", updated_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (leadUpdateError) {
      setError(`Customer created, but the lead could not be linked: ${leadUpdateError.message}`);
      setSaving(false);
      await loadData();
      return;
    }

    setNotice(`${lead.full_name} was added to Customers and the lead was marked Converted.`);
    setSaving(false);
    await loadData();
  }

  const selectedHistory = historyLead
    ? followUps.filter((f) => f.lead_id === historyLead.id)
    : [];

  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Deals by Anas</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Leads &amp; Follow-ups</h1>
            <p className="mt-2 text-sm text-slate-600">Manage enquiries, keep track of conversations, and never miss a follow-up.</p>
          </div>
          <button onClick={openNewLead} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
            + Add New Lead
          </button>
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total Leads", value: leads.length, detail: "All enquiries" },
            { label: "Active Leads", value: activeLeads.length, detail: "Still in progress" },
            { label: "Follow-ups Due", value: dueCount, detail: "Due today or overdue" },
            { label: "Upcoming Follow-ups", value: upcomingCount, detail: "Scheduled for later" },
            { label: "Converted", value: convertedCount, detail: `${highPriorityCount} high-priority active` },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-1">
              <label className={labelClass} htmlFor="lead-search">Search leads</label>
              <input id="lead-search" className={inputClass} placeholder="Name, phone, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="status-filter">Status</label>
              <select id="status-filter" className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>{statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="priority-filter">Priority</label>
              <select id="priority-filter" className={inputClass} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option>All</option>{priorities.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="followup-filter">Follow-up</label>
              <select id="followup-filter" className={inputClass} value={followUpFilter} onChange={(e) => setFollowUpFilter(e.target.value)}>
                <option value="All">All follow-ups</option>
                <option value="Due">Due / overdue</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Not scheduled">Not scheduled</option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Lead register</h2>
              <p className="text-sm text-slate-500">{visibleLeads.length} of {leads.length} leads</p>
            </div>
            <button onClick={() => void loadData()} className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Refresh</button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading leads from Supabase...</div>
          ) : visibleLeads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">📇</div>
              <h3 className="mt-3 font-semibold">No leads found</h3>
              <p className="mt-1 text-sm text-slate-500">Add your first enquiry or change the filters.</p>
              <button onClick={openNewLead} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Add a lead</button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Lead / Contact</th>
                      <th className="px-5 py-3">Interested in</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Priority</th>
                      <th className="px-5 py-3">Next follow-up</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLeads.map((lead) => {
                      const vehicle = lead.vehicle_id ? vehicleById.get(lead.vehicle_id) : null;
                      const isDue = lead.next_follow_up && lead.next_follow_up <= today && lead.status !== "Converted" && lead.status !== "Lost";
                      return (
                        <tr key={lead.id} className="align-top hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <p className="font-semibold">{lead.full_name}</p>
                            <p className="mt-1 text-slate-600">{lead.phone}</p>
                            {lead.alternate_phone && <p className="text-xs text-slate-500">Alt: {lead.alternate_phone}</p>}
                            <p className="mt-1 text-xs text-slate-500">Source: {lead.lead_source}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p>{vehicleLabel(vehicle) || lead.interested_in || "Not specified"}</p>
                            {vehicle && lead.interested_in && <p className="mt-1 text-xs text-slate-500">{lead.interested_in}</p>}
                          </td>
                          <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(lead.status)}`}>{lead.status}</span></td>
                          <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(lead.priority)}`}>{lead.priority}</span></td>
                          <td className="px-5 py-4">
                            <p className={isDue ? "font-semibold text-rose-700" : "text-slate-700"}>{dateLabel(lead.next_follow_up)}</p>
                            {isDue && <p className="mt-1 text-xs font-semibold text-rose-600">Due / overdue</p>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button onClick={() => openFollowUp(lead)} className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Log follow-up</button>
                              <button onClick={() => setHistoryLead(lead)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">History</button>
                              <button onClick={() => openEditLead(lead)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">Edit</button>
                              {lead.status !== "Converted" && <button disabled={saving} onClick={() => void convertToCustomer(lead)} className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Convert</button>}
                              <button onClick={() => void deleteLead(lead)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 lg:hidden">
                {visibleLeads.map((lead) => {
                  const vehicle = lead.vehicle_id ? vehicleById.get(lead.vehicle_id) : null;
                  const isDue = lead.next_follow_up && lead.next_follow_up <= today && lead.status !== "Converted" && lead.status !== "Lost";
                  return (
                    <article key={lead.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="font-semibold">{lead.full_name}</h3><p className="mt-1 text-sm text-slate-600">{lead.phone}</p></div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(lead.priority)}`}>{lead.priority}</span>
                      </div>
                      <p className="mt-3 text-sm">{vehicleLabel(vehicle) || lead.interested_in || "Vehicle not specified"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(lead.status)}`}>{lead.status}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${isDue ? "bg-rose-100 font-semibold text-rose-800" : "bg-slate-100 text-slate-600"}`}>Follow-up: {dateLabel(lead.next_follow_up)}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => openFollowUp(lead)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">Log follow-up</button>
                        <button onClick={() => setHistoryLead(lead)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">History</button>
                        <button onClick={() => openEditLead(lead)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Edit</button>
                        {lead.status !== "Converted" && <button disabled={saving} onClick={() => void convertToCustomer(lead)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50">Convert</button>}
                        <button onClick={() => void deleteLead(lead)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Delete</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <p className="text-xs leading-relaxed text-slate-500">Reminder: this page tracks follow-up dates but does not automatically send SMS, WhatsApp messages, or notifications. Keep customer phone numbers and notes accurate.</p>
      </div>

      {showLeadForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-8 sm:p-6">
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-xl font-bold">{editingLead ? "Edit Lead" : "Add New Lead"}</h2><p className="mt-1 text-sm text-slate-500">Enter the enquiry and next action.</p></div>
              <button onClick={() => setShowLeadForm(false)} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
            </div>
            <form onSubmit={saveLead} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Customer name *</label><input required className={inputClass} value={leadForm.full_name} onChange={(e) => setLeadForm({ ...leadForm, full_name: e.target.value })} /></div>
                <div><label className={labelClass}>Phone number *</label><input required type="tel" className={inputClass} value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} /></div>
                <div><label className={labelClass}>Alternate phone</label><input type="tel" className={inputClass} value={leadForm.alternate_phone} onChange={(e) => setLeadForm({ ...leadForm, alternate_phone: e.target.value })} /></div>
                <div><label className={labelClass}>Lead source</label><select className={inputClass} value={leadForm.lead_source} onChange={(e) => setLeadForm({ ...leadForm, lead_source: e.target.value })}>{leadSources.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label className={labelClass}>Vehicle from inventory</label><select className={inputClass} value={leadForm.vehicle_id} onChange={(e) => setLeadForm({ ...leadForm, vehicle_id: e.target.value })}><option value="">No specific inventory vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleLabel(v) || v.vehicle_code || v.id}</option>)}</select></div>
                <div><label className={labelClass}>Interested in / model</label><input className={inputClass} placeholder="e.g. Splendor Plus, Activa..." value={leadForm.interested_in} onChange={(e) => setLeadForm({ ...leadForm, interested_in: e.target.value })} /></div>
                <div><label className={labelClass}>Status</label><select className={inputClass} value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as LeadStatus })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label className={labelClass}>Priority</label><select className={inputClass} value={leadForm.priority} onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value as Priority })}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></div>
                <div><label className={labelClass}>Next follow-up date</label><input type="date" min="" className={inputClass} value={leadForm.next_follow_up} onChange={(e) => setLeadForm({ ...leadForm, next_follow_up: e.target.value })} /></div>
                <div><label className={labelClass}>Address</label><input className={inputClass} value={leadForm.address} onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })} /></div>
              </div>
              <div><label className={labelClass}>Enquiry notes</label><textarea rows={3} className={inputClass} placeholder="Budget, preferred colour, finance requirement, etc." value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} /></div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowLeadForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button disabled={saving} type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Saving..." : editingLead ? "Save Changes" : "Add Lead"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {followUpLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-8 sm:p-6">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-xl font-bold">Log Follow-up</h2><p className="mt-1 text-sm text-slate-500">{followUpLead.full_name} · {followUpLead.phone}</p></div>
              <button onClick={() => setFollowUpLead(null)} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
            </div>
            <form onSubmit={saveFollowUp} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Contact date *</label><input required type="date" className={inputClass} value={followUpForm.follow_up_date} onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_date: e.target.value })} /></div>
                <div><label className={labelClass}>Time (optional)</label><input type="time" className={inputClass} value={followUpForm.follow_up_time} onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_time: e.target.value })} /></div>
                <div><label className={labelClass}>Contact method</label><select className={inputClass} value={followUpForm.follow_up_type} onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_type: e.target.value as FollowUpType })}>{followUpTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><label className={labelClass}>Next follow-up date</label><input type="date" className={inputClass} value={followUpForm.next_follow_up} onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up: e.target.value })} /></div>
              </div>
              <div><label className={labelClass}>Outcome / result</label><input className={inputClass} placeholder="e.g. Asked to call next week, wants a test ride..." value={followUpForm.outcome} onChange={(e) => setFollowUpForm({ ...followUpForm, outcome: e.target.value })} /></div>
              <div><label className={labelClass}>Discussion notes</label><textarea rows={4} className={inputClass} placeholder="What did you discuss? What should happen next?" value={followUpForm.notes} onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })} /></div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setFollowUpLead(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button disabled={saving} type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Saving..." : "Save Follow-up"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-8 sm:p-6">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-xl font-bold">Follow-up History</h2><p className="mt-1 text-sm text-slate-500">{historyLead.full_name} · {historyLead.phone}</p></div>
              <button onClick={() => setHistoryLead(null)} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
            </div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
              {selectedHistory.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No follow-ups recorded for this lead yet.</div>
              ) : selectedHistory.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{item.follow_up_type} · {dateLabel(item.follow_up_date)}{item.follow_up_time ? ` · ${item.follow_up_time.slice(0, 5)}` : ""}</p>
                    {item.next_follow_up && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Next: {dateLabel(item.next_follow_up)}</span>}
                  </div>
                  {item.outcome && <p className="mt-2 text-sm"><span className="font-medium">Outcome:</span> {item.outcome}</p>}
                  {item.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.notes}</p>}
                </article>
              ))}
            </div>
            <div className="border-t border-slate-200 p-4 text-right"><button onClick={() => setHistoryLead(null)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
