import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <TooltipProvider delayDuration={0}>
        <App />
      </TooltipProvider>
    </DirectionProvider>
  </StrictMode>,
)
