"use client"

import { cn } from "@/lib/utils"
import { avatarGradient, initials } from "@/lib/messages"

interface AvatarProps {
  name: string
  color?: string
  avatarUrl?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizes: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
}

export function Avatar({ name, color = "violet", avatarUrl, size = "md", className }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", sizes[size], className)}
      />
    )
  }
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br grid place-items-center font-semibold text-white shrink-0 shadow-sm",
        avatarGradient(color),
        sizes[size],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
