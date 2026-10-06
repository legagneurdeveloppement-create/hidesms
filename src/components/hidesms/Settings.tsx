"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { useSettings, useUpdateSetting, useStorage, useSecureErase } from "@/hooks/use-data"
import { ArrowLeft, Shield, Lock, EyeOff, Palette, KeyRound, Trash2, Sun, Moon, Info, FolderLock, HardDrive, FileLock2, Eraser, CheckCircle2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function Settings() {
  const setView = useApp((s) => s.setView)
  const theme = useApp((s) => s.theme)
  const setTheme = useApp((s) => s.setTheme)
  const fakeCoverEnabled = useApp((s) => s.fakeCoverEnabled)
  const setFakeCoverEnabled = useApp((s) => s.setFakeCoverEnabled)
  const lockEverything = useApp((s) => s.lockEverything)
  const updateSetting = useUpdateSetting()
  const settings = useSettings()

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    updateSetting.mutate({ key: "theme", value: next })
  }

  const toggleFakeCover = (v: boolean) => {
    setFakeCoverEnabled(v)
    updateSetting.mutate({ key: "fakeCover", value: v })
    if (v) toast.success("Écran factice activé", { description: "Maintenez « = » sur la calculatrice pour ouvrir l'app." })
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-3 py-2.5 border-b border-border/60 bg-background/85 backdrop-blur sticky top-0 z-10 flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-lg">Paramètres</h1>
      </header>

      <div className="flex-1 overflow-y-auto thin-scroll px-4 py-4 space-y-6">
        {/* Confidentialité */}
        <Section title="Confidentialité" icon={Shield}>
          <Row
            icon={Lock}
            label="Code de verrouillage"
            hint="Protéger l'accès à la messagerie"
            value={<span className="text-xs text-emerald-500 font-medium">Activé</span>}
          />
          <PinEditor />
          <VaultPinEditor vaultPinSet={settings?.vaultPinSet ?? false} />
          <Row
            icon={EyeOff}
            label="Écran factice (calculatrice)"
            hint="Afficher une fausse calculatrice au démarrage"
            value={<Switch checked={fakeCoverEnabled} onCheckedChange={toggleFakeCover} />}
          />
          <Row
            icon={theme === "dark" ? Moon : Sun}
            label="Thème"
            hint={theme === "dark" ? "Sombre" : "Clair"}
            value={<Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />}
          />
        </Section>

        {/* Apparence */}
        <Section title="Apparence" icon={Palette}>
          <div className="px-4 py-3">
            <p className="text-sm text-muted-foreground mb-3">Couleur d'accent</p>
            <AccentPicker />
          </div>
        </Section>

        {/* Stockage privé */}
        <StorageSection />

        {/* Données */}
        <Section title="Données" icon={Info}>
          <Row
            icon={Lock}
            label="Verrouiller maintenant"
            hint="Revenir à l'écran de verrouillage"
            onClick={() => lockEverything()}
          />
          <Row
            icon={Trash2}
            label="Réinitialiser l'application"
            hint="Efface tout et régénère les données démo"
            destructive
            onClick={() => {
              import("@/hooks/use-data").then(({ seedDemoData }) => {
                seedDemoData(true).then(() => window.location.reload())
              })
            }}
          />
        </Section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          HideSMS · démo Next.js · v1.0
        </p>
        <div className="h-4" />
      </div>
    </div>
  )
}

function StorageSection() {
  const storage = useStorage()
  const erase = useSecureErase()
  const [confirming, setConfirming] = useState(false)

  const s = storage ?? undefined
  const loading = !s

  return (
    <Section title="Stockage privé" icon={FolderLock}>
      {/* Info banner explaining the private folder */}
      <div className="px-4 py-3.5 bg-gradient-to-br from-primary/10 to-fuchsia-500/5">
        <div className="flex items-start gap-2.5">
          <FileLock2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">
              Dossier privé isolé
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Vos messages sont stockés dans un dossier dédié, distinct du dossier
              de messagerie par défaut de l'appareil. Rien n'apparaît dans l'app
              SMS système.
            </p>
          </div>
        </div>
      </div>

      {/* Folder path */}
      <div className="px-4 py-3 flex items-center gap-3">
        <FolderLock className="h-4.5 w-4.5 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Emplacement du stockage</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {loading ? "…" : s.displayFolder}
          </p>
        </div>
      </div>

      {/* Storage stats */}
      <div className="px-4 py-3 flex items-center gap-3">
        <HardDrive className="h-4.5 w-4.5 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Taille du dossier</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "…" : s.sizeHuman}
          </p>
        </div>
      </div>

      {/* Content counts */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Conversations" value={loading ? "—" : String(s.conversations)} />
          <Stat label="Messages" value={loading ? "—" : String(s.messages)} />
          <Stat label="Contacts" value={loading ? "—" : String(s.contacts)} />
        </div>
        {s && s.hiddenConversations > 0 && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            dont {s.hiddenConversations} dans le coffre secret
          </p>
        )}
      </div>

      {/* Protection status */}
      <div className="px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {loading ? "…" : s.pinProtected ? "Protégé par code PIN" : "Non protégé"}
          </p>
          <p className="text-xs text-muted-foreground">
            Le dossier privé est chiffré par votre code de verrouillage.
          </p>
        </div>
      </div>

      {/* Secure erase */}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition"
        >
          <Eraser className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Effacement sécurisé du dossier
            </p>
            <p className="text-xs text-muted-foreground">
              Vide toutes les conversations (le code PIN est conservé)
            </p>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </button>
      ) : (
        <div className="px-4 py-3.5 bg-amber-500/5">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
            Effacer le dossier privé ?
          </p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Toutes les conversations et messages seront supprimés du dossier
            privé et purgés (VACUUM). Cette action est irréversible. Votre code
            PIN et vos réglages sont conservés.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={erase.isPending}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                erase.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Dossier privé effacé", {
                      description: "Toutes les conversations ont été supprimées.",
                    })
                    setConfirming(false)
                  },
                  onError: () =>
                    toast.error("Échec de l'effacement", {
                      description: "Réessayez dans un instant.",
                    }),
                })
              }}
              disabled={erase.isPending}
              className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {erase.isPending ? "Effacement…" : "Effacer"}
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 py-2.5">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/50 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  hint,
  value,
  onClick,
  destructive,
}: {
  icon: React.ElementType
  label: string
  hint?: string
  value?: React.ReactNode
  onClick?: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !value}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition",
        onClick && "hover:bg-muted/50",
        destructive && "text-destructive"
      )}
    >
      <Icon className={cn("h-4.5 w-4.5 shrink-0", destructive ? "text-destructive" : "text-primary")} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", destructive ? "text-destructive" : "text-foreground")}>{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {value}
    </button>
  )
}

