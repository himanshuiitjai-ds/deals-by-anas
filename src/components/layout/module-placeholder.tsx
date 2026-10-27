import { Construction } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ModulePlaceholderProps = {
  title: string
  description: string
}

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="size-4 text-amber-800" aria-hidden />
            <CardTitle>Module not built yet</CardTitle>
          </div>
          <CardDescription>
            This screen is a navigation placeholder. Records, forms, and a
            database will be added in a later version. No live data is shown
            here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Coming later</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
