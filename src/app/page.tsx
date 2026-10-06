"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/store"
import { Providers } from "@/components/providers"
import { ThemeSync } from "@/components/hidesms/ThemeSync"
import { LockScreen } from "@/components/hidesms/LockScreen"
import { VaultLock } from "@/components/hidesms/VaultLock"
import { FakeCover } from "@/components/hidesms/FakeCover"
import { ConversationList } from "@/components/hidesms/ConversationList"
import { ChatView } from "@/components/hidesms/ChatView"
import { Settings } from "@/components/hidesms/Settings"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { seedDemoData } from "@/hooks/use-data"

function Shell() {
  const view = useApp((s) => s.view)
  const hasPin = useApp((s) => s.hasPin)
  const isLocked = useApp((s) => s.isLocked)
  const fakeCoverEnabled = useApp((s) => s.fakeCoverEnabled)
  const setView = useApp((s) => s.setView)
  const setLocked = useApp((s) => s.setLocked)

  // Seed demo data on first run (local IndexedDB — no server needed).
  useEffect(() => {
    seedDemoData(false).catch(() => {})
  }, [])

  // Decide effective screen given lock + fake cover.
  let screen: React.ReactNode = null

  if (!hasPin) {
    // First run: onboarding to create a PIN.
    screen = <LockScreen />
  } else if (isLocked) {
    // App is locked. When the fake cover is enabled, the calculator is shown
    // first; only once the user reveals the PIN pad (view === "reveal-pin")
    // do we render the actual lock screen.
    if (fakeCoverEnabled && view !== "reveal-pin") {
      screen = <FakeCover />
    } else {
      screen = <LockScreen />
    }
  } else {
    // Unlocked. "lock" / "fake-cover" / "reveal-pin" are locked-only states;
    // if the store still references them here, fall back to the list.
    const safeView =
      view === "lock" || view === "fake-cover" || view === "reveal-pin"
        ? "list"
        : view
    switch (safeView) {
      case "list":
        screen = <ConversationList scope="public" />
        break
      case "chat":
        screen = <ChatView />
        break
      case "vault-lock":
        screen = <VaultLock />
        break
      case "vault-list":
        screen = <ConversationList scope="vault" />
        break
      case "vault-chat":
        screen = <ChatView vault />
        break
      case "settings":
        screen = <Settings />
        break
      default:
        screen = <ConversationList scope="public" />
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-200 dark:bg-neutral-950 flex items-center justify-center sm:p-6">
      {/* Phone shell on desktop, fullscreen on mobile */}
      <div
        className={cn(
          "relative w-full sm:w-[400px] h-[100dvh] sm:h-[860px] sm:max-h-[92vh]",
          "bg-background sm:rounded-[2.2rem] overflow-hidden flex flex-col",
          "sm:phone-shell"
        )}
      >
        {/* Notch / status bar mock on desktop only */}
        <div className="hidden sm:flex absolute top-0 inset-x-0 h-7 items-center justify-between px-6 text-[11px] font-medium text-muted-foreground z-30 pointer-events-none">
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-5 w-24 bg-black rounded-full" />
          <span className="flex items-center gap-1">
            <span>📶</span>
            <span>🔋</span>
          </span>
        </div>

        {/* Subtle top inset for the notch on desktop */}
        <div className="hidden sm:block h-7 shrink-0" />

        <div className="relative flex-1 overflow-hidden flex flex-col">
          {screen}
        </div>
      </div>

      <Toaster richColors position="top-center" />
    </div>
  )
}

export default function Home() {
  return (
    <Providers>
      <ThemeSync />
      <Shell />
    </Providers>
  )
}
