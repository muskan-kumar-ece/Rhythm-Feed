import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Music2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

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
      await login(username.trim().toLowerCase(), password);
      setLocation("/");
    } catch (e: any) {
      setError(e.message ?? "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-pink-500/8 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <RythamLogo size="xl" animate />
          <p className="text-white/40 text-sm text-center">Sign in to continue listening</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Error banner */}
          {error && (
            <div
              data-testid="login-error"
              className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
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
            <label className="text-white/50 text-xs uppercase tracking-wide">Password</label>
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
            className={cn(
              "w-full py-3.5 rounded-full font-bold text-sm text-white transition-all mt-2",
              "bg-gradient-to-r from-violet-600 to-pink-600",
              "hover:opacity-90 active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
          </button>
        </form>

        {/* Divider + signup link */}
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

        {/* Demo hint */}
        <div className="mt-6 p-3 rounded-xl bg-white/4 border border-white/8 text-center">
          <p className="text-white/30 text-xs">
            <span className="text-white/50 font-medium">Demo account:</span>{" "}
            username <span className="text-white/50">vibescroller</span> · password <span className="text-white/50">demo1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
