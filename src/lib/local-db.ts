// Local IndexedDB database for HideSMS — replaces Prisma/SQLite + API routes.
// All data lives on the device (browser IndexedDB in dev, Android WebView in APK).
// No server, no network: truly local & private.

import Dexie, { type Table } from "dexie"
import { AVATAR_COLOR_KEYS, isNotificationIcon } from "@/lib/messages"
import type { ConversationDTO, MessageDTO, ContactDTO } from "@/lib/messages"

// ── Dexie schema ──────────────────────────────────────────────────────────────

export interface ContactRow {
  id: string
  name: string
  phone: string
  avatarUrl: string | null
  color: string
  notificationIcon: string
  createdAt: Date
  updatedAt: Date
}

export interface ConversationRow {
  id: string
  contactId: string
  isHidden: boolean
  isPinned: boolean
  isMuted: boolean
  isArchived: boolean
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface MessageRow {
  id: string
  conversationId: string
  body: string
  direction: "sent" | "received"
  status: "sending" | "sent" | "delivered" | "read"
  createdAt: Date
  readAt: Date | null
}

export interface SettingRow {
  key: string
  value: string
}

class HideSMSDB extends Dexie {
  contacts!: Table<ContactRow, string>
  conversations!: Table<ConversationRow, string>
  messages!: Table<MessageRow, string>
  settings!: Table<SettingRow, string>

  constructor() {
    super("hidesms-private")
    // Minimal, robust schema: only index fields that are guaranteed to be
    // valid Dexie keys (string/number/Date, never null). Booleans and
    // nullable Dates are filtered in JS via .toArray().filter().
    this.version(2).stores({
      contacts: "id",
      conversations: "id, contactId",
      messages: "id, conversationId",
      settings: "key",
    })
    // v1 -> v2 upgrade: clear all data so the old (boolean-indexed) schema is
    // fully replaced. User data is demo-only so this is safe.
    this.version(2).upgrade(async (tx) => {
      await Promise.all([
        tx.table("contacts").clear(),
        tx.table("conversations").clear(),
        tx.table("messages").clear(),
      ])
    })
  }
}

// Singleton (lazily created on the client).
let _db: HideSMSDB | null = null

// One-time migration: if an older schema (v1 with boolean indexes) left the DB
// in a state where v2 can't open it, wipe and recreate. This only runs once
// (flagged in localStorage) so it doesn't nuke user data on every load.
async function ensureFreshSchema() {
  if (typeof window === "undefined") return
  const flag = "hidesms_schema_v2_ok"
  if (localStorage.getItem(flag)) return
  try {
    const dbNames = await indexedDB.databases?.().catch(() => []) ?? []
    if (dbNames.some((d) => d.name === "hidesms-private")) {
      // Try opening with the new schema; if it fails, delete & recreate.
      try {
        const test = new HideSMSDB()
        await test.open()
        await test.close()
      } catch {
        await indexedDB.deleteDatabase("hidesms-private")
      }
    }
    localStorage.setItem(flag, "1")
  } catch {
    localStorage.setItem(flag, "1")
  }
}

function db(): HideSMSDB {
  if (typeof window === "undefined") {
    throw new Error("local-db can only be used in the browser")
  }
  if (!_db) {
    _db = new HideSMSDB()
    // Kick off the schema cleanup in the background; the first query may
    // trigger it implicitly via Dexie's auto-open.
    ensureFreshSchema().catch(() => {})
  }
  return _db
}

// ── ID helpers ────────────────────────────────────────────────────────────────

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db().settings.get(key)
  return row?.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db().settings.put({ key, value })
}

