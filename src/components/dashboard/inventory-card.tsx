import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isLowStock, lowStockItems } from "@/logic.js"
import type { InventoryItem, Warehouse } from "@/types"

export function InventoryCard({
  inventory,
  warehouses,
  className,
}: {
  inventory: InventoryItem[]
  warehouses: Warehouse[]
  className?: string
}) {
  const names = new Map(warehouses.map((w) => [w.id, w.name]))
  const low = lowStockItems(inventory).length
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">מלאי לפי מחסן</CardTitle>
        <CardDescription className="text-xs">
          {`${inventory.length} פריטים`}
          {low > 0 && <span className="text-destructive">{` · ${low} מתחת למינימום`}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* טבלה במסגרת משלה בתוך הכרטיס, כמו Payments בהשראה */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-3">פריט</TableHead>
                <TableHead>מחסן</TableHead>
                <TableHead className="text-center">כמות</TableHead>
                <TableHead className="pe-3 text-center">מינימום</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    אין פריטים להצגה
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const isLow = isLowStock(item)
                  return (
                    <TableRow key={item.sku} data-sku={item.sku} data-low={isLow || undefined}>
                      <TableCell className="ps-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn("size-1.5 shrink-0 rounded-full", isLow ? "bg-destructive" : "bg-transparent")}
                            aria-hidden
                          />
                          <span className={cn("font-medium", isLow && "text-destructive")}>{item.name}</span>
                          {isLow && (
                            <span className="rounded-full border border-destructive/40 px-1.5 text-[0.6875rem] leading-4 font-medium text-destructive max-sm:hidden">
                              {`חסרים ${item.minimum - item.quantity}`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{names.get(item.warehouseId) ?? item.warehouseId}</TableCell>
                      <TableCell className={cn("text-center tabular-nums", isLow && "font-semibold text-destructive")}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className="pe-3 text-center text-muted-foreground tabular-nums">{item.minimum}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