function PinEditor() {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition">
          <KeyRound className="h-4.5 w-4.5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Changer le code</p>
            <p className="text-xs text-muted-foreground">Modifier votre code de verrouillage</p>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </button>
      </AlertDialogTrigger>
      <PinChangeDialog onClose={() => setOpen(false)} mode="main" />
    </AlertDialog>
  )
}

function VaultPinEditor({ vaultPinSet }: { vaultPinSet: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition">
          <Shield className="h-4.5 w-4.5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Code du coffre secret</p>
            <p className="text-xs text-muted-foreground">
              {vaultPinSet ? "Activé — conversations masquées protégées" : "Non défini — touchez pour activer"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </button>
      </AlertDialogTrigger>
      <PinChangeDialog onClose={() => setOpen(false)} mode="vault" />
    </AlertDialog>
  )
}

function PinChangeDialog({ onClose, mode }: { onClose: () => void; mode: "main" | "vault" }) {
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [step, setStep] = useState<"new" | "confirm">("new")
  const [err, setErr] = useState<string | null>(null)
  const updateSetting = useUpdateSetting()

  const submit = () => {
    if (pin.length < 4) {
      setErr("4 chiffres minimum")
      setPin("")
      return
    }
    if (step === "new") {
      setStep("confirm")
      setErr(null)
      setConfirm("")
      return
    }
    if (pin !== confirm) {
      setErr("Les codes ne correspondent pas")
      setConfirm("")
      return
    }
    updateSetting.mutate(
      { key: mode === "vault" ? "vaultPin" : "pin", value: pin },
      {
        onSuccess: () => {
          toast.success(mode === "vault" ? "Code du coffre mis à jour" : "Code mis à jour")
          onClose()
        },
        onError: () => setErr("Erreur, réessayez"),
      }
    )
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {mode === "vault" ? "Code du coffre secret" : "Changer le code de verrouillage"}
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            {step === "new" ? "Saisissez votre nouveau code à 4 chiffres." : "Confirmez le code saisi."}
            {err && <p className="text-destructive text-sm mt-2">{err}</p>}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex justify-center gap-3 my-2">
        {Array.from({ length: 4 }).map((_, i) => {
          const val = step === "new" ? pin : confirm
          return (
            <input
              key={i}
              autoFocus={i === 0}
              inputMode="numeric"
              maxLength={1}
              value={val[i] ?? ""}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 1)
                const cur = step === "new" ? pin : confirm
                const next = (cur.slice(0, i) + d + cur.slice(i + 1)).slice(0, 4)
                if (step === "new") setPin(next)
                else setConfirm(next)
                // focus next
                if (d) {
                  const el = e.target.nextElementSibling as HTMLInputElement | null
                  el?.focus()
                }
              }}
              className="h-12 w-12 text-center text-xl font-semibold rounded-xl bg-muted outline-none focus:ring-2 ring-primary"
            />
          )
        })}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Annuler</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault()
            submit()
          }}
          disabled={updateSetting.isPending || (step === "new" ? pin.length < 4 : confirm.length < 4)}
        >
          {step === "new" ? "Continuer" : "Enregistrer"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

function AccentPicker() {
  const accents = [
    { name: "Violet", from: "from-violet-500", to: "to-purple-600" },
    { name: "Rose", from: "from-rose-500", to: "to-pink-600" },
    { name: "Émeraude", from: "from-emerald-500", to: "to-teal-600" },
    { name: "Ambre", from: "from-amber-500", to: "to-orange-600" },
    { name: "Fuchsia", from: "from-fuchsia-500", to: "to-pink-600" },
    { name: "Cyan", from: "from-cyan-500", to: "to-sky-600" },
  ]
  return (
    <div className="flex flex-wrap gap-2.5">
      {accents.map((a) => (
        <button
          key={a.name}
          title={a.name}
          className={cn("h-9 w-9 rounded-full bg-gradient-to-br transition", a.from, a.to, "ring-2 ring-offset-2 ring-offset-card ring-transparent hover:ring-foreground/30")}
        />
      ))}
      <span className="text-xs text-muted-foreground self-center ml-1">Bientôt disponible</span>
    </div>
  )
}
