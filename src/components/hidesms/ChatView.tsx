"use client"

import { useEffect, useRef, useState } from "react"
import { useMessages, useSendMessage, useMarkRead, useConversations, usePatchConversation, useDeleteConversation } from "@/hooks/use-data"
import { useApp } from "@/lib/store"
import { Avatar } from "./Avatar"
import { formatTime, formatRelativeDay } from "@/lib/messages"
import { cn } from "@/lib/utils"
import type { MessageDTO } from "@/lib/messages"
import { ArrowLeft, Phone, Video, MoreVertical, Send, Check, CheckCheck, Clock, EyeOff, Eye, BellOff, Pin, Trash2, BellRing } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { NOTIFICATION_ICONS, notificationIconLabel } from "@/lib/messages"
import { NotificationIcon } from "./NotificationIcon"

interface Props {
  vault?: boolean
}

export function ChatView({ vault = false }: Props) {
  const convId = useApp((s) => s.activeConversationId)
  const backToList = useApp((s) => s.backToList)
  const lockEverything = useApp((s) => s.lockEverything)
  const scope = vault ? "vault" : "public"
  const convs = useConversations(scope)
  const conv = convs?.find((c) => c.id === convId)
  const messages = useMessages(convId) // MessageDTO[]
  const send = useSendMessage()
  const { mutate: markRead } = useMarkRead()
  const patchConv = usePatchConversation()
  const deleteConv = useDeleteConversation()

  const [draft, setDraft] = useState("")
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  // Optimistic messages: appear instantly while Dexie persists + refreshes.
  const [optimistic, setOptimistic] = useState<MessageDTO[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Mark read once when opening a conversation (not on every poll) to avoid a
  // feedback loop: markRead -> invalidate messages -> new data -> markRead...
  useEffect(() => {
    if (convId) markRead(convId)
  }, [convId, markRead])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Auto-grow textarea.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }, [draft])

  const handleSend = () => {
    const body = draft.trim()
    if (!body || !convId || send.isPending) return

    // 1) Add the message optimistically to the local UI state so it shows up
    //    INSTANTLY — no waiting on Dexie's live-query refresh.
    const tempId = `tmp-${Date.now()}`
    const optimisticMsg: MessageDTO = {
      id: tempId,
      conversationId: convId,
      body,
      direction: "sent",
      status: "sending",
      createdAt: new Date().toISOString(),
      readAt: null,
    }
    setOptimistic((prev) => [...prev, optimisticMsg])
    setDraft("")

    // 2) Persist to IndexedDB. Once Dexie's live query refreshes `messages`,
    //    the optimistic copy is dropped (see `allMessages` merge below).
    send.mutate(
      { conversationId: convId, body },
      {
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Échec de l'envoi"
          toast.error("Message non envoyé", { description: msg })
          setOptimistic((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: "sent" as const } : m))
          )
        },
      }
    )
  }

  if (!convId) {
    return (
      <div className="h-full grid place-items-center text-muted-foreground">
        Sélectionnez une conversation
      </div>
    )
  }

  // Merge DB messages with optimistic ones (not yet persisted).
  // Drop optimistic copies that are now present in the DB (matched by body+direction).
  const dbBodies = new Set((messages ?? []).map((m) => `${m.direction}|${m.body}|${m.createdAt}`))
  const liveOptimistic = optimistic.filter(
    (o) => !dbBodies.has(`${o.direction}|${o.body}|${o.createdAt}`)
  )
  const allMessages = [...(messages ?? []), ...liveOptimistic]
  // Sort by createdAt so optimistic bubbles land in the right place.
  allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Group messages by day.
  const grouped: { day: string; items: MessageDTO[] }[] = []
  for (const m of allMessages) {
    const day = formatRelativeDay(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) last.items.push(m)
    else grouped.push({ day, items: [m] })
  }

  return (
    <div className="flex flex-col h-full chat-wallpaper">
      {/* Header */}
      <header className="px-3 py-2.5 border-b border-border/60 bg-background/85 backdrop-blur sticky top-0 z-10 flex items-center gap-2">
        <button
          onClick={backToList}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={conv?.contact.name ?? "?"} color={conv?.contact.color} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h2 className="font-semibold truncate text-sm">{conv?.contact.name ?? "…"}</h2>
            {conv?.isPinned && <Pin className="h-3 w-3 text-primary" />}
            {conv?.isMuted && <BellOff className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {conv?.contact.phone ?? "—"}
          </p>
        </div>
        <button
          onClick={() => toastPhone()}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
          aria-label="Appeler"
        >
          <Phone className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={() => toastVideo()}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
          aria-label="Appel vidéo"
        >
          <Video className="h-4.5 w-4.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
              aria-label="Plus"
            >
              <MoreVertical className="h-4.5 w-4.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => conv && patchConv.mutate({ id: conv.id, patch: { isPinned: !conv.isPinned } })}>
              <Pin className="mr-2 h-4 w-4" /> {conv?.isPinned ? "Désépingler" : "Épingler"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => conv && patchConv.mutate({ id: conv.id, patch: { isMuted: !conv.isMuted } })}>
              <BellOff className="mr-2 h-4 w-4" /> {conv?.isMuted ? "Réactiver notifs" : "Sourdine"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIconPickerOpen(true)}>
              <BellRing className="mr-2 h-4 w-4" />
              <span className="flex-1">Icône de réception</span>
              {conv && (
                <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/15 text-primary">
                  <NotificationIcon icon={conv.contact.notificationIcon} className="h-3.5 w-3.5" filled />
                </span>
              )}
            </DropdownMenuItem>
            {vault ? (
              <DropdownMenuItem onClick={() => conv && patchConv.mutate({ id: conv.id, patch: { isHidden: false } }, {
                onSuccess: () => backToList(),
              })}>
                <Eye className="mr-2 h-4 w-4" /> Sortir du coffre
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => conv && patchConv.mutate({ id: conv.id, patch: { isHidden: true } }, {
                onSuccess: () => backToList(),
              })}>
                <EyeOff className="mr-2 h-4 w-4" /> Masquer dans le coffre
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => lockEverything()}>
              Verrouiller maintenant
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (conv) {
                  deleteConv.mutate(conv.id, { onSuccess: () => backToList() })
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer la conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Notification icon picker dialog (per-contact discreet indicator) */}
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <DialogContent className="max-w-[22rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-4.5 w-4.5 text-primary" />
              Icône de réception
            </DialogTitle>
            <DialogDescription>
              Icône discrète affichée quand ce numéro vous écrit. Jamais une
              icône de messagerie — personne ne doit soupçonner un message.
              {conv && (
                <span className="block mt-1 text-foreground">
                  Pour <span className="font-medium">{conv.contact.name}</span> ·{" "}
                  actuelle : {notificationIconLabel(conv.contact.notificationIcon)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-1.5 py-1">
            {NOTIFICATION_ICONS.map((it) => {
              const active = conv?.contact.notificationIcon === it.key
              return (
                <button
                  key={it.key}
                  onClick={() => {
                    if (conv) {
                      patchConv.mutate(
                        { id: conv.id, patch: { notificationIcon: it.key } },
                        { onSuccess: () => setIconPickerOpen(false) }
                      )
                    }
                  }}
                  title={it.label}
                  aria-label={it.label}
                  className={cn(
                    "h-9 w-9 rounded-lg grid place-items-center transition",
                    active
                      ? "bg-primary text-primary-foreground ring-2 ring-primary"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <NotificationIcon icon={it.key} className="h-4.5 w-4.5" filled={it.key === "circle"} />
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll px-3 py-4 space-y-1">
        {!messages && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                <div className="h-12 w-40 rounded-2xl bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {grouped.map((g) => (
          <div key={g.day}>
            <div className="sticky top-1 my-2 flex justify-center">
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/70 backdrop-blur px-2.5 py-0.5 rounded-full">
                {g.day}
              </span>
            </div>
            {g.items.map((m, idx) => {
              const prev = g.items[idx - 1]
              const tight = prev && prev.direction === m.direction && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 60_000
              return <Bubble key={m.id} m={m} grouped={!!tight} />
            })}
          </div>
        ))}

        {messages && messages.length === 0 && liveOptimistic.length === 0 && (
          <div className="h-full grid place-items-center text-center text-muted-foreground">
            <div>
              <div className="text-4xl mb-2">👋</div>
              <p className="text-sm">Démarrez la conversation</p>
            </div>
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-background/85 backdrop-blur px-3 py-2.5 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={1}
          placeholder="Message…"
          className="flex-1 resize-none bg-muted/60 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/50 max-h-30 thin-scroll"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || send.isPending}
          className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition shadow-md shadow-primary/30"
          aria-label="Envoyer"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function Bubble({ m, grouped }: { m: MessageDTO; grouped: boolean }) {
  const sent = m.direction === "sent"
  return (
    <div className={cn("flex items-end gap-1.5", sent ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}>
      <div
        className={cn(
          "max-w-[78%] px-3.5 py-2 text-sm animate-msg-pop",
          sent
            ? "bg-primary text-primary-foreground bubble-out"
            : "bg-card text-card-foreground border border-border/60 bubble-in"
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
        <div className={cn("flex items-center gap-1 justify-end mt-0.5 -mb-0.5", sent ? "text-primary-foreground/70" : "text-muted-foreground")}>
          <span className="text-[10px]">{formatTime(m.createdAt)}</span>
          {sent && (
            m.status === "sending" ? <Clock className="h-3 w-3" /> :
            m.status === "sent" ? <Check className="h-3 w-3" /> :
            m.status === "delivered" ? <CheckCheck className="h-3 w-3" /> :
            <CheckCheck className="h-3 w-3 fill-current" />
          )}
        </div>
      </div>
    </div>
  )
}

function toastPhone() {
  // no-op visual cue; replaced by sonner if needed
  if (typeof window !== "undefined") {
    import("sonner").then(({ toast }) => toast("Appel sortant…", { description: "Fonctionnalité démo" }))
  }
}
function toastVideo() {
  if (typeof window !== "undefined") {
    import("sonner").then(({ toast }) => toast("Appel vidéo…", { description: "Fonctionnalité démo" }))
  }
}
