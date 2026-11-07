import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
}: {
  inventory: InventoryItem[]
  warehouses: Warehouse[]
}) {
  const names = new Map(warehouses.map((w) => [w.id, w.name]))
  const low = lowStockItems(inventory).length
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">מלאי לפי מחסן</CardTitle>
        <CardDescription>
          {inventory.length} פריטים
          {low > 0 && <span className="text-destructive">{` · ${low} מתחת למינימום`}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-(--card-spacing)">פריט</TableHead>
              <TableHead>מחסן</TableHead>
              <TableHead className="text-center">כמות נוכחית</TableHead>
              <TableHead className="pe-(--card-spacing) text-center">מינימום</TableHead>
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
                  <TableRow
                    key={item.sku}
                    data-sku={item.sku}
                    data-low={isLow || undefined}
                    className={cn(
                      isLow &&
                        "bg-destructive/10 hover:bg-destructive/15 dark:bg-destructive/20 dark:hover:bg-destructive/25",
                    )}
                  >
                    <TableCell className="ps-(--card-spacing)">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cn("font-medium", isLow && "text-destructive")}>{item.name}</span>
                        {isLow && (
                          <Badge variant="destructive" className="max-sm:hidden">
                            {`חסרים ${item.minimum - item.quantity}`}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {names.get(item.warehouseId) ?? item.warehouseId}
                    </TableCell>
                    <TableCell className={cn("text-center tabular-nums", isLow && "font-bold text-destructive")}>
                      {item.quantity}
                    </TableCell>
                    <TableCell className="pe-(--card-spacing) text-center text-muted-foreground tabular-nums">
                      {item.minimum}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
