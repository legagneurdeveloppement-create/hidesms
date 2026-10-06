"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { useConversations, useDeleteConversation, usePatchConversation } from "@/hooks/use-data"
import type { ConversationDTO } from "@/lib/messages"
import { Avatar } from "./Avatar"
import { formatListPreview } from "@/lib/messages"
import { cn } from "@/lib/utils"
import { Search, PencilLine, Lock, MoreVertical, Pin, BellOff, Archive, Trash2, EyeOff, Eye, Sun, Moon, LogOut, Lock as LockIcon, FolderLock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewConversation } from "./NewConversation"
import { NotificationIcon } from "./NotificationIcon"

interface Props {
  scope: "public" | "vault"
}

export function ConversationList({ scope }: Props) {
  const setView = useApp((s) => s.setView)
  const openChat = useApp((s) => s.openChat)
  const theme = useApp((s) => s.theme)
  const lockEverything = useApp((s) => s.lockEverything)
  const [q, setQ] = useState("")
  const [composing, setComposing] = useState(false)
  const convs = useConversations(scope, q)
  const patchConv = usePatchConversation()
  const deleteConv = useDeleteConversation()

  const totalUnread =
    convs?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-fuchsia-600 grid place-items-center shadow-sm">
              <LockIcon className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {scope === "vault" ? "Coffre secret" : "Messages"}
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {convs
                  ? `${convs.length} conversation${convs.length > 1 ? "s" : ""}${
                      totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread > 1 ? "s" : ""}` : ""
                    }`
                  : "Chargement…"}
              </p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                <FolderLock className="h-2.5 w-2.5" />
                Dossier privé
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label="Verrouiller"
              onClick={lockEverything}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Menu"
                  className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setView("settings")}>
                  <PencilLine className="mr-2 h-4 w-4" /> Paramètres
                </DropdownMenuItem>
                {scope === "public" && (
                  <DropdownMenuItem onClick={() => setView("vault-lock")}>
                    <Lock className="mr-2 h-4 w-4" /> Coffre secret
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    const next = theme === "dark" ? "light" : "dark"
                    useApp.getState().setTheme(next)
                    import("@/lib/local-db").then(({ setSetting }) =>
                      setSetting("theme", next)
                    )
                  }}
                >
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  Thème {theme === "dark" ? "clair" : "sombre"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une conversation"
            className="w-full h-10 rounded-xl bg-muted/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/50 transition"
          />
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        {!convs && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {convs && convs.length === 0 && (
          <div className="h-full grid place-items-center px-8 text-center">
            <div>
              <div className="text-5xl mb-3">{scope === "vault" ? "🔐" : "💬"}</div>
              <p className="font-medium text-foreground">
                {scope === "vault" ? "Coffre vide" : "Aucune conversation"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {scope === "vault"
                  ? "Masquez une conversation pour la retrouver ici."
                  : "Démarrez une nouvelle conversation."}
              </p>
            </div>
          </div>
        )}

        <ul className="divide-y divide-border/50">
          {convs?.map((c) => (
            <ConversationRow
              key={c.id}
              conv={c}
              onOpen={() => openChat(c.id, scope === "vault")}
              onPatch={(patch) => patchConv.mutate({ id: c.id, patch })}
              onDelete={() => deleteConv.mutate(c.id)}
              scope={scope}
            />
          ))}
        </ul>
        {/* Bottom spacer so the FAB never overlaps the last conversation. */}
        <div className={scope === "public" ? "h-32" : "h-8"} />
      </div>

      {/* FAB + new conversation */}
      {scope === "public" && (
        <>
          <button
            onClick={() => setComposing(true)}
            aria-label="Nouvelle conversation"
            className="absolute bottom-6 right-6 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-items-center hover:scale-105 active:scale-95 transition z-20"
          >
            <PencilLine className="h-6 w-6" />
          </button>
          {composing && (
            <NewConversation
              onClose={() => setComposing(false)}
              onCreated={(c) => {
                setComposing(false)
                openChat(c.id, false)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

function ConversationRow({
  conv,
  onOpen,
  onPatch,
  onDelete,
  scope,
}: {
  conv: ConversationDTO
  onOpen: () => void
  onPatch: (patch: Partial<{ isPinned: boolean; isMuted: boolean; isArchived: boolean; isHidden: boolean }>) => void
  onDelete: () => void
  scope: "public" | "vault"
}) {
  const unread = conv.unreadCount ?? 0
  const last = conv.lastMessage

  return (
    <li className="group relative">
      <button
        onClick={onOpen}
        className={cn(
          "w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition relative",
          conv.isPinned && "bg-muted/30"
        )}
      >
        <div className="relative">
          <Avatar name={conv.contact.name} color={conv.contact.color} avatarUrl={conv.contact.avatarUrl} size="md" />
          {conv.isMuted && (
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-muted grid place-items-center border-2 border-background">
              <BellOff className="h-2.5 w-2.5 text-muted-foreground" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {conv.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
              <span className="font-semibold truncate text-foreground">{conv.contact.name}</span>
            </div>
            <span className={cn("text-xs shrink-0", unread > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
              {last ? formatListPreview(last.createdAt) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={cn("text-sm truncate", unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
              {last ? (
                <>
                  {last.direction === "sent" && <span className="opacity-70">Vous : </span>}
                  {last.body}
                </>
              ) : (
                <span className="italic opacity-60">Aucun message</span>
              )}
            </p>
            {unread > 0 && (
              <span
                className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-primary/15 text-primary"
                title={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}
                aria-label={`${unread} message non lu`}
              >
                <NotificationIcon icon={conv.contact.notificationIcon} className="h-3.5 w-3.5" filled />
                {unread > 1 && (
                  <span className="text-[10px] font-bold leading-none">{unread > 9 ? "9+" : unread}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 grid place-items-center rounded-full hover:bg-background text-muted-foreground"
              aria-label="Actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onPatch({ isPinned: !conv.isPinned })}>
              <Pin className="mr-2 h-4 w-4" /> {conv.isPinned ? "Désépingler" : "Épingler"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPatch({ isMuted: !conv.isMuted })}>
              <BellOff className="mr-2 h-4 w-4" /> {conv.isMuted ? "Réactiver notifs" : "Mettre en sourdine"}
            </DropdownMenuItem>
            {scope === "public" ? (
              <DropdownMenuItem onClick={() => onPatch({ isHidden: true })}>
                <EyeOff className="mr-2 h-4 w-4" /> Masquer (coffre)
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onPatch({ isHidden: false })}>
                <Eye className="mr-2 h-4 w-4" /> Afficher dans Messages
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onPatch({ isArchived: !conv.isArchived })}>
              <Archive className="mr-2 h-4 w-4" /> {conv.isArchived ? "Désarchiver" : "Archiver"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
