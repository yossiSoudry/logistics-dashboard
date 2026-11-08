import { Boxes, ChevronsUpDown, Warehouse as WarehouseIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { lowStockItems, warehouseSummary } from "@/logic.js"
import type { InventoryItem, Warehouse } from "@/types"

/** ה-TeamSwitcher של sidebar-07, כמחליף מחסן (SPEC.md, סינון). */
export function WarehouseSwitcher({
  warehouses,
  inventory,
  value,
  onChange,
}: {
  warehouses: Warehouse[]
  inventory: InventoryItem[]
  value: string
  onChange: (warehouseId: string) => void
}) {
  const { isMobile } = useSidebar()
  const rows = warehouseSummary(warehouses, inventory) as { id: string; name: string; items: number; low: number }[]
  const all = { id: "all", name: "כל המחסנים", items: inventory.length, low: lowStockItems(inventory).length }
  const active = rows.find((r) => r.id === value) ?? all
  const sub = (r: typeof all) => `${r.items} פריטים · ${r.low} חסרים`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu dir="rtl" modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={{ children: `מחסן: ${active.name}`, side: "left", sideOffset: 14 }}
              data-testid="warehouse-switcher"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {active.id === "all" ? <Boxes className="size-4" /> : <WarehouseIcon className="size-4" />}
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="truncate text-xs text-muted-foreground tabular-nums">{sub(active)}</span>
              </div>
              <ChevronsUpDown className="ms-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-60" align="start" side={isMobile ? "bottom" : "left"} sideOffset={isMobile ? 4 : 14}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">מחסן</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
              {[all, ...rows].map((r) => (
                <DropdownMenuRadioItem key={r.id} value={r.id} className="gap-2 p-2" data-warehouse-option={r.id}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {r.id === "all" ? <Boxes className="size-3.5" /> : <WarehouseIcon className="size-3.5" />}
                  </div>
                  <div className="grid flex-1 leading-tight">
                    <span>{r.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {`${r.items} פריטים · `}
                      <span className={r.low > 0 ? "text-destructive" : undefined}>{`${r.low} חסרים`}</span>
                    </span>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-xs text-muted-foreground">הבחירה חלה על כל העמודים</p>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
