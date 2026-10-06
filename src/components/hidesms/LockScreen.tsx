"use client"

import { useEffect, useState } from "react"
import { PinPad } from "./PinPad"
import { useApp } from "@/lib/store"
import { useVerifyPin, useSettings, useConversations } from "@/hooks/use-data"
import { NotificationIcon } from "./NotificationIcon"
import * as localDb from "@/lib/local-db"

// First-run onboarding: choose a 4-digit main PIN.
function Onboarding() {
  const [pin, setPin] = useState("")
  const [step, setStep] = useState<"choose" | "confirm">("choose")
  const [err, setErr] = useState<string | null>(null)
  const setHasPin = useApp((s) => s.setHasPin)
  const setLocked = useApp((s) => s.setLocked)
  const setView = useApp((s) => s.setView)

  const submitChoose = (val: string) => {
    if (val.length < 4) {
      setErr("4 chiffres minimum")
      setPin("")
      return
    }
    setPin(val)
    setStep("confirm")
    setErr(null)
  }

  const submitConfirm = async (val: string) => {
    if (val !== pin) {
      setErr("Les codes ne correspondent pas")
      return
    }
    try {
      const hash = await localDb.hashPin(pin)
      await localDb.setSetting("pin_hash", hash)
      setHasPin(true)
      setLocked(false)
      setView("list")
    } catch (e) {
      console.error("[LockScreen] PIN persist failed:", e)
      setErr("Erreur, réessayez")
    }
  }

  return (
    <PinPad
      key={step}
      length={4}
      title={step === "choose" ? "Créez votre code" : "Confirmez le code"}
      subtitle={
        step === "choose"
          ? "Ce code protège l'accès à votre messagerie."
          : "Ressaisissez le même code pour valider."
      }
      errorText={err ?? undefined}
      onUnlock={async (val) => {
        if (step === "choose") submitChoose(val)
        else await submitConfirm(val)
      }}
    />
  )
}

// Discreet unread strip rendered above the PIN pad. Shows the per-contact
// notification icons for conversations with unread messages — intentionally
// NOT messaging icons, so a glance does not reveal a private message arrived.
export function UnreadIconStrip({ scope }: { scope: "public" | "vault" }) {
  const convs = useConversations(scope)
  const unread = (convs ?? []).filter((c) => (c.unreadCount ?? 0) > 0)
  if (unread.length === 0) return null

  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 backdrop-blur max-w-[18rem]"
      aria-label={`${unread.length} expéditeur${unread.length > 1 ? "s" : ""} avec messages non lus`}
    >
      {unread.slice(0, 6).map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary"
          title="Message non lu"
        >
          <NotificationIcon icon={c.contact.notificationIcon} className="h-3.5 w-3.5" filled />
        </span>
      ))}
      {unread.length > 6 && (
        <span className="text-[10px] text-muted-foreground font-medium ml-0.5">
          +{unread.length - 6}
        </span>
      )}
    </div>
  )
}

// Returning user lock: verify PIN against /api/lock
function VerifyLock() {
  const verify = useVerifyPin()
  const setLocked = useApp((s) => s.setLocked)
  const setView = useApp((s) => s.setView)

  return (
    <PinPad
      length={4}
      title="Entrez votre code"
      subtitle="Déverrouillez votre messagerie privée."
      topSlot={<UnreadIconStrip scope="public" />}
      onUnlock={async (pin) => {
        await verify.mutateAsync({ pin })
        setLocked(false)
        setView("list")
      }}
    />
  )
}

export function LockScreen() {
  const localHasPin = useApp((s) => s.hasPin)
  const settings = useSettings() // useLiveQuery -> value | undefined
  // IndexedDB is authoritative once loaded; before that we rely on the value
  // persisted in localStorage by the store.
  const effectiveHasPin = settings ? settings.hasPin : localHasPin

  // Sync the client store with IndexedDB (external store setState, which does
  // not trigger the React cascading-render lint rule).
  useEffect(() => {
    if (settings && settings.hasPin !== localHasPin) {
      useApp.setState({ hasPin: settings.hasPin })
    }
  }, [settings, localHasPin])

  if (!settings) {
    return (
      <div className="h-full w-full grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!effectiveHasPin) return <Onboarding />
  return <VerifyLock />
}