export async function deleteSetting(key: string): Promise<void> {
  await db().settings.delete(key)
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db().settings.toArray()
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

// ── PIN hashing (client-side via crypto.subtle, works in WebView) ─────────────

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(`hidesms::${pin}`)
  const buf = await crypto.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyPin(pin: string, mode: "main" | "vault" = "main"): Promise<boolean> {
  const key = mode === "vault" ? "vault_pin_hash" : "pin_hash"
  const stored = await getSetting(key)
  if (!stored) return false
  return (await hashPin(pin)) === stored
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export async function createContact(input: {
  name: string
  phone: string
  color?: string
  notificationIcon?: string
}): Promise<ContactRow> {
  const now = new Date()
  const color = input.color && AVATAR_COLOR_KEYS.includes(input.color)
    ? input.color
    : AVATAR_COLOR_KEYS[Math.floor(Math.random() * AVATAR_COLOR_KEYS.length)]
  const notificationIcon =
    input.notificationIcon && isNotificationIcon(input.notificationIcon)
      ? input.notificationIcon
      : "circle"
  const contact: ContactRow = {
    id: uid("ct"),
    name: input.name.trim() || input.phone,
    phone: input.phone,
    avatarUrl: null,
    color,
    notificationIcon,
    createdAt: now,
    updatedAt: now,
  }
  await db().contacts.add(contact)
  return contact
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function createConversation(input: {
  name?: string
  phone: string
  color?: string
  notificationIcon?: string
  isHidden?: boolean
}): Promise<ConversationRow> {
  const contact = await createContact({
    name: input.name ?? "",
    phone: input.phone,
    color: input.color,
    notificationIcon: input.notificationIcon,
  })
  const now = new Date()
  const conv: ConversationRow = {
    id: uid("cv"),
    contactId: contact.id,
    isHidden: input.isHidden ?? false,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  }
  await db().conversations.add(conv)
  return conv
}

export async function patchConversation(
  id: string,
  patch: Partial<{
    isPinned: boolean
    isMuted: boolean
    isArchived: boolean
    isHidden: boolean
    notificationIcon: string
  }>
): Promise<void> {
  const conv = await db().conversations.get(id)
  if (!conv) return
  const update: Partial<ConversationRow> = { updatedAt: new Date() }
  if (typeof patch.isPinned === "boolean") update.isPinned = patch.isPinned
  if (typeof patch.isMuted === "boolean") update.isMuted = patch.isMuted
  if (typeof patch.isArchived === "boolean") update.isArchived = patch.isArchived
  if (typeof patch.isHidden === "boolean") update.isHidden = patch.isHidden
  await db().conversations.update(id, update)

  // notificationIcon is a Contact property
  if (patch.notificationIcon && isNotificationIcon(patch.notificationIcon)) {
    await db().contacts.update(conv.contactId, {
      notificationIcon: patch.notificationIcon,
      updatedAt: new Date(),
    })
  }
}

export async function deleteConversation(id: string): Promise<void> {
  await db().transaction("rw", db().conversations, db().messages, async () => {
    await db().messages.where("conversationId").equals(id).delete()
    await db().conversations.delete(id)
  })
  // Also delete orphan contacts (contact with no remaining conversation)
  // Simple approach: leave contacts; they're cheap. Could prune here if desired.
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function addMessage(input: {
  conversationId: string
  body: string
  direction?: "sent" | "received"
}): Promise<MessageRow> {
  const dir = input.direction === "received" ? "received" : "sent"
  const now = new Date()
  const msg: MessageRow = {
    id: uid("msg"),
    conversationId: input.conversationId,
    body: input.body.trim(),
    direction: dir,
    status: dir === "sent" ? "sent" : "read",
    createdAt: now,
    readAt: dir === "received" ? now : null,
  }
  try {
    // Add message first, then update conversation's lastMessageAt separately.
    await db().messages.add(msg)
    await db().conversations.update(input.conversationId, { lastMessageAt: now })
  } catch (e) {
    console.error("[HideSMS] addMessage failed:", e)
    throw e
  }
  return msg
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const unread = await db()
    .messages.where("conversationId").equals(conversationId)
    .filter((m) => m.direction === "received" && m.readAt === null)
    .toArray()
  if (unread.length === 0) return
  const now = new Date()
  await db().transaction("rw", db().messages, async () => {
    for (const m of unread) {
      await db().messages.update(m.id, { readAt: now, status: "read" })
    }
  })
}

// ── DTO mappers ───────────────────────────────────────────────────────────────

async function toConversationDTO(c: ConversationRow): Promise<ConversationDTO> {
  const contact = await db().contacts.get(c.contactId)
  const allMsgs = await db().messages.where("conversationId").equals(c.id).toArray()
  allMsgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const lastMessage = allMsgs[0] ?? null
  const unreadCount = allMsgs.filter((m) => m.direction === "received" && m.readAt === null).length
  return {
    id: c.id,
    contactId: c.contactId,
    contact: contact
      ? {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          avatarUrl: contact.avatarUrl,
          color: contact.color,
          notificationIcon: contact.notificationIcon,
          createdAt: contact.createdAt.toISOString(),
        }
      : {
          id: c.contactId,
          name: "Inconnu",
          phone: "",
          avatarUrl: null,
          color: "violet",
          notificationIcon: "circle",
          createdAt: c.createdAt.toISOString(),
        },
    isHidden: c.isHidden,
    isPinned: c.isPinned,
    isMuted: c.isMuted,
    isArchived: c.isArchived,
    lastMessageAt: c.lastMessageAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    lastMessage: lastMessage ? toMessageDTO(lastMessage) : null,
    unreadCount,
  }
}

export function toMessageDTO(m: MessageRow): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    body: m.body,
    direction: m.direction,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
  }
}

// ── Queries (used by useLiveQuery in hooks) ───────────────────────────────────

export async function listConversations(
  scope: "public" | "vault" | "all"
): Promise<ConversationDTO[]> {
  const all = await db().conversations.toArray()
  let rows: typeof all
  if (scope === "public") {
    rows = all.filter((c) => !c.isHidden && !c.isArchived)
  } else if (scope === "vault") {
    rows = all.filter((c) => c.isHidden)
  } else {
    rows = all
  }
  rows.sort(
    (a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  )
  return Promise.all(rows.map(toConversationDTO))
}

export async function listMessages(conversationId: string): Promise<MessageDTO[]> {
  const rows = await db().messages.where("conversationId").equals(conversationId).toArray()
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return rows.map(toMessageDTO)
}

// ── Storage stats ─────────────────────────────────────────────────────────────

export interface StorageStats {
  displayFolder: string
  sizeHuman: string
  sizeBytes: number
  conversations: number
  hiddenConversations: number
  messages: number
  contacts: number
  pinProtected: boolean
  exists: boolean
}

export async function getStorageStats(): Promise<StorageStats> {
  const [allConversations, messages, contacts, pinRow] = await Promise.all([
    db().conversations.toArray(),
    db().messages.count(),
    db().contacts.count(),
    getSetting("pin_hash"),
  ])
  const conversations = allConversations.length
  const hidden = allConversations.filter((c) => c.isHidden).length

  // Estimate storage size from IndexedDB usage if available.
  let sizeBytes = 0
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate()
      sizeBytes = est.usage ?? 0
    }
  } catch {
    // ignore
  }

  return {
    displayFolder: "Stockage local de l'appareil (IndexedDB)",
    sizeHuman: sizeBytes > 0 ? formatBytes(sizeBytes) : "—",
    sizeBytes,
    conversations,
    hiddenConversations: hidden,
    messages,
    contacts,
    pinProtected: Boolean(pinRow),
    exists: true,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

// ── Secure erase ──────────────────────────────────────────────────────────────

export async function secureErase(): Promise<void> {
  // Delete message content + conversations + contacts, keep PIN/settings.
  await db().transaction("rw", db().messages, db().conversations, db().contacts, async () => {
    await db().messages.clear()
    await db().conversations.clear()
    await db().contacts.clear()
  })
}

// ── Seed (demo data, idempotent) ──────────────────────────────────────────────

export async function seedDemoData(force = false): Promise<{ seeded: boolean; count: number }> {
  const existing = await db().conversations.count()
  if (existing > 0 && !force) {
    return { seeded: false, count: existing }
  }
  if (force) {
    await secureErase()
  }

  const demoContacts = [
    { name: "Sophie Martin", phone: "+33 6 12 45 78 90", color: "rose", notificationIcon: "heart" },
    { name: "Lucas Dubois", phone: "+33 6 23 11 09 87", color: "sky", notificationIcon: "star" },
    { name: "Maman", phone: "+33 6 88 22 14 50", color: "amber", notificationIcon: "leaf" },
    { name: "Jules Lefèvre", phone: "+33 7 81 33 26 41", color: "emerald", notificationIcon: "droplet" },
    { name: "Emma Rousseau", phone: "+33 6 55 67 89 01", color: "fuchsia", notificationIcon: "sparkles" },
    { name: "Tom Bernard", phone: "+33 6 19 28 37 46", color: "cyan", notificationIcon: "moon" },
    { name: "Inès Garnier", phone: "+33 7 70 12 34 56", color: "violet", notificationIcon: "feather" },
    { name: "Numéro inconnu", phone: "+33 9 00 00 00 00", color: "red", notificationIcon: "flag" },
  ]

  const now = Date.now()
  const mins = (n: number) => new Date(now - n * 60_000)
  const hours = (n: number) => new Date(now - n * 3_600_000)
  const days = (n: number) => new Date(now - n * 86_400_000)

  let count = 0
  // Public conversations
  const c0 = await createConversation(demoContacts[0])
  await db().conversations.update(c0.id, { isPinned: true })
  await addMessage({ conversationId: c0.id, body: "Salut ! Tu fais quoi ce soir ?", direction: "received" })
  await db().messages.where("conversationId").equals(c0.id).modify({ createdAt: hours(2) })
  await addMessage({ conversationId: c0.id, body: "Rien de prévu, pourquoi ?", direction: "sent" })
  await addMessage({ conversationId: c0.id, body: "On se fait un resto ?", direction: "received" })
  await db().messages.where("conversationId").equals(c0.id).reverse().modify({ createdAt: mins(3) })
  await addMessage({ conversationId: c0.id, body: "Avec plaisir 😊", direction: "sent" })
  count++

  const c1 = await createConversation(demoContacts[1])
  await addMessage({ conversationId: c1.id, body: "Tu as vu le match hier ?", direction: "received" })
  await db().messages.where("conversationId").equals(c1.id).modify({ createdAt: hours(20) })
  await addMessage({ conversationId: c1.id, body: "Oui, incroyable !", direction: "sent" })
  await addMessage({ conversationId: c1.id, body: "Le but à la 89e minute 🤯", direction: "received" })
  // keep these unread to demonstrate the discreet indicator
  await db().messages.where("conversationId").equals(c1.id).filter((m) => m.direction === "received").modify({ readAt: null })
  count++

  const c2 = await createConversation(demoContacts[2])
  await db().conversations.update(c2.id, { isMuted: true })
  await addMessage({ conversationId: c2.id, body: "N'oublie pas de manger avant de sortir", direction: "received" })
  await db().messages.where("conversationId").equals(c2.id).modify({ createdAt: hours(5) })
  await addMessage({ conversationId: c2.id, body: "Oui maman 😘", direction: "sent" })
  count++

  const c3 = await createConversation(demoContacts[3])
  await addMessage({ conversationId: c3.id, body: "Réunion demain à 10h", direction: "received" })
  await addMessage({ conversationId: c3.id, body: "Noté, merci !", direction: "sent" })
  await db().messages.where("conversationId").equals(c3.id).modify({ createdAt: days(1) })
  count++

  const c4 = await createConversation(demoContacts[4])
  await addMessage({ conversationId: c4.id, body: "Photos envoyées 📷", direction: "received" })
  await addMessage({ conversationId: c4.id, body: "Superbes !", direction: "sent" })
  await db().messages.where("conversationId").equals(c4.id).modify({ createdAt: days(2) })
  count++

  const c5 = await createConversation(demoContacts[5])
  await addMessage({ conversationId: c5.id, body: "Ok pour 18h 👍", direction: "sent" })
  await db().messages.where("conversationId").equals(c5.id).modify({ createdAt: days(3) })
  count++

  const c6 = await createConversation(demoContacts[6])
  await addMessage({ conversationId: c6.id, body: "Bonjour, à quelle heure demain ?", direction: "received" })
  await db().messages.where("conversationId").equals(c6.id).modify({ createdAt: days(5) })
  count++

  // Hidden conversation (vault)
  const c7 = await createConversation({ ...demoContacts[7], isHidden: true })
  await addMessage({ conversationId: c7.id, body: "On se voit où ?", direction: "received" })
  await db().messages.where("conversationId").equals(c7.id).modify({ createdAt: hours(1) })
  await addMessage({ conversationId: c7.id, body: "Place de la République, 21h", direction: "sent" })
  await db().messages.where("conversationId").equals(c7.id).reverse().modify({ createdAt: mins(45) })
  await addMessage({ conversationId: c7.id, body: "Ok, à tout à l'heure.", direction: "received" })
  await db().messages.where("conversationId").equals(c7.id).reverse().modify({ createdAt: mins(40) })
  count++

  return { seeded: true, count }
}
