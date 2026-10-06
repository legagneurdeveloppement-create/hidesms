"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as localDb from "@/lib/local-db"
import type { ConversationDTO, MessageDTO } from "@/lib/messages"

// ── Live queries (Dexie) — reactive, no polling, no server ──────────────────

export function useSettings() {
  return useLiveQuery(async () => {
    const map = await localDb.getAllSettings()
    return {
      hasPin: Boolean(map["pin_hash"]),
      vaultPinSet: Boolean(map["vault_pin_hash"]),
      fakeCoverEnabled: map["fake_cover"] === "1",
      theme: (map["theme"] as "light" | "dark") || "dark",
    }
  }, [])
}

export function useConversations(scope: "public" | "vault" | "all" = "public", q?: string) {
  return useLiveQuery(async () => {
    const list = await localDb.listConversations(scope)
    if (!q) return list
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(needle) ||
        c.contact.phone.includes(needle) ||
        (c.lastMessage?.body ?? "").toLowerCase().includes(needle)
    )
  }, [scope, q], [] as ConversationDTO[])
}

export function useMessages(convId: string | null) {
  return useLiveQuery(
    async () => (convId ? localDb.listMessages(convId) : ([] as MessageDTO[])),
    [convId],
    [] as MessageDTO[]
  )
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useSendMessage() {
  return {
    isPending: false,
    mutate: async (
      input: { convId: string; body: string; direction?: "sent" | "received" },
      opts?: { onSuccess?: () => void; onError?: () => void }
    ) => {
      try {
        await localDb.addMessage(input)
        opts?.onSuccess?.()
      } catch (e) {
        console.error("[HideSMS] addMessage failed:", e)
        opts?.onError?.()
      }
    },
  }
}

export function useMarkRead() {
  return {
    mutate: (convId: string) => {
      localDb.markConversationRead(convId).catch(() => {})
    },
  }
}

export function usePatchConversation() {
  return {
    mutate: (input: { id: string; patch: Partial<{ isPinned: boolean; isMuted: boolean; isArchived: boolean; isHidden: boolean; notificationIcon: string }> }) => {
      localDb.patchConversation(input.id, input.patch).catch(() => {})
    },
  }
}

export function useDeleteConversation() {
  return {
    mutate: (id: string) => {
      localDb.deleteConversation(id).catch(() => {})
    },
  }
}

export function useCreateConversation() {
  return {
    isPending: false,
    mutate: (
      input: { name?: string; phone: string; color?: string; notificationIcon?: string; isHidden?: boolean },
      opts?: { onSuccess?: (c: ConversationDTO) => void }
    ) => {
      localDb
        .createConversation(input)
        .then(async (conv) => {
          // Build a DTO to pass to onSuccess
          const list = await localDb.listConversations("all")
          const dto = list.find((c) => c.id === conv.id)
          if (dto && opts?.onSuccess) opts.onSuccess(dto)
        })
        .catch(() => {})
    },
  }
}

// ── Settings mutations ────────────────────────────────────────────────────────

export function useUpdateSetting() {
  return {
    isPending: false,
    mutate: (input: { key: string; value: unknown }) => {
      // Settings are stored as strings in IndexedDB.
      let v: string
      if (input.key === "pin" || input.key === "vaultPin") {
        // Hash the PIN client-side before storing.
        localDb.hashPin(String(input.value)).then((h) =>
          localDb.setSetting(input.key === "vaultPin" ? "vault_pin_hash" : "pin_hash", h)
        )
        return
      }
      if (input.key === "fakeCover") v = input.value ? "1" : "0"
      else if (input.key === "theme") v = input.value === "light" ? "light" : "dark"
      else if (input.key === "clearPin") {
        localDb.deleteSetting("pin_hash"); return
      } else if (input.key === "clearVaultPin") {
        localDb.deleteSetting("vault_pin_hash"); return
      } else return
      localDb.setSetting(input.key === "fakeCover" ? "fake_cover" : input.key, v)
    },
  }
}

export function useVerifyPin() {
  return {
    isPending: false,
    mutateAsync: async ({ pin, mode }: { pin: string; mode?: "vault" }) => {
      const ok = await localDb.verifyPin(pin, mode ?? "main")
      if (!ok) throw new Error(mode === "vault" ? "Code coffre incorrect" : "Code incorrect")
      return { ok: true }
    },
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

export type { localDb as LocalDbNs }
export type StorageStats = localDb.StorageStats

export function useStorage() {
  return useLiveQuery(() => localDb.getStorageStats(), [], undefined as unknown as StorageStats)
}

export function useSecureErase() {
  return {
    isPending: false,
    mutate: (_input: unknown, opts?: { onSuccess?: () => void; onError?: () => void }) => {
      localDb
        .secureErase()
        .then(() => opts?.onSuccess?.())
        .catch(() => opts?.onError?.())
    },
  }
}

// ── Seed ──────────────────────────────────────────────────────────────────────

export function useSeedDemoData() {
  return {
    mutateAsync: async () => localDb.seedDemoData(false),
  }
}

export async function seedDemoData(force = false) {
  return localDb.seedDemoData(force)
}

// Keep the qk export for backwards compatibility (unused now but harmless).
export const qk = {
  settings: ["settings"] as const,
  conversations: (scope: string) => ["conversations", scope] as const,
  messages: (id: string) => ["messages", id] as const,
  storage: ["storage"] as const,
}
