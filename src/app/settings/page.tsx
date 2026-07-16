"use client"

import { useState, useEffect } from "react"
import { Settings, User, Database, ArrowLeft, CheckCircle2, AlertTriangle, Trash2, Save } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"

type Tab = 'overview' | 'profile' | 'data'

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  // Profile State
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would hit an API. For now, we mock success.
    showNotification("Profile updated successfully!", "success")
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to delete all saved research and history? This cannot be undone.")) {
      // Clear non-auth keys
      const keysToKeep = ["skilizee_user", "skilizee_sso"]
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })
      showNotification("All saved data and history cleared.", "success")
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium z-50 animate-in slide-in-from-top-4 ${
          notification.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {activeTab !== 'overview' && (
              <button 
                onClick={() => setActiveTab('overview')}
                className="p-1.5 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                title="Back to Settings"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            {!activeTab || activeTab === 'overview' ? (
              <Settings className="h-7 w-7 text-primary" />
            ) : activeTab === 'profile' ? (
              <User className="h-7 w-7 text-primary" />
            ) : (
              <Database className="h-7 w-7 text-primary" />
            )}
            {activeTab === 'overview' ? 'Settings' : 
             activeTab === 'profile' ? 'Profile Settings' : 'Data Management'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {activeTab === 'overview' && "Manage your account and workspace preferences."}
            {activeTab === 'profile' && "Update your personal information and roles."}
            {activeTab === 'data' && "Export or permanently delete your local workspace data."}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-4xl">
          <div 
            onClick={() => setActiveTab('profile')}
            className="group p-6 rounded-2xl border border-border/50 bg-card shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Profile</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Update your personal information, name, and account email.</p>
          </div>

          <div 
            onClick={() => setActiveTab('data')}
            className="group p-6 rounded-2xl border border-border/50 bg-card shadow-sm cursor-pointer hover:shadow-md hover:border-rose-500/30 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Database className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Data Management</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Export workspaces or delete your saved browser research data.</p>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-card rounded-2xl border border-border/50 shadow-sm p-6 lg:p-8">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-muted/50 text-muted-foreground outline-none cursor-not-allowed"
                  placeholder="john@example.com"
                />
                <p className="text-xs text-muted-foreground">Email addresses cannot be changed directly.</p>
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">Account Role</label>
                <div className="flex gap-2">
                  {user?.roles?.map(role => (
                    <span key={role} className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full capitalize">
                      {role}
                    </span>
                  ))}
                  {user?.isAdmin && (
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-600 text-xs font-medium rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50 flex justify-end">
              <button 
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <div className="max-w-2xl bg-card rounded-2xl border border-border/50 shadow-sm p-6 lg:p-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Clear Workspace Data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                This will permanently delete all locally cached scripts, video history, and research data from your browser. Your login session will remain active.
              </p>
              <button 
                onClick={handleClearData}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Local Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
