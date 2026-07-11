"use client"

import Link from "next/link"
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
  Sparkles
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
]

const library = [
  { name: "Competitor Intelligence", href: "/competitor-intelligence", icon: LineChart },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const NavGroup = ({ title, items }: { title: string, items: typeof workflow }) => (
    <div className="mb-6">
      <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <nav className="space-y-0.5 px-2">
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
                  "mr-3 h-4 w-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Podcast AI
          </h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <NavGroup title="Workflow" items={workflow} />
        <NavGroup title="Production" items={production} />
        <NavGroup title="Library & Settings" items={library} />
      </div>
    </div>
  )
}

