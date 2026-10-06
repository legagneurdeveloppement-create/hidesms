"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// Global UI / session state for the HideSMS shell.
// Persisted pieces (locked state, PIN presence, theme preference) survive reloads.

export type ScreenView =
  | "lock" // main PIN lock screen
  | "reveal-pin" // fake cover dismissed -> show the PIN pad (still locked)
  | "list" // conversations list
  | "chat" // active conversation
  | "settings"
  | "vault-lock" // vault PIN entry
  | "vault-list" // hidden conversations list
  | "vault-chat"
  | "new-conversation"
  | "fake-cover" // decoy screen (calculator)

interface AppState {
  // session
  hasPin: boolean
  isLocked: boolean
  fakeCoverEnabled: boolean
  // navigation
  view: ScreenView
  activeConversationId: string | null
  // vault
  vaultUnlocked: boolean
  // theme
  theme: "light" | "dark"

  setHasPin: (v: boolean) => void
  setLocked: (v: boolean) => void
  setFakeCoverEnabled: (v: boolean) => void
  setView: (v: ScreenView) => void
  openChat: (id: string, vault?: boolean) => void
  backToList: () => void
  setVaultUnlocked: (v: boolean) => void
  setTheme: (t: "light" | "dark") => void
  lockEverything: () => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hasPin: false,
      isLocked: true,
      fakeCoverEnabled: false,
      view: "lock",
      activeConversationId: null,
      vaultUnlocked: false,
      theme: "dark",

      setHasPin: (v) => set({ hasPin: v }),
      setLocked: (v) => set({ isLocked: v }),
      setFakeCoverEnabled: (v) => set({ fakeCoverEnabled: v }),
      setView: (v) => set({ view: v }),
      openChat: (id, vault = false) =>
        set({
          activeConversationId: id,
          view: vault ? "vault-chat" : "chat",
        }),
      backToList: () => {
        const inVault = get().view === "vault-chat"
        set({
          activeConversationId: null,
          view: inVault ? "vault-list" : "list",
        })
      },
      setVaultUnlocked: (v) => set({ vaultUnlocked: v }),
      setTheme: (t) => set({ theme: t }),
      lockEverything: () =>
        set({
          isLocked: true,
          vaultUnlocked: false,
          view: "lock",
          activeConversationId: null,
        }),
    }),
    {
      name: "hidesms-app",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        hasPin: s.hasPin,
        fakeCoverEnabled: s.fakeCoverEnabled,
        theme: s.theme,
        // isLocked is intentionally NOT persisted: the app always starts
        // locked (isLocked defaults to true) so every page load requires
        // the PIN — matching the private-messaging-app behavior.
      }),
    }
  )
)

// Expose for debugging in the browser console.
if (typeof window !== "undefined") {
  ;(window as unknown as { __hidesms: typeof useApp }).__hidesms = useApp
}
