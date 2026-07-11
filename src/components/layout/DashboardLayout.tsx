"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import React from "react"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-16 shrink-0 relative z-50">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/20">
        <div className="container mx-auto px-6 py-8 h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
