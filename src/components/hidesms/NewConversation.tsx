"use client"

import { useState } from "react"
import { useCreateConversation } from "@/hooks/use-data"
import type { ConversationDTO } from "@/lib/messages"
import { AVATAR_COLOR_KEYS, avatarGradient, NOTIFICATION_ICONS } from "@/lib/messages"
import { cn } from "@/lib/utils"
import { X, UserPlus, Lock, BellRing } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { NotificationIcon } from "./NotificationIcon"

interface Props {
  onClose: () => void
  onCreated: (c: ConversationDTO) => void
  defaultHidden?: boolean
}

export function NewConversation({ onClose, onCreated, defaultHidden = false }: Props) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [color, setColor] = useState(AVATAR_COLOR_KEYS[0])
  const [notifIcon, setNotifIcon] = useState<string>("circle")
  const [hidden, setHidden] = useState(defaultHidden)
  const create = useCreateConversation()

  const submit = () => {
    if (!phone.trim()) return
    create.mutate(
      { name: name.trim(), phone: phone.trim(), color, notificationIcon: notifIcon, isHidden: hidden },
      { onSuccess: onCreated }
    )
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Nouvelle conversation</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-5">
          <div className={cn("h-20 w-20 rounded-full bg-gradient-to-br grid place-items-center text-white text-2xl font-semibold shadow-lg", avatarGradient(color))}>
            {(name.trim()[0] || phone.trim()[0] || "?").toUpperCase()}
          </div>
          <div className="flex gap-2 mt-3">
            {AVATAR_COLOR_KEYS.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 rounded-full bg-gradient-to-br transition",
                  avatarGradient(c),
                  color === c ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110" : "opacity-80 hover:opacity-100"
                )}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground px-1">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Sophie Martin"
              className="mt-1 w-full h-11 rounded-xl bg-muted/60 px-3 text-sm outline-none focus:ring-2 ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground px-1">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              inputMode="tel"
              className="mt-1 w-full h-11 rounded-xl bg-muted/60 px-3 text-sm outline-none focus:ring-2 ring-primary/50"
            />
          </div>

          <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40 cursor-pointer">
            <span className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary" />
              Masquer dans le coffre secret
            </span>
            <Switch checked={hidden} onCheckedChange={setHidden} />
          </label>

          <div className="px-3 py-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-2 mb-2.5">
              <BellRing className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Icône de réception</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
              Icône discrète affichée quand ce numéro vous écrit (jamais une icône de messagerie).
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {NOTIFICATION_ICONS.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setNotifIcon(it.key)}
                  title={it.label}
                  aria-label={it.label}
                  className={cn(
                    "h-8 w-8 rounded-lg grid place-items-center transition",
                    notifIcon === it.key
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-card"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <NotificationIcon icon={it.key} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!phone.trim() || create.isPending}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {create.isPending ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  )
}
