"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Search,
  BookOpen,
  Library,
  LineChart,
  PenTool,
  Share2,
  History,
  Settings,
  Sparkles,
  Video
} from "lucide-react"

const workflow = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Discover Topics", href: "/topic-discovery", icon: Sparkles },
  { name: "Deep Research", href: "/research", icon: Search },
]

const production = [
  { name: "Topic Library", href: "/topic-library", icon: Library },
  { name: "Script Generator", href: "/script-generator", icon: PenTool },
  { name: "Publishing Assets", href: "/publishing-assets", icon: Share2 },
  { name: "Video Studio", href: "/video-studio", icon: Video },
]

const library = [
  { name: "Competitor Intelligence", href: "/competitor-intelligence", icon: LineChart },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState(false)

  const NavGroup = ({ title, items }: { title: string, items: typeof workflow }) => (
    <div className="mb-6">
      <h3 className={cn(
        "px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 transition-opacity duration-200",
        isHovered ? "opacity-100" : "opacity-0 invisible h-0 mb-0"
      )}>
        {title}
      </h3>
      <nav className="space-y-1 px-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/') && item.href !== '/'
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  isHovered ? "mr-3" : "mx-auto"
                )}
                aria-hidden="true"
              />
              <span className={cn(
                "transition-all duration-300 overflow-hidden whitespace-nowrap",
                isHovered ? "opacity-100 max-w-full" : "opacity-0 max-w-0 hidden"
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r border-border/50 bg-background/95 backdrop-blur-xl absolute left-0 top-0 bottom-0 z-50 transition-all duration-300 overflow-hidden",
        isHovered ? "w-64 shadow-2xl" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn("flex h-16 items-center mb-4 transition-all", isHovered ? "px-6" : "justify-center")}>
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className={cn(
            "text-xl font-semibold tracking-tight text-foreground transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0 w-0"
          )}>
            Podcast AI
          </h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">
        <NavGroup title="Workflow" items={workflow} />
        <NavGroup title="Production" items={production} />
        <NavGroup title="Library & Settings" items={library} />
      </div>
    </div>
  )
}

