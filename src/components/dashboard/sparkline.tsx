import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { areaPath, smoothPath, sparklinePoints } from "@/lib/sparkline.js"

/**
 * גרף מגמה קטן ב-SVG. הרוחב נמדד בפיקסלים כדי שהנקודות יישארו עגולות.
 * הערך הראשון (השעה המוקדמת) בצד ימין.
 */
export function Sparkline({
  values,
  labels,
  color = "var(--primary)",
  height = 56,
  dots = false,
  padX = 0,
  className,
  label,
}: {
  values: number[]
  labels?: string[]
  color?: string
  height?: number
  dots?: boolean
  padX?: number
  className?: string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const gradientId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const points = sparklinePoints(values, width, height, { padX, padY: dots ? 6 : 4 }) as [number, number][]

  return (
    <div ref={ref} className={cn("relative w-full", className)} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={label}
          className="block overflow-visible"
          data-sparkline
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath(points, height)} fill={`url(#${gradientId})`} />
          <path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
          {dots &&
            points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3} fill="var(--card)" stroke={color} strokeWidth={2}>
                {labels && <title>{`${labels[i]}: ${values[i]}`}</title>}
              </circle>
            ))}
        </svg>
      )}
    </div>
  )
}
