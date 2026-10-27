"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  Bike,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileWarning,
  RefreshCw,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = Record<string, unknown>;

type DashboardData = {
  vehicles: Row[];
  sales: Row[];
  purchases: Row[];
  expenses: Row[];
  leads: Row[];
  rcNoc: Row[];
  documents: Row[];
};

const emptyData: DashboardData = {
  vehicles: [],
  sales: [],
  purchases: [],
  expenses: [],
  leads: [],
  rcNoc: [],
  documents: [],
};

const quickLinks = [
  { label: "Add vehicle", href: "/inventory", icon: Bike },
  { label: "Record purchase", href: "/purchases", icon: ArrowDownRight },
  { label: "Record sale", href: "/sales", icon: CircleDollarSign },
  { label: "Add expense", href: "/expenses", icon: Wallet },
  { label: "Add lead", href: "/leads", icon: Users },
  { label: "Manage documents", href: "/documents", icon: ClipboardCheck },
];

function value(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return null;
}

function numberValue(row: Row, keys: string[]): number {
  const raw = value(row, keys);
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const parsed = Number(raw.replace(/[₹,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dateValue(row: Row, keys: string[]): string {
  const raw = value(row, keys);
  return typeof raw === "string" ? raw.slice(0, 10) : "";
}

function labelValue(row: Row, keys: string[], fallback = "—"): string {
  const raw = value(row, keys);
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : fallback;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(date: string) {
  if (!date) return "Date not recorded";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isSoldVehicle(row: Row) {
  const status = labelValue(row, ["status"], "").toLowerCase();
  return ["sold", "completed"].includes(status);
}

function isAvailableVehicle(row: Row) {
  const status = labelValue(row, ["status"], "purchased").toLowerCase();
  return !["sold", "completed", "deleted", "archived"].includes(status);
}

function isActiveLead(row: Row) {
  const status = labelValue(row, ["status"], "New").toLowerCase();
  return !["converted", "lost"].includes(status);
}

function isPendingStatus(status: string) {
  return !["received", "verified", "completed", "not_applicable", "not applicable", "available"].includes(status.toLowerCase());
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [monthStart, setMonthStart] = useState("");
  const [todayISO, setTodayISO] = useState("");

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const results = await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("rc_noc_tracking").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_documents").select("*").order("created_at", { ascending: false }),
    ]);

    const tableNames = ["vehicles", "vehicle_sales", "vehicle_purchases", "vehicle_expenses", "leads", "rc_noc_tracking", "vehicle_documents"];
    const failed = results.findIndex((result) => result.error);
    if (failed >= 0) {
      setError(`Couldn't load ${tableNames[failed]}: ${results[failed].error?.message || "Unknown database error"}`);
    }

    setData({
      vehicles: results[0].data || [],
      sales: results[1].data || [],
      purchases: results[2].data || [],
      expenses: results[3].data || [],
      leads: results[4].data || [],
      rcNoc: results[5].data || [],
      documents: results[6].data || [],
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    // Read the current date only after mount to avoid Next.js prerender errors.
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setMonthStart(`${month}-01`);
    setTodayISO(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
    void loadDashboard();
  }, [loadDashboard]);

  const availableVehicles = data.vehicles.filter(isAvailableVehicle);
  const soldVehicles = data.vehicles.filter(isSoldVehicle);
  const salesThisMonth = data.sales.filter((row) => {
    const date = dateValue(row, ["sale_date", "sold_on", "created_at", "date"]);
    return date >= monthStart;
  });
  const salesRevenue = salesThisMonth.reduce((sum, row) => sum + numberValue(row, ["sale_price", "selling_price", "total_amount", "amount"]), 0);
  const outstanding = data.sales.reduce((sum, row) => {
    const total = numberValue(row, ["sale_price", "selling_price", "total_amount", "amount"]);
    const received = numberValue(row, ["amount_received", "paid_amount", "amount_paid"]);
    return sum + Math.max(0, total - received);
  }, 0);
  const expenseTotal = data.expenses.reduce((sum, row) => sum + numberValue(row, ["amount", "expense_amount", "cost", "total"]), 0);
  const activeLeads = data.leads.filter(isActiveLead);
  const dueFollowUps = activeLeads.filter((row) => {
    const date = dateValue(row, ["next_follow_up"]);
    return date && date <= todayISO;
  });
  const pendingRcNoc = data.rcNoc.filter((row) => {
    const rc = labelValue(row, ["rc_status"], "Pending");
    const noc = labelValue(row, ["noc_status"], "Pending");
    return isPendingStatus(rc) || isPendingStatus(noc);
  });
  const pendingDocuments = data.documents.filter((row) => {
    const status = labelValue(row, ["document_status", "status"], "Pending");
    return isPendingStatus(status);
  });

  const summary = [
    { label: "Vehicles in stock", value: loading ? "…" : String(availableVehicles.length), hint: "Vehicles not marked sold", icon: Bike },
    { label: "Vehicles sold", value: loading ? "…" : String(soldVehicles.length || data.sales.length), hint: "Based on inventory and sales records", icon: CheckCircle2 },
    { label: "Sales this month", value: loading ? "…" : formatMoney(salesRevenue), hint: `${salesThisMonth.length} recorded sales this month`, icon: CircleDollarSign },
    { label: "Outstanding payments", value: loading ? "…" : formatMoney(outstanding), hint: "Recorded sale amount less amount received", icon: Wallet },
    { label: "Expenses recorded", value: loading ? "…" : formatMoney(expenseTotal), hint: "All expense records", icon: Wrench },
    { label: "Active leads", value: loading ? "…" : String(activeLeads.length), hint: `${dueFollowUps.length} follow-ups due or overdue`, icon: Users },
  ];

  const recentPurchases = [...data.purchases]
    .sort((a, b) => dateValue(b, ["purchase_date", "created_at"]).localeCompare(dateValue(a, ["purchase_date", "created_at"])))
    .slice(0, 4);
  const recentSales = [...data.sales]
    .sort((a, b) => dateValue(b, ["sale_date", "sold_on", "created_at"]).localeCompare(dateValue(a, ["sale_date", "sold_on", "created_at"])))
    .slice(0, 4);
  const followUps = [...dueFollowUps]
    .sort((a, b) => dateValue(a, ["next_follow_up"]).localeCompare(dateValue(b, ["next_follow_up"])))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-amber-800 uppercase">Operations overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">Live snapshot of stock, sales, paperwork, and follow-ups for Deals by Anas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="w-fit border-emerald-800/30 bg-emerald-50 text-emerald-900">Live database</Badge>
          <button type="button" onClick={() => void loadDashboard(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div><p className="font-semibold">Some dashboard data could not be loaded.</p><p className="mt-1">{error}</p><p className="mt-1">Other sections may still display data from tables that loaded successfully.</p></div>
        </div>
      )}

      <section aria-label="Business summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div><CardDescription>{item.label}</CardDescription><CardTitle className="mt-1 text-2xl tabular-nums">{item.value}</CardTitle></div>
                <div className="flex size-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-700"><Icon className="size-4" aria-hidden="true" /></div>
              </CardHeader>
              <CardContent><p className="text-xs text-zinc-500">{item.hint}</p></CardContent>
            </Card>
          );
        })}
      </section>

      <section aria-label="Quick actions">
        <div className="mb-3"><h2 className="text-lg font-semibold text-zinc-900">Quick actions</h2><p className="text-sm text-zinc-500">Jump directly to a working module.</p></div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return <Link key={item.label} href={item.href} className="flex min-h-24 flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 text-sm font-medium text-zinc-800 transition hover:border-amber-700/50 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-700"><Icon className="size-5 text-amber-800" /><span className="mt-3 flex items-center justify-between gap-1">{item.label}<ArrowRight className="size-4 shrink-0" /></span></Link>;
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="bg-white">
          <CardHeader><CardTitle>Recent vehicle purchases</CardTitle><CardDescription>Latest recorded purchases from Supabase</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-zinc-500">Loading purchases…</p> : recentPurchases.length === 0 ? <p className="text-sm text-zinc-500">No purchase records yet. <Link className="text-amber-800 underline" href="/purchases">Open Purchases</Link></p> : (
              <ul className="divide-y divide-zinc-100">{recentPurchases.map((row, index) => {
                const date = dateValue(row, ["purchase_date", "created_at"]);
                const amount = numberValue(row, ["purchase_price", "amount", "price"]);
                const vehicle = data.vehicles.find((v) => value(v, ["id"]) === value(row, ["vehicle_id"]));
                const vehicleName = vehicle ? [labelValue(vehicle, ["manufacturer"], ""), labelValue(vehicle, ["model"], "")].filter(Boolean).join(" ") : labelValue(row, ["vehicle_name", "model"], "Vehicle purchase");
                return <li key={labelValue(row, ["id"], `purchase-${index}`)} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-zinc-900">{vehicleName || "Vehicle purchase"}</p><p className="text-xs text-zinc-500">{labelValue(row, ["id"], "Purchase")} · {formatDate(date)}</p></div><p className="text-sm tabular-nums text-zinc-800">{formatMoney(amount)}</p></li>;
              })}</ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader><CardTitle>Recent sales</CardTitle><CardDescription>Latest recorded sales from Supabase</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-zinc-500">Loading sales…</p> : recentSales.length === 0 ? <p className="text-sm text-zinc-500">No sales recorded yet. <Link className="text-amber-800 underline" href="/sales">Open Sales</Link></p> : (
              <ul className="divide-y divide-zinc-100">{recentSales.map((row, index) => {
                const date = dateValue(row, ["sale_date", "sold_on", "created_at"]);
                const amount = numberValue(row, ["sale_price", "selling_price", "total_amount", "amount"]);
                const vehicle = data.vehicles.find((v) => value(v, ["id"]) === value(row, ["vehicle_id"]));
                const customer = labelValue(row, ["customer_name", "buyer_name"], "Customer");
                const vehicleName = vehicle ? [labelValue(vehicle, ["manufacturer"], ""), labelValue(vehicle, ["model"], "")].filter(Boolean).join(" ") : labelValue(row, ["vehicle_name", "model"], "Vehicle sale");
                return <li key={labelValue(row, ["id"], `sale-${index}`)} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-zinc-900">{vehicleName || "Vehicle sale"}</p><p className="text-xs text-zinc-500">{labelValue(row, ["id"], "Sale")} · {customer} · {formatDate(date)}</p></div><p className="text-sm tabular-nums text-zinc-800">{formatMoney(amount)}</p></li>;
              })}</ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader><CardTitle>Pending paperwork</CardTitle><CardDescription>RC/NOC and document records needing attention</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-zinc-500">Loading paperwork…</p> : pendingRcNoc.length + pendingDocuments.length === 0 ? <p className="text-sm text-zinc-500">No pending paperwork found in the loaded records.</p> : (
              <ul className="divide-y divide-zinc-100">
                {pendingRcNoc.slice(0, 4).map((row, index) => {
                  const vehicle = data.vehicles.find((v) => value(v, ["id"]) === value(row, ["vehicle_id"]));
                  const name = vehicle ? [labelValue(vehicle, ["manufacturer"], ""), labelValue(vehicle, ["model"], ""), labelValue(vehicle, ["registration_number"], "")].filter(Boolean).join(" · ") : "Vehicle";
                  const tasks = [isPendingStatus(labelValue(row, ["rc_status"], "Pending")) ? `RC: ${labelValue(row, ["rc_status"], "Pending")}` : "", isPendingStatus(labelValue(row, ["noc_status"], "Pending")) ? `NOC: ${labelValue(row, ["noc_status"], "Pending")}` : ""].filter(Boolean).join(" · ");
                  return <li key={labelValue(row, ["id"], `rc-${index}`)} className="py-3 first:pt-0 last:pb-0"><p className="font-medium text-zinc-900">{name}</p><p className="text-xs text-zinc-500">{tasks}</p></li>;
                })}
                {pendingDocuments.slice(0, Math.max(0, 4 - Math.min(4, pendingRcNoc.length))).map((row, index) => <li key={labelValue(row, ["id"], `doc-${index}`)} className="py-3 first:pt-0 last:pb-0"><p className="font-medium text-zinc-900">{labelValue(row, ["document_name", "document_type"], "Document")}</p><p className="text-xs text-zinc-500">{labelValue(row, ["document_status", "status"], "Pending")} · {formatDate(dateValue(row, ["expiry_date", "submitted_date"]))}</p></li>)}
              </ul>
            )}
            <Link href="/rc-noc" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:underline">Open RC &amp; NOC <ArrowRight className="size-4" /></Link>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader><CardTitle>Follow-ups needing attention</CardTitle><CardDescription>Active leads whose follow-up date is today or earlier</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-zinc-500">Loading follow-ups…</p> : followUps.length === 0 ? <p className="text-sm text-zinc-500">No due follow-ups. <Link className="text-amber-800 underline" href="/leads">Open Leads</Link></p> : (
              <ul className="divide-y divide-zinc-100">{followUps.map((row, index) => <li key={labelValue(row, ["id"], `lead-${index}`)} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-medium text-zinc-900">{labelValue(row, ["full_name"], "Lead")}</p><p className="text-xs text-zinc-500">{labelValue(row, ["phone"], "")} · {labelValue(row, ["interested_in"], "Enquiry")}</p></div><Badge variant="outline" className="shrink-0 border-amber-800/30 bg-amber-50 text-amber-900">{formatDate(dateValue(row, ["next_follow_up"]))}</Badge></li>)}</ul>
            )}
            <Link href="/leads" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:underline">Open Leads &amp; Follow-ups <ArrowRight className="size-4" /></Link>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
        <AlertCircle className="size-4 shrink-0" />
        Figures are calculated from available Supabase records. Please verify totals against the source modules, especially if your database uses custom status labels or expense field names.
      </div>
    </div>
  );
}

export default DashboardPage;