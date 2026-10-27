export type NavItem = {
  href: string
  label: string
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "Dealership overview and daily priorities",
  },
  {
    href: "/inventory",
    label: "Vehicle Inventory",
    description: "Stock, condition, and readiness for sale",
  },
  {
    href: "/purchases",
    label: "Purchases",
    description: "Incoming two-wheelers and purchase records",
  },
  {
    href: "/expenses",
    label: "Expenses & Repairs",
    description: "Workshop jobs, parts, and running costs",
  },
  {
    href: "/spare-parts",
    label: "Spare Parts",
    description: "Parts stock used during refurbishment",
  },
  {
    href: "/sales",
    label: "Sales",
    description: "Completed and in-progress vehicle sales",
  },
  {
    href: "/customers",
    label: "Customers",
    description: "Buyer records and outstanding balances",
  },
  {
    href: "/rc-noc",
    label: "RC & NOC Tracking",
    description: "Registration certificate and NOC status",
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Paperwork checklist for each vehicle",
  },
  {
    href: "/invoices",
    label: "Invoices & Receipts",
    description: "Bills issued and payments collected",
  },
  {
    href: "/leads",
    label: "Leads & Follow-ups",
    description: "Enquiries and scheduled customer calls",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Stock, sales, and expense summaries",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Dealership preferences and setup",
  },
]
