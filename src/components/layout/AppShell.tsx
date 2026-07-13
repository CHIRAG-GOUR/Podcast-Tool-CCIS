"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Login from "@/components/Login";
import AccessDenied from "@/components/AccessDenied";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const MusicIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.54a29 29 0 0 0 .46 5.12 2.78 2.78 0 0 0 1.95 1.96C5.12 19.08 12 19.08 12 19.08s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 11.54a29 29 0 0 0-.46-5.12z"></path>
    <polygon points="9.75 15.02 15.5 11.54 9.75 8.06 9.75 15.02"></polygon>
  </svg>
);

const MicIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

interface SocialIconProps {
  color: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
}

function SocialIcon({ color, icon: Icon, label, onClick }: SocialIconProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-9 h-9 rounded-xl ${color} text-white flex items-center justify-center shadow-md hover:scale-115 hover:rotate-3 transition-all cursor-pointer border-0`}
    >
      <Icon className="w-4.5 h-4.5 shrink-0" />
    </button>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading, hasAccess } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-pulse">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <p className="text-sm text-slate-400 font-semibold animate-pulse font-sans">Loading Podcast Studio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="relative min-h-screen">
      {/* Right Floating Social Pill */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3.5 bg-white/80 backdrop-blur-md border border-slate-200/55 p-3 rounded-l-2xl shadow-xl">
        <SocialIcon color="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600" icon={InstagramIcon} label="Instagram" onClick={() => {
          const url = process.env.NEXT_PUBLIC_SOCIAL_MEDIA_URL || "https://social-media-tool-three.vercel.app";
          window.location.href = `${url}?tab=analytics`;
        }} />
        <SocialIcon color="bg-black" icon={MusicIcon} label="TikTok" onClick={() => {
          const url = process.env.NEXT_PUBLIC_SOCIAL_MEDIA_URL || "https://social-media-tool-three.vercel.app";
          window.location.href = `${url}?tab=analytics`;
        }} />
        <SocialIcon color="bg-[#0077b5]" icon={LinkedinIcon} label="LinkedIn" onClick={() => {
          const url = process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://linkedin-tool-one.vercel.app";
          window.location.href = url;
        }} />
        <SocialIcon color="bg-[#ff0000]" icon={YoutubeIcon} label="YouTube" onClick={() => {
          const url = process.env.NEXT_PUBLIC_SOCIAL_MEDIA_URL || "https://social-media-tool-three.vercel.app";
          window.location.href = `${url}?tab=analytics`;
        }} />
        <SocialIcon color="bg-indigo-600" icon={MicIcon} label="Podcast Studio" onClick={() => {}} />
      </div>

      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}
