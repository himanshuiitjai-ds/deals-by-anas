"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  TrendingUp,
  Wallet,
  Bike,
  Users,
  Receipt,
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
type ReportData = {
  vehicles: Row[];
  sales: Row[];
  purchases: Row[];
  expenses: Row[];
  leads: Row[];
  rcNoc: Row[];
  documents: Row[];
};

const emptyData: ReportData = {
  vehicles: [],
  sales: [],
  purchases: [],
  expenses: [],
  leads: [],
  rcNoc: [],
  documents: [],
};

function first(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return null;
}

function num(row: Row, keys: string[]): number {
  const raw = first(row, keys);
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const parsed = Number(raw.replace(/[₹,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function str(row: Row, keys: string[], fallback = ""): string {
  const raw = first(row, keys);
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : fallback;
}

function dateOnly(row: Row, keys: string[]): string {
  const raw = first(row, keys);
  return typeof raw === "string" ? raw.slice(0, 10) : "";
}

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(date: string) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100";
const labelClass = "mb-1 block text-sm font-medium text-zinc-700";

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState("");
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeReport, setActiveReport] = useState("sales");

  const loadReports = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    const tableNames = ["vehicles", "vehicle_sales", "vehicle_purchases", "vehicle_expenses", "leads", "rc_noc_tracking", "vehicle_documents"];
    const results = await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("rc_noc_tracking").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_documents").select("*").order("created_at", { ascending: false }),
    ]);

    const failed = results.findIndex((result) => result.error);
    if (failed >= 0) setError(`Couldn't load ${tableNames[failed]}: ${results[failed].error?.message || "Unknown database error"}`);

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
    const now = new Date();
    const todayValue = localDateString(now);
    setToday(todayValue);
    setStartDate(startOfMonth(now));
    setEndDate(todayValue);
    void loadReports();
  }, [loadReports]);

  const dateRange = useMemo(() => {
    if (period === "all") return { start: "", end: "" };
    if (period === "custom") return { start: startDate, end: endDate };
    if (!today) return { start: "", end: "" };
    const now = new Date(`${today}T00:00:00`);
    if (period === "week") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: localDateString(start), end: today };
    }
    if (period === "year") return { start: `${now.getFullYear()}-01-01`, end: today };
    return { start: startOfMonth(now), end: today };
  }, [period, startDate, endDate, today]);

  const inRange = (date: string) => {
    if (!date) return false;
    if (dateRange.start && date < dateRange.start) return false;
    if (dateRange.end && date > dateRange.end) return false;
    return true;
  };

  const filteredSales = data.sales.filter((row) => inRange(dateOnly(row, ["sale_date", "sold_on", "created_at", "date"])));
  const filteredPurchases = data.purchases.filter((row) => inRange(dateOnly(row, ["purchase_date", "created_at", "date"])));
  const filteredExpenses = data.expenses.filter((row) => inRange(dateOnly(row, ["expense_date", "date", "created_at"])));

  const revenue = filteredSales.reduce((sum, row) => sum + num(row, ["sale_price", "selling_price", "total_amount", "amount"]), 0);
  const amountReceived = filteredSales.reduce((sum, row) => sum + num(row, ["amount_received", "paid_amount", "amount_paid"]), 0);
  const outstanding = filteredSales.reduce((sum, row) => {
    const saleTotal = num(row, ["sale_price", "selling_price", "total_amount", "amount"]);
    const received = num(row, ["amount_received", "paid_amount", "amount_paid"]);
    return sum + Math.max(0, saleTotal - received);
  }, 0);
  const expensesTotal = filteredExpenses.reduce((sum, row) => sum + num(row, ["amount", "expense_amount", "cost", "total"]), 0);
  const purchaseSpend = filteredPurchases.reduce((sum, row) => sum + num(row, ["purchase_price", "amount", "price"]), 0);

  const soldVehicleIds = new Set(data.sales.map((row) => str(row, ["vehicle_id"])).filter(Boolean));
  const availableVehicles = data.vehicles.filter((row) => !["sold", "completed", "deleted", "archived"].includes(str(row, ["status"], "purchased").toLowerCase()));
  const soldVehicles = data.vehicles.filter((row) => ["sold", "completed"].includes(str(row, ["status"], "").toLowerCase()));
  const activeLeads = data.leads.filter((row) => !["converted", "lost"].includes(str(row, ["status"], "New").toLowerCase()));
  const convertedLeads = data.leads.filter((row) => str(row, ["status"], "").toLowerCase() === "converted");
  const lostLeads = data.leads.filter((row) => str(row, ["status"], "").toLowerCase() === "lost");
  const leadConversionRate = data.leads.length ? (convertedLeads.length / data.leads.length) * 100 : 0;
  const pendingPaperwork = data.rcNoc.filter((row) =>
    !["received", "completed", "verified", "not_applicable", "not applicable"].includes(str(row, ["rc_status"], "Pending").toLowerCase()) ||
    !["received", "completed", "verified", "not_applicable", "not applicable"].includes(str(row, ["noc_status"], "Pending").toLowerCase())
  ).length;

  const reportRows = useMemo(() => {
    if (activeReport === "purchases") {
      return filteredPurchases.map((row) => ({
        Date: dateOnly(row, ["purchase_date", "created_at", "date"]),
        Reference: str(row, ["id"], "Purchase"),
        Vehicle: str(data.vehicles.find((vehicle) => str(vehicle, ["id"]) === str(row, ["vehicle_id"])) || {}, ["manufacturer"], "") + " " +
          str(data.vehicles.find((vehicle) => str(vehicle, ["id"]) === str(row, ["vehicle_id"])) || {}, ["model"], ""),
        Amount: num(row, ["purchase_price", "amount", "price"]),
      }));
    }
    if (activeReport === "expenses") {
      return filteredExpenses.map((row) => ({
        Date: dateOnly(row, ["expense_date", "date", "created_at"]),
        Reference: str(row, ["id"], "Expense"),
        Category: str(row, ["category", "expense_type", "title"], "Expense"),
        Amount: num(row, ["amount", "expense_amount", "cost", "total"]),
      }));
    }
    if (activeReport === "leads") {
      return data.leads.map((row) => ({
        Created: dateOnly(row, ["created_at"]),
        Name: str(row, ["full_name"], "Lead"),
        Phone: str(row, ["phone"]),
        Source: str(row, ["lead_source"], ""),
        Status: str(row, ["status"], "New"),
        Priority: str(row, ["priority"], "Medium"),
        NextFollowUp: str(row, ["next_follow_up"], ""),
      }));
    }
    if (activeReport === "inventory") {
      return data.vehicles.map((row) => ({
        VehicleCode: str(row, ["vehicle_code"], ""),
        Manufacturer: str(row, ["manufacturer"], ""),
        Model: str(row, ["model"], ""),
        Registration: str(row, ["registration_number"], ""),
        Year: str(row, ["manufacturing_year"], ""),
        Status: str(row, ["status"], "purchased"),
        PurchasePrice: num(row, ["purchase_price"]),
      }));
    }
    if (activeReport === "payments") {
      return filteredSales.map((row) => {
        const total = num(row, ["sale_price", "selling_price", "total_amount", "amount"]);
        const received = num(row, ["amount_received", "paid_amount", "amount_paid"]);
        return {
          Date: dateOnly(row, ["sale_date", "sold_on", "created_at"]),
          Reference: str(row, ["id"], "Sale"),
          SaleAmount: total,
          AmountReceived: received,
          Outstanding: Math.max(0, total - received),
        };
      });
    }
    return filteredSales.map((row) => ({
      Date: dateOnly(row, ["sale_date", "sold_on", "created_at", "date"]),
      Reference: str(row, ["id"], "Sale"),
      Vehicle: (() => {
        const vehicle = data.vehicles.find((item) => str(item, ["id"]) === str(row, ["vehicle_id"]));
        return vehicle ? `${str(vehicle, ["manufacturer"], "")} ${str(vehicle, ["model"], "")}`.trim() : str(row, ["vehicle_name", "model"], "Vehicle");
      })(),
      SaleAmount: num(row, ["sale_price", "selling_price", "total_amount", "amount"]),
      AmountReceived: num(row, ["amount_received", "paid_amount", "amount_paid"]),
    }));
  }, [activeReport, filteredPurchases, filteredExpenses, filteredSales, data.leads, data.vehicles]);

  function exportCsv() {
    if (!reportRows.length) {
      setNotice("There are no rows to export for this report and date range.");
      return;
    }
    const columns = Object.keys(reportRows[0]);
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [columns.map(escapeCsv).join(","), ...reportRows.map((row) => columns.map((column) => escapeCsv((row as Record<string, unknown>)[column])).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `deals-by-anas-${activeReport}-${today || "report"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("CSV report downloaded.");
  }

  const reportTabs = [
    { id: "sales", label: "Sales" },
    { id: "purchases", label: "Purchases" },
    { id: "expenses", label: "Expenses" },
    { id: "inventory", label: "Inventory" },
    { id: "leads", label: "Lead conversion" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-800">Deals by Anas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">Reports &amp; Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">Review dealership performance using records from your Supabase database.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"><Printer className="size-4" /> Print / Save PDF</button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"><Download className="size-4" /> Export CSV</button>
          <button type="button" onClick={() => void loadReports(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900"><AlertCircle className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">Some report data could not be loaded.</p><p className="mt-1">{error}</p></div></div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">{notice}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-white"><CardHeader className="flex flex-row items-start justify-between"><div><CardDescription>Sales revenue</CardDescription><CardTitle className="mt-1 text-2xl tabular-nums">{loading ? "…" : money(revenue)}</CardTitle></div><TrendingUp className="size-5 text-zinc-500" /></CardHeader><CardContent><p className="text-xs text-zinc-500">{filteredSales.length} sales in selected period</p></CardContent></Card>
        <Card className="bg-white"><CardHeader className="flex flex-row items-start justify-between"><div><CardDescription>Amount received</CardDescription><CardTitle className="mt-1 text-2xl tabular-nums">{loading ? "…" : money(amountReceived)}</CardTitle></div><Wallet className="size-5 text-zinc-500" /></CardHeader><CardContent><p className="text-xs text-zinc-500">Recorded customer payments</p></CardContent></Card>
        <Card className="bg-white"><CardHeader className="flex flex-row items-start justify-between"><div><CardDescription>Outstanding balance</CardDescription><CardTitle className="mt-1 text-2xl tabular-nums">{loading ? "…" : money(outstanding)}</CardTitle></div><Receipt className="size-5 text-zinc-500" /></CardHeader><CardContent><p className="text-xs text-zinc-500">Sales amount less received amount</p></CardContent></Card>
        <Card className="bg-white"><CardHeader className="flex flex-row items-start justify-between"><div><CardDescription>Recorded expenses</CardDescription><CardTitle className="mt-1 text-2xl tabular-nums">{loading ? "…" : money(expensesTotal)}</CardTitle></div><Wallet className="size-5 text-zinc-500" /></CardHeader><CardContent><p className="text-xs text-zinc-500">Expenses in selected period</p></CardContent></Card>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3"><h2 className="font-semibold text-zinc-900">Report filters</h2><p className="text-sm text-zinc-500">Choose a period or enter a custom date range.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div><label className={labelClass} htmlFor="period">Period</label><select id="period" className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}><option value="week">Last 7 days</option><option value="month">This month</option><option value="year">This year</option><option value="all">All dates</option><option value="custom">Custom range</option></select></div>
          {period === "custom" && <>
            <div><label className={labelClass} htmlFor="start-date">From</label><input id="start-date" type="date" className={inputClass} value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><label className={labelClass} htmlFor="end-date">To</label><input id="end-date" type="date" className={inputClass} value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} /></div>
          </>}
        </div>
        <p className="mt-3 text-xs text-zinc-500">Selected period: {dateRange.start ? formatDate(dateRange.start) : "Beginning"} — {dateRange.end ? formatDate(dateRange.end) : "Today / all available dates"}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-white"><CardHeader><CardDescription>Current stock</CardDescription><CardTitle className="text-2xl">{loading ? "…" : availableVehicles.length}</CardTitle></CardHeader><CardContent><p className="text-xs text-zinc-500">Vehicles not marked sold</p></CardContent></Card>
        <Card className="bg-white"><CardHeader><CardDescription>Sold vehicles</CardDescription><CardTitle className="text-2xl">{loading ? "…" : Math.max(soldVehicles.length, soldVehicleIds.size)}</CardTitle></CardHeader><CardContent><p className="text-xs text-zinc-500">Inventory status and sale records</p></CardContent></Card>
        <Card className="bg-white"><CardHeader><CardDescription>Lead conversion rate</CardDescription><CardTitle className="text-2xl">{loading ? "…" : `${leadConversionRate.toFixed(1)}%`}</CardTitle></CardHeader><CardContent><p className="text-xs text-zinc-500">{convertedLeads.length} converted · {lostLeads.length} lost</p></CardContent></Card>
        <Card className="bg-white"><CardHeader><CardDescription>Pending RC / NOC</CardDescription><CardTitle className="text-2xl">{loading ? "…" : pendingPaperwork}</CardTitle></CardHeader><CardContent><p className="text-xs text-zinc-500">Records with at least one pending item</p></CardContent></Card>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold text-zinc-900">Detailed reports</h2><p className="text-sm text-zinc-500">Select a report to view its records and export them.</p></div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Report type">
          {reportTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeReport === tab.id} onClick={() => setActiveReport(tab.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium ${activeReport === tab.id ? "border-amber-800 bg-amber-800 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"}`}>{tab.label}</button>)}
        </div>
        <Card className="bg-white">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>{reportTabs.find((tab) => tab.id === activeReport)?.label} report</CardTitle><CardDescription>{reportRows.length} records in this report</CardDescription></div><button type="button" onClick={exportCsv} className="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"><FileSpreadsheet className="size-4" /> Export this report</button></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-zinc-500">Loading report data…</p> : reportRows.length === 0 ? <p className="py-8 text-center text-sm text-zinc-500">No records found for this report and date range.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr>{Object.keys(reportRows[0]).map((column) => <th key={column} className="whitespace-nowrap px-3 py-3">{column.replace(/([A-Z])/g, " $1")}</th>)}</tr></thead>
                  <tbody className="divide-y divide-zinc-100">{reportRows.map((row, index) => <tr key={index} className="hover:bg-zinc-50">{Object.values(row).map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-3 py-3 text-zinc-700">{typeof cell === "number" && /amount|price|received|outstanding|purchase/i.test(Object.keys(row)[cellIndex]) ? money(cell) : String(cell ?? "—")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
        <AlertCircle className="size-4 shrink-0" />
        These reports summarize available database fields. Profit and loss is not presented as a final accounting statement because purchase allocation, linked repair costs, taxes, and other cost fields should be verified against your records first.
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/sales" className="text-amber-800 underline">Open Sales</Link>
        <Link href="/expenses" className="text-amber-800 underline">Open Expenses</Link>
        <Link href="/inventory" className="text-amber-800 underline">Open Inventory</Link>
        <Link href="/leads" className="text-amber-800 underline">Open Leads</Link>
      </div>
    </div>
  );
}
