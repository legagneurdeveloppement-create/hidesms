"use client"

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

let browserClient: QueryClient | null = null
function getClient() {
  if (isServer) return makeQueryClient()
  if (!browserClient) browserClient = makeQueryClient()
  return browserClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const client = getClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
