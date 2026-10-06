"use client"

import { useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { Delete, Fingerprint } from "lucide-react"

interface PinPadProps {
  length?: number
  onUnlock?: (pin: string) => Promise<void> | void
  title?: string
  subtitle?: string
  verifyEndpoint?: "/api/lock"
  mode?: "vault" | "main"
  errorText?: string
  showBack?: boolean
  onBack?: () => void
  // Optional discreet element rendered above the PIN dots (e.g. a row of
  // notification icons signalling unread messages, without any messaging icon).
  topSlot?: React.ReactNode
}

export function PinPad({
  length = 4,
  onUnlock,
  title = "Entrez votre code",
  subtitle,
  mode = "main",
  errorText: externalError,
  showBack,
  onBack,
  topSlot,
}: PinPadProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(externalError ?? null)
  const [busy, setBusy] = useState(false)

  const submit = useCallback(
    async (full: string) => {
      setBusy(true)
      try {
        if (onUnlock) {
          await onUnlock(full)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Code incorrect"
        setError(msg)
      } finally {
        setBusy(false)
        setPin("")
      }
    },
    [onUnlock]
  )

  const press = useCallback(
    (d: string) => {
      if (busy) return
      setError(null)
      if (pin.length >= length) return
      const next = pin + d
      setPin(next)
      if (next.length === length) {
        // Use a ref to the latest submit to avoid stale closures.
        setTimeout(() => {
          submitRef.current(next)
        }, 120)
      }
    },
    [busy, pin, length]
  )

  // Keep a ref to the latest submit so the setTimeout always calls the
  // current version (avoids stale-closure issues when key={step} remounts).
  const submitRef = useRef(submit)
  submitRef.current = submit

  const del = useCallback(() => {
    if (busy) return
    setError(null)
    setPin((p) => p.slice(0, -1))
  }, [busy])

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"]

  return (
    <div className="flex flex-col items-center justify-between h-full w-full select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-10">
        {showBack && (
          <button
            onClick={onBack}
            className="self-start -ml-2 mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour
          </button>
        )}
        <div className="text-5xl mb-1">🔒</div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground text-center max-w-[18rem]">{subtitle}</p>}
        {topSlot && <div className="mt-3">{topSlot}</div>}
        <div className="flex gap-3 mt-6 h-4" aria-live="polite">
          {Array.from({ length }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 w-3 rounded-full transition-all duration-150",
                i < pin.length ? "bg-primary scale-110" : "bg-muted-foreground/25 scale-100"
              )}
            />
          ))}
        </div>
        <div className="h-5 mt-2 text-sm text-destructive">{error ?? ""}</div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[20rem] pb-8 px-2">
        {keys.map((k, idx) => {
          if (k === "") return <div key={idx} />
          if (k === "del") {
            return (
              <button
                key={idx}
                onClick={del}
                className="h-16 sm:h-[4.5rem] rounded-2xl grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition"
                aria-label="Effacer"
                disabled={busy}
              >
                <Delete className="h-6 w-6" />
              </button>
            )
          }
          return (
            <button
              key={idx}
              onClick={() => press(k)}
              disabled={busy}
              className={cn(
                "h-16 sm:h-[4.5rem] rounded-2xl grid place-items-center",
                "bg-muted/40 hover:bg-muted text-2xl font-medium text-foreground",
                "active:scale-95 transition disabled:opacity-50"
              )}
            >
              {k}
            </button>
          )
        })}
        {mode === "main" && (
          <div className="col-span-3 flex justify-center pt-1">
            <button
              className="text-xs text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground transition"
              onClick={() => setError("Astuce : 4 chiffres minimum")}
            >
              <Fingerprint className="h-3.5 w-3.5" /> Code oublié ?
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
