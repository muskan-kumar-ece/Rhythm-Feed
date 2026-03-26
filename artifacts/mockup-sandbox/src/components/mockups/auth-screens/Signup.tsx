import { User, Mail, Lock, ArrowRight, CheckCircle } from "lucide-react";

export function Signup() {
  return (
    <div className="min-h-screen bg-[#08080e] flex flex-col p-6 font-['Inter']">
      <div className="w-full flex justify-between items-center text-white/40 text-[11px] pt-2 pb-6">
        <span>9:41</span>
        <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#a855f7] text-xs font-bold uppercase tracking-wider mb-2">Create Account</p>
        <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">Join Rytham,<br/>discover your sound</h1>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1.5 mb-6">
        {[1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i === 1 ? "bg-[#a855f7]" : "bg-white/15"}`} />
        ))}
      </div>
      <p className="text-white/30 text-xs mb-6">Step 1 of 3 — Your details</p>

      {/* Form fields */}
      <div className="flex flex-col gap-4 flex-1">
        <Field icon={<User size={16} />} label="Full Name" placeholder="Alex Johnson" />
        <Field icon={<Mail size={16} />} label="Email" placeholder="alex@example.com" type="email" />
        <Field icon={<Lock size={16} />} label="Password" placeholder="Min 8 characters" type="password" />

        {/* Password strength */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Password strength</p>
          <div className="flex gap-1">
            {["bg-red-500","bg-orange-500","bg-green-500"].map((c,i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < 2 ? c : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-[10px] text-orange-400">Fair — add a symbol to strengthen</p>
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/50 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle size={12} className="text-[#a855f7]" />
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            I agree to the <span className="text-[#a855f7]">Terms of Service</span> and <span className="text-[#a855f7]">Privacy Policy</span>
          </p>
        </div>

        <button className="w-full bg-[#a855f7] text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] mt-2">
          Continue <ArrowRight size={18} />
        </button>
      </div>

      <p className="text-white/30 text-sm text-center mt-5 mb-2">
        Already a member? <span className="text-[#a855f7] font-semibold">Sign in</span>
      </p>

      <div className="w-full bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed mt-3">
        <span className="text-[#a855f7] font-bold">UX:</span> 3-step progress bar gives users a sense of completion. Inline password strength gives instant feedback. Terms checkbox is prominent — no hidden agreement. CTA = "Continue" not "Sign up" (lower commitment).
      </div>
    </div>
  );
}

function Field({ icon, label, placeholder, type = "text" }: { icon: React.ReactNode; label: string; placeholder: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{label}</label>
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 flex items-center gap-3">
        <span className="text-white/30">{icon}</span>
        <span className="text-sm text-white/30">{type === "password" ? "••••••••••" : placeholder}</span>
      </div>
    </div>
  );
}
