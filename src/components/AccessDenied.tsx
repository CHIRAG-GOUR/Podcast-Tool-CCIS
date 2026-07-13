/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDenied() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8] px-4 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-slate-300/30 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-100 p-8 md:p-10 relative z-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-[1.5rem] bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Access Denied</h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-black">
            Podcast Studio Permission Required
          </p>
        </div>

        <p className="text-sm text-slate-500 font-semibold leading-relaxed">
          Hello <span className="text-[#0B192C] font-black">{user?.name || user?.email}</span>. Your account does not have authorization to access the Podcast Production Suite. Please contact an administrator to update your roles.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => {
              const url = process.env.NEXT_PUBLIC_SOCIAL_MEDIA_URL || "https://social-media-tool-three.vercel.app";
              window.location.href = url;
            }}
            className="w-full py-3.5 rounded-2xl bg-[#0B192C] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Director Suite
          </button>

          <button
            onClick={logout}
            className="w-full py-3.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase tracking-wider transition-all cursor-pointer bg-white"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
