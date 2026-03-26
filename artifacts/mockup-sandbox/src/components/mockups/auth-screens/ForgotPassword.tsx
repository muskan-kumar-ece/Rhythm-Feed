import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";
import { useState } from "react";

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  return (
    <div className="h-screen bg-[#08080e] flex flex-col font-['Inter'] overflow-hidden">

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Status bar */}
        <div className="flex justify-between items-center text-white/40 text-[11px] pt-3 pb-5">
          <span>9:41</span>
          <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
        </div>

        {/* Back */}
        <button className="flex items-center gap-2 text-white/50 text-sm mb-8 w-fit">
          <ArrowLeft size={16} /> Back to login
        </button>

        {!sent ? (
          <>
            {/* Illustration */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 scale-150 rounded-full bg-[#a855f7]/10 blur-2xl" />
                <div className="w-24 h-24 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center relative z-10">
                  <Mail size={40} className="text-[#a855f7]" />
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight text-center mb-2">Reset Password</h1>
            <p className="text-white/40 text-sm text-center mb-8 leading-relaxed">
              Enter your email and we'll send a link to reset your password
            </p>

            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Email Address</label>
              <div className="bg-white/5 border border-[#a855f7]/40 rounded-xl px-4 py-3.5 flex items-center gap-3">
                <Mail size={16} className="text-[#a855f7]" />
                <span className="text-sm text-white/50">alex@example.com</span>
              </div>
            </div>

            <button
              onClick={() => setSent(true)}
              className="w-full bg-[#a855f7] text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] mb-4 active:scale-[0.98] transition-all"
            >
              <Send size={18} /> Send Reset Link
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/25 text-xs">or try</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 text-sm text-white/60 font-medium mb-6">
              Sign in with Google
            </button>

            <div className="w-full bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed">
              <span className="text-[#a855f7] font-bold">UX:</span> Two states — request + confirmation. Countdown on resend prevents anxiety. "Open Mail App" = instant next action. No dead end after submit.
            </div>
          </>
        ) : (
          /* Success state */
          <div className="flex flex-col items-center text-center gap-5 pt-8">
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-full bg-green-500/10 blur-2xl" />
              <div className="w-24 h-24 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center relative z-10">
                <CheckCircle size={40} className="text-green-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                We sent a reset link to<br /><span className="text-white/70">alex@example.com</span>
              </p>
            </div>
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/50">
              Didn't get it? <span className="text-[#a855f7] font-semibold">Resend in 58s</span>
            </div>
            <button className="w-full bg-[#a855f7] text-white font-bold rounded-xl py-4 active:scale-[0.98] transition-all">
              Open Mail App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
