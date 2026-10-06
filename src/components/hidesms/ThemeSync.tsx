"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/store"

// Ensures the <html> class matches the persisted theme. Mounted once at the
// root so any subtree stays in sync.
export function ThemeSync() {
  const theme = useApp((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") root.classList.add("dark")
    else root.classList.remove("dark")
  }, [theme])
  return null
}
