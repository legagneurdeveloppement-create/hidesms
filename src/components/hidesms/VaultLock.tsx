"use client"

import { useState } from "react"
import { PinPad } from "./PinPad"
import { useVerifyPin, useSettings } from "@/hooks/use-data"
import { useApp } from "@/lib/store"
import { UnreadIconStrip } from "./LockScreen"
import * as localDb from "@/lib/local-db"

// Vault onboarding (first time): create the vault PIN.
function VaultOnboarding() {
  const [pin, setPin] = useState("")
  const [step, setStep] = useState<"choose" | "confirm">("choose")
  const [err, setErr] = useState<string | null>(null)
  const setVaultUnlocked = useApp((s) => s.setVaultUnlocked)
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
      await localDb.setSetting("vault_pin_hash", hash)
      setVaultUnlocked(true)
      setView("vault-list")
    } catch (e) {
      console.error("[VaultLock] vault PIN persist failed:", e)
      setErr("Erreur, réessayez")
    }
  }

  return (
    <PinPad
      key={step}
      length={4}
      title={step === "choose" ? "Créez le code du coffre" : "Confirmez le code"}
      subtitle={
        step === "choose"
          ? "Ce code protège les conversations masquées."
          : "Ressaisissez le même code pour valider."
      }
      errorText={err ?? undefined}
      showBack
      onBack={() => setView("list")}
      onUnlock={async (val) => {
        if (step === "choose") submitChoose(val)
        else await submitConfirm(val)
      }}
    />
  )
}

// Vault verify (returning user): check the vault PIN.
function VaultVerify() {
  const verify = useVerifyPin()
  const setVaultUnlocked = useApp((s) => s.setVaultUnlocked)
  const setView = useApp((s) => s.setView)

  return (
    <PinPad
      length={4}
      title="Code du coffre"
      subtitle="Saisissez le code secret pour afficher les conversations masquées."
      showBack
      onBack={() => setView("list")}
      topSlot={<UnreadIconStrip scope="vault" />}
      onUnlock={async (pin) => {
        await verify.mutateAsync({ pin, mode: "vault" })
        setVaultUnlocked(true)
        setView("vault-list")
      }}
    />
  )
}

export function VaultLock() {
  const settings = useSettings()
  // If the vault PIN hasn't been created yet, show onboarding; otherwise verify.
  if (!settings) {
    return (
      <div className="h-full w-full grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!settings.vaultPinSet) return <VaultOnboarding />
  return <VaultVerify />
}
