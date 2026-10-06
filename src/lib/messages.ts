// Shared types and helpers for HideSMS

export type Direction = "sent" | "received"
export type MessageStatus = "sending" | "sent" | "delivered" | "read"

export interface ContactDTO {
  id: string
  name: string
  phone: string
  avatarUrl: string | null
  color: string
  notificationIcon: string
  createdAt: string
}

export interface ConversationDTO {
  id: string
  contactId: string
  contact: ContactDTO
  isHidden: boolean
  isPinned: boolean
  isMuted: boolean
  isArchived: boolean
  lastMessageAt: string
  createdAt: string
  lastMessage?: MessageDTO | null
  unreadCount?: number
}

export interface MessageDTO {
  id: string
  conversationId: string
  body: string
  direction: Direction
  status: MessageStatus
  createdAt: string
  readAt: string | null
}

// Avatar gradient palette. Keys map to tailwind gradient classes.
export const AVATAR_COLORS: Record<string, string> = {
  violet: "from-violet-500 to-purple-600",
  rose: "from-rose-500 to-pink-600",
  amber: "from-amber-500 to-orange-600",
  emerald: "from-emerald-500 to-teal-600",
  sky: "from-sky-500 to-cyan-600",
  fuchsia: "from-fuchsia-500 to-pink-600",
  lime: "from-lime-500 to-green-600",
  red: "from-red-500 to-rose-600",
  indigo: "from-indigo-500 to-blue-600",
  cyan: "from-cyan-500 to-sky-600",
}

export const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS)

export function avatarGradient(color: string): string {
  return AVATAR_COLORS[color] ?? AVATAR_COLORS.violet
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function formatRelativeDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Aujourd'hui"
  if (diffDays === 1) return "Hier"
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" })
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatListPreview(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Hier"
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" })
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" })
}

// Simple non-cryptographic PIN hashing. For a demo-only local app this is fine.
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(`hidesms::${pin}`)
  const buf = await crypto.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function sanitizePin(pin: string): string {
  return pin.replace(/\D/g, "").slice(0, 8)
}

// ── Discreet notification icons ─────────────────────────────────────────────
//
// Per-contact "you received a message from this number" indicator.
// Intentionally NOT messaging icons (no bubble, envelope, chat, mail, send).
// These look like innocuous system icons so a glance at the screen does not
// reveal that a private message arrived.
export const NOTIFICATION_ICONS = [
  { key: "circle", label: "Point" },
  { key: "star", label: "Étoile" },
  { key: "leaf", label: "Feuille" },
  { key: "droplet", label: "Goutte" },
  { key: "zap", label: "Éclair" },
  { key: "feather", label: "Plume" },
  { key: "moon", label: "Lune" },
  { key: "gem", label: "Gemme" },
  { key: "sparkles", label: "Étincelles" },
  { key: "heart", label: "Cœur" },
  { key: "snowflake", label: "Flocon" },
  { key: "flame", label: "Flamme" },
  { key: "cloud", label: "Nuage" },
  { key: "anchor", label: "Ancre" },
  { key: "award", label: "Médaille" },
  { key: "flag", label: "Drapeau" },
] as const

export type NotificationIconKey = (typeof NOTIFICATION_ICONS)[number]["key"]

export const NOTIFICATION_ICON_KEYS = NOTIFICATION_ICONS.map((i) => i.key)

export function isNotificationIcon(key: string): boolean {
  return NOTIFICATION_ICON_KEYS.includes(key as NotificationIconKey)
}

export function notificationIconLabel(key: string): string {
  return NOTIFICATION_ICONS.find((i) => i.key === key)?.label ?? "Point"
}
