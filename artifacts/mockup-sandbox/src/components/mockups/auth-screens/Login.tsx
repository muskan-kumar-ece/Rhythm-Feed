import { Eye, EyeOff, Music2, ArrowRight, Apple } from "lucide-react";
import { useState } from "react";

export function Login() {
  const [show, setShow] = useState(false);
  return (
    <div className="h-screen bg-[#08080e] flex flex-col font-['Inter'] overflow-hidden">

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Status bar */}
        <div className="flex justify-between items-center text-white/40 text-[11px] pt-3 pb-4">
          <span>9:41</span>
          <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
        </div>

        {/* Logo + headline */}
        <div className="flex flex-col items-center gap-3 mt-2 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Music2 size={30} className="text-[#a855f7]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rytham</h1>
          <p className="text-white/40 text-sm text-center">Music that feels like you</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Email</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/40">
              <span>you@example.com</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Password</label>
              <span className="text-xs text-[#a855f7] font-medium">Forgot?</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/40 flex items-center justify-between">
              <span>{show ? "mypassword123" : "••••••••••••"}</span>
              <button onClick={() => setShow(s => !s)} className="text-white/30">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Primary CTA */}
          <button className="w-full bg-[#a855f7] text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] mt-1 active:scale-[0.98] transition-all">
            Sign In <ArrowRight size={18} />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social auth */}
          <div className="flex gap-3">
            <button className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white/70 font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white/70 font-medium">
              <Apple size={18} className="text-white" />
              Apple
            </button>
          </div>

          <p className="text-white/30 text-sm text-center">
            No account? <span className="text-[#a855f7] font-semibold">Sign up free</span>
          </p>

          {/* UX Annotation */}
          <div className="w-full bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed">
            <span className="text-[#a855f7] font-bold">UX:</span> Single-purpose screen — email + password + 2 social options. "Forgot?" inline = 1 tap. Neon CTA = highest visual weight. No logo clutter.
          </div>
        </div>
      </div>
    </div>
  );
}
