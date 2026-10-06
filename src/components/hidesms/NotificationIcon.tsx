"use client"

import {
  Circle,
  Star,
  Leaf,
  Droplet,
  Zap,
  Feather,
  Moon,
  Gem,
  Sparkles,
  Heart,
  Snowflake,
  Flame,
  Cloud,
  Anchor,
  Award,
  Flag,
  type LucideIcon,
} from "lucide-react"
import { isNotificationIcon } from "@/lib/messages"
import { cn } from "@/lib/utils"

// Map of discreet notification icon keys -> lucide components.
// NOTE: deliberately no messaging icons (no MessageCircle, Mail, Send, etc.).
const ICONS: Record<string, LucideIcon> = {
  circle: Circle,
  star: Star,
  leaf: Leaf,
  droplet: Droplet,
  zap: Zap,
  feather: Feather,
  moon: Moon,
  gem: Gem,
  sparkles: Sparkles,
  heart: Heart,
  snowflake: Snowflake,
  flame: Flame,
  cloud: Cloud,
  anchor: Anchor,
  award: Award,
  flag: Flag,
}

interface Props {
  icon: string
  className?: string
  // When true, Circle renders as a filled dot (the default discreet indicator).
  filled?: boolean
}

export function NotificationIcon({ icon, className, filled }: Props) {
  const Icon = ICONS[isNotificationIcon(icon) ? icon : "circle"]
  // For "circle", rendering filled gives a discreet dot; other icons render as-is.
  if (icon === "circle" && filled) {
    return <Circle className={cn("fill-current", className)} />
  }
  return <Icon className={className} />
}
