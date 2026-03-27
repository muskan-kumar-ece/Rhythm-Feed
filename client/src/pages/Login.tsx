import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, X, KeyRound, CheckCircle2, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

// ── Forgot Password Modal ─────────────────────────────────────────────────────

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [username,    setUsername]    = useState("");
  const [resetToken,  setResetToken]  = useState("");
  const [pastedToken, setPastedToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError("Enter your username"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(username.trim().toLowerCase());
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setStep("reset");
      } else {
        // Username not found but we don't reveal that — just move on gracefully
        setError("No account found for that username.");
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    const token = pastedToken.trim() || resetToken;
    if (!token) { setError("Paste your reset token"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setStep("done");
    } catch (err: any) {
      setError(err.message ?? "Invalid or expired token. Try requesting a new one.");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(resetToken).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <KeyRound size={14} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Reset Password</h2>
              <p className="text-[10px] text-white/40">
                {step === "request" && "Step 1 of 2 — Enter username"}
                {step === "reset"   && "Step 2 of 2 — Set new password"}
                {step === "done"    && "All done!"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Step 1: Enter username */}
        {step === "request" && (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-[10px] uppercase tracking-wide">Username</label>
              <input
                data-testid="input-forgot-username"
                type="text"
                autoCapitalize="none"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(null); }}
                placeholder="your_username"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <button
              data-testid="btn-forgot-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Generating token…</> : "Get Reset Token"}
            </button>
          </form>
        )}

        {/* Step 2: Set new password */}
        {step === "reset" && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            {/* Token display (demo mode — in prod this would be emailed) */}
            {resetToken && (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3">
                <p className="text-[10px] text-primary/70 uppercase tracking-wider font-semibold mb-1.5">Your Reset Token (demo — normally emailed)</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[11px] text-white/80 font-mono break-all leading-relaxed">{resetToken}</p>
                  <button
                    type="button"
                    onClick={copyToken}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center"
                  >
                    {tokenCopied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} className="text-primary" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-[10px] uppercase tracking-wide">Paste Token</label>
              <input
                data-testid="input-reset-token"
                type="text"
                value={pastedToken || resetToken}
                onChange={e => { setPastedToken(e.target.value); setError(null); }}
                placeholder="Paste reset token here"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-[10px] uppercase tracking-wide">New Password</label>
              <div className="relative">
                <input
                  data-testid="input-reset-password"
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setError(null); }}
                  placeholder="Min. 6 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={cn("flex-1 h-0.5 rounded-full transition-colors",
                      newPassword.length >= i * 2 ? (newPassword.length >= 8 ? "bg-green-400" : "bg-yellow-400") : "bg-white/10"
                    )} />
                  ))}
                </div>
              )}
            </div>

            <button
              data-testid="btn-reset-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : "Set New Password"}
            </button>
          </form>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">Password Updated!</p>
              <p className="text-white/40 text-sm mt-1">You can now log in with your new password.</p>
            </div>
            <button
              data-testid="btn-forgot-done"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [username,        setUsername]        = useState("");
  const [password,        setPassword]        = useState("");
  const [showPw,          setShowPw]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const validate = (): string | null => {
    if (!username.trim())           return "Username is required.";
    if (username.trim().length < 2) return "Username must be at least 2 characters.";
    if (!password)                  return "Password is required.";
    if (password.length < 6)        return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    try {
      const user = await login(username.trim().toLowerCase(), password);
      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "artist") setLocation("/artist/dashboard");
      else setLocation("/");
    } catch (e: any) {
      setError(e.message ?? "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}

      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-5 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-pink-500/8 blur-[80px] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <RythamLogo size="xl" animate />
            <p className="text-white/40 text-sm text-center">Sign in to continue listening</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {error && (
              <div data-testid="login-error" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-xs uppercase tracking-wide">Username</label>
              <input
                data-testid="input-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(null); }}
                placeholder="your_username"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 focus:bg-white/8 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-white/50 text-xs uppercase tracking-wide">Password</label>
                <button
                  type="button"
                  data-testid="link-forgot-password"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-primary/70 hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  data-testid="input-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 focus:bg-white/8 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              data-testid="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary mt-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-8 text-center">
            <span className="text-white/30 text-sm">Don't have an account? </span>
            <button
              data-testid="link-signup"
              onClick={() => setLocation("/signup")}
              className="text-primary text-sm font-semibold hover:underline"
            >
              Sign up free
            </button>
          </div>

          {/* Demo accounts */}
          <div className="mt-6 p-3 rounded-xl bg-white/4 border border-white/8 space-y-1.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold text-center mb-2">Demo Accounts · password: demo1234</p>
            {[
              { label: "Listener", username: "vibescroller", color: "text-blue-400" },
              { label: "Artist",   username: "demoartist",   color: "text-primary" },
              { label: "Admin",    username: "demoadmin",    color: "text-amber-400" },
            ].map(({ label, username: u, color }) => (
              <button
                key={u}
                type="button"
                data-testid={`demo-login-${label.toLowerCase()}`}
                onClick={() => { setUsername(u); setPassword("demo1234"); setError(null); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
                <span className="text-white/40 text-[11px] font-mono">{u}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
