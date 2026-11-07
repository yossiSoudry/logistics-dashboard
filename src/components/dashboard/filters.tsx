import { FilterX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Contractor, Filters, Warehouse } from "@/types"

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: { id: string; name: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </label>
      <Select dir="rtl" value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full sm:w-40" data-testid={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="all">הכל</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function DashboardFilters({
  filters,
  warehouses,
  contractors,
  onChange,
}: {
  filters: Filters
  warehouses: Warehouse[]
  contractors: Contractor[]
  onChange: (next: Filters) => void
}) {
  const active = filters.warehouseId !== "all" || filters.contractorId !== "all"
  return (
    <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:items-center">
      <FilterSelect
        id="filter-warehouse"
        label="מחסן"
        value={filters.warehouseId}
        options={warehouses}
        onChange={(warehouseId) => onChange({ ...filters, warehouseId })}
      />
      <FilterSelect
        id="filter-contractor"
        label="קבלן"
        value={filters.contractorId}
        options={contractors}
        onChange={(contractorId) => onChange({ ...filters, contractorId })}
      />
      <Button
        variant="ghost"
        className="col-span-2 sm:col-span-1"
        disabled={!active}
        onClick={() => onChange({ warehouseId: "all", contractorId: "all" })}
        data-testid="filter-reset"
      >
        <FilterX data-icon="inline-start" />
        נקה סינון
      </Button>
    </div>
  )
}
