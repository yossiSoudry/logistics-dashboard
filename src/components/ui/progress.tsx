import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"
import { useDirection } from "@/components/ui/direction"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // ב-RTL המילוי מתחיל מימין, ולכן ההזזה הפוכה
  const dir = useDirection()
  const offset = (100 - (value || 0)) * (dir === "rtl" ? 1 : -1)
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(${offset}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
