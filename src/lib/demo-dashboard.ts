/**
 * Demonstration-only dashboard figures.
 * These are not live dealership records and are not stored in a database.
 */
export const DEMO_NOTICE =
  "Demonstration data only. These figures are sample placeholders, not live Deals by Anas records."

export const dashboardSummary = [
  {
    id: "in-stock",
    label: "Vehicles in stock",
    value: "18",
    hint: "All two-wheelers currently on the yard",
  },
  {
    id: "ready",
    label: "Vehicles ready for sale",
    value: "9",
    hint: "Inspected, repaired, and priced",
  },
  {
    id: "repair",
    label: "Vehicles under repair",
    value: "5",
    hint: "Workshop or parts pending",
  },
  {
    id: "documents",
    label: "Vehicles awaiting documents",
    value: "4",
    hint: "RC, NOC, or insurance incomplete",
  },
  {
    id: "sales",
    label: "Sales this month",
    value: "₹2,40,000",
    hint: "October 2026 demonstration total",
  },
  {
    id: "outstanding",
    label: "Outstanding customer payments",
    value: "₹85,500",
    hint: "Balances still due from buyers",
  },
] as const

export const recentPurchases = [
  {
    id: "P-1042",
    vehicle: "Honda Activa 6G",
    year: 2021,
    purchasedOn: "22 Oct 2026",
    amount: "₹48,000",
  },
  {
    id: "P-1041",
    vehicle: "TVS Jupiter",
    year: 2020,
    purchasedOn: "20 Oct 2026",
    amount: "₹36,500",
  },
  {
    id: "P-1040",
    vehicle: "Hero Splendor Plus",
    year: 2019,
    purchasedOn: "18 Oct 2026",
    amount: "₹32,000",
  },
  {
    id: "P-1039",
    vehicle: "Bajaj Pulsar 150",
    year: 2018,
    purchasedOn: "16 Oct 2026",
    amount: "₹41,000",
  },
] as const

export const recentSales = [
  {
    id: "S-221",
    vehicle: "Suzuki Access 125",
    customer: "R. Mehta",
    soldOn: "24 Oct 2026",
    amount: "₹62,000",
  },
  {
    id: "S-220",
    vehicle: "Honda Shine",
    customer: "S. Khan",
    soldOn: "21 Oct 2026",
    amount: "₹54,500",
  },
  {
    id: "S-219",
    vehicle: "TVS Apache RTR 160",
    customer: "A. Patel",
    soldOn: "15 Oct 2026",
    amount: "₹71,000",
  },
] as const

export const pendingDocumentTasks = [
  {
    id: "D-31",
    vehicle: "Honda Activa 6G",
    task: "RC transfer from previous owner",
    due: "28 Oct 2026",
  },
  {
    id: "D-30",
    vehicle: "Bajaj Pulsar 150",
    task: "NOC from financier",
    due: "30 Oct 2026",
  },
  {
    id: "D-29",
    vehicle: "Hero Splendor Plus",
    task: "Insurance renewal copy",
    due: "2 Nov 2026",
  },
] as const

export const upcomingFollowUps = [
  {
    id: "L-18",
    name: "N. Sharma",
    interest: "Scooter under ₹50,000",
    when: "Today, 4:30 PM",
  },
  {
    id: "L-17",
    name: "K. Reddy",
    interest: "Pulsar 150 test ride",
    when: "Tomorrow, 11:00 AM",
  },
  {
    id: "L-16",
    name: "P. Iyer",
    interest: "Activa 6G paperwork query",
    when: "28 Oct, 10:00 AM",
  },
] as const
