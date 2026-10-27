"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import { BrandMark } from "@/components/layout/brand-mark"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-full bg-[#f3f1ed] text-zinc-900">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#1c1f24] lg:flex">
        <BrandMark />
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-zinc-200/80 bg-[#f3f1ed]/90 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton
              className="w-72 border-zinc-800 bg-[#1c1f24] p-0 text-zinc-100"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <BrandMark />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div>
            <p className="text-sm font-semibold">Deals by Anas</p>
            <p className="text-xs text-zinc-500">Dealership management</p>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
