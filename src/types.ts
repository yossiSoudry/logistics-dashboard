export type ShipmentStatus = "pending" | "in_transit" | "delivered" | "failed"

export interface Warehouse { id: string; name: string }
export interface Contractor { id: string; name: string }
export interface InventoryItem {
  sku: string
  name: string
  warehouseId: string
  quantity: number
  minimum: number
}
export interface Shipment {
  id: string
  customer: string
  warehouseId: string
  contractorId: string
  status: ShipmentStatus
  createdAt: string
}
export interface DashboardData {
  date: string
  now: string
  warehouses: Warehouse[]
  contractors: Contractor[]
  inventory: InventoryItem[]
  shipments: Shipment[]
}
export interface Filters { warehouseId: string; contractorId: string }
