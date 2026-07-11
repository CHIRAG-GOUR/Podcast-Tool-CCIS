"use client"

import { Settings, User, Database, Key } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-500" />
          Settings
        </h2>
        <p className="text-muted-foreground mt-2">
          Manage your account, API keys, and workspace preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border bg-card shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
          <User className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Profile</h3>
          <p className="text-sm text-muted-foreground">Update your personal information and password.</p>
        </div>
        <div className="p-6 rounded-xl border bg-card shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
          <Key className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold mb-1">API Keys</h3>
          <p className="text-sm text-muted-foreground">Manage your Gemini and Firebase integration keys.</p>
        </div>
        <div className="p-6 rounded-xl border bg-card shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
          <Database className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Data Management</h3>
          <p className="text-sm text-muted-foreground">Export or delete your saved research data.</p>
        </div>
      </div>
    </div>
  )
}
