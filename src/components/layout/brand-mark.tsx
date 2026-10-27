import { Bike } from "lucide-react"

export function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="flex size-9 items-center justify-center rounded-md bg-amber-700/80 text-amber-50">
        <Bike className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-wide text-white">
          Deals by Anas
        </p>
        <p className="truncate text-xs text-zinc-400">Used two-wheelers</p>
      </div>
    </div>
  )
}
