"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bike,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Wrench,
  Package,
  CircleDollarSign,
  FolderOpen,
  PhoneCall,
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { NAV_ITEMS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/inventory": Bike,
  "/purchases": ShoppingBag,
  "/expenses": Wrench,
  "/spare-parts": Package,
  "/sales": CircleDollarSign,
  "/customers": Users,
  "/rc-noc": ShieldCheck,
  "/documents": FolderOpen,
  "/invoices": Receipt,
  "/leads": PhoneCall,
  "/reports": BarChart3,
  "/settings": Settings,
}

type SidebarNavProps = {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 pb-4">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.href] ?? ClipboardList
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            onNavigate={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-white/10 text-white"
                : "text-zinc-300 hover:bg-white/5 hover:text-white"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
      <p className="mt-auto flex items-start gap-2 px-3 pt-6 text-[11px] leading-relaxed text-zinc-500">
        <FileText className="mt-0.5 size-3 shrink-0" aria-hidden />
        Modules beyond Dashboard are placeholders until business features are built.
      </p>
    </nav>
  )
}
