import { useState } from "react"
import { PackageSearch, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { STATUSES, STATUS_LABELS, queryShipments, timeOf } from "@/logic.js"
import type { DashboardData, ShipmentStatus } from "@/types"

export function ShipmentsPage({ view, data }: { view: DashboardData; data: DashboardData }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const rows = queryShipments(view.shipments, { search, status }) as DashboardData["shipments"]
  const warehouse = new Map(data.warehouses.map((w) => [w.id, w.name]))
  const contractor = new Map(data.contractors.map((c) => [c.id, c.name]))

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-semibold">כל משלוחי היום</CardTitle>
          <CardDescription data-testid="result-count">
            {`${rows.length} מתוך ${view.shipments.length} משלוחים`}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="שם לקוח או מספר משלוח"
              aria-label="חיפוש משלוח לפי שם לקוח או מספר משלוח"
              className="ps-9 pe-9 [&::-webkit-search-cancel-button]:hidden"
              data-testid="shipment-search"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-1 top-1/2 size-7 -translate-y-1/2"
                onClick={() => setSearch("")}
                aria-label="נקה חיפוש"
              >
                <X />
              </Button>
            )}
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={status}
              onValueChange={(v) => setStatus(v || "all")}
              aria-label="סינון לפי סטטוס"
              data-testid="status-filter"
            >
              <ToggleGroupItem value="all">הכל</ToggleGroupItem>
              {(STATUSES as ShipmentStatus[]).map((st) => (
                <ToggleGroupItem key={st} value={st}>
                  {STATUS_LABELS[st]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center" data-testid="empty-results">
            <PackageSearch className="size-8 text-muted-foreground" />
            <p className="font-medium">לא נמצאו משלוחים</p>
            <p className="text-sm text-muted-foreground">נסו חלק אחר של השם או של מספר המשלוח, או נקו את הסינון.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-(--card-spacing)">מספר</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>מחסן</TableHead>
                <TableHead>קבלן</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="pe-(--card-spacing) text-center">שעה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} data-shipment={s.id}>
                  <TableCell className="ps-(--card-spacing) font-mono text-xs" dir="ltr">
                    <span className="block text-start">{s.id}</span>
                  </TableCell>
                  <TableCell className="font-medium">{s.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{warehouse.get(s.warehouseId)}</TableCell>
                  <TableCell className="text-muted-foreground">{contractor.get(s.contractorId)}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="pe-(--card-spacing) text-center tabular-nums">{timeOf(s.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
