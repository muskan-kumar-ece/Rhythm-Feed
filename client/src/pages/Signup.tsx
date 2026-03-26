import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

type PwStrength = { label: string; color: string; bars: number };

function passwordStrength(pw: string): PwStrength {
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak",   color: "bg-red-500",    bars: 1 };
  if (score === 2) return { label: "Fair",   color: "bg-yellow-500", bars: 2 };
  if (score === 3) return { label: "Good",   color: "bg-blue-500",   bars: 3 };
  return              { label: "Strong", color: "bg-green-500",  bars: 4 };
}

function Field({
  label, id, type = "text", value, onChange, placeholder, autoComplete, children, error,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  autoComplete?: string; children?: React.ReactNode; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-white/50 text-xs uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          id={id}
          data-testid={`input-${id}`}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:bg-white/8 transition-colors",
            error ? "border-red-500/50 focus:border-red-500/70" : "border-white/10 focus:border-primary/60"
          )}
        />
        {children}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const [, setLocation] = useLocation();

  const [displayName, setDisplayName] = useState("");
  const [username,    setUsername]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pw = passwordStrength(password);

  const clearError = (field: string) => {
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    setGlobalError(null);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!displayName.trim())            errs.displayName = "Display name is required.";
    if (!username.trim())               errs.username    = "Username is required.";
    else if (username.trim().length < 2) errs.username   = "At least 2 characters.";
    else if (!/^[a-z0-9_]+$/i.test(username.trim())) errs.username = "Letters, numbers, underscores only.";
    if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (!password)                      errs.password    = "Password is required.";
    else if (password.length < 6)       errs.password    = "At least 6 characters.";
    if (password !== confirm)           errs.confirm     = "Passwords don't match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setGlobalError(null);
    setLoading(true);
    try {
      const user = await signup(
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        password,
        displayName.trim(),
      );
      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "artist") setLocation("/artist/dashboard");
      else setLocation("/");
    } catch (e: any) {
      setGlobalError(e.message ?? "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-5 py-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-primary/8 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-56 h-56 rounded-full bg-pink-500/8 blur-[70px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <RythamLogo size="xl" animate />
          <p className="text-white/40 text-sm text-center">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          {globalError && (
            <div
              data-testid="signup-error"
              className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {globalError}
            </div>
          )}

          {/* Display name */}
          <Field
            label="Display Name" id="displayName" value={displayName}
            onChange={v => { setDisplayName(v); clearError("displayName"); }}
            placeholder="Your Name" error={fieldErrors.displayName}
          />

          {/* Username */}
          <Field
            label="Username" id="username" value={username}
            autoComplete="username"
            onChange={v => { setUsername(v); clearError("username"); }}
            placeholder="your_username" error={fieldErrors.username}
          />

          {/* Email */}
          <Field
            label="Email (optional)" id="email" type="email" value={email}
            autoComplete="email"
            onChange={v => { setEmail(v); clearError("email"); }}
            placeholder="you@example.com" error={fieldErrors.email}
          />

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-white/50 text-xs uppercase tracking-wide">Password</label>
            <div className="relative">
              <input
                id="password"
                data-testid="input-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError("password"); }}
                placeholder="••••••••"
                className={cn(
                  "w-full bg-white/5 border rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:bg-white/8 transition-colors",
                  fieldErrors.password ? "border-red-500/50" : "border-white/10 focus:border-primary/60"
                )}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-400 text-xs">{fieldErrors.password}</p>}

            {/* Strength meter */}
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors",
                      i <= pw.bars ? pw.color : "bg-white/10")} />
                  ))}
                </div>
                <span className="text-xs text-white/40">{pw.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-white/50 text-xs uppercase tracking-wide">Confirm Password</label>
            <div className="relative">
              <input
                id="confirm"
                data-testid="input-confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); clearError("confirm"); }}
                placeholder="••••••••"
                className={cn(
                  "w-full bg-white/5 border rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:bg-white/8 transition-colors",
                  fieldErrors.confirm ? "border-red-500/50" : "border-white/10 focus:border-primary/60"
                )}
              />
              {confirm.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {confirm === password
                    ? <Check size={16} className="text-green-400" />
                    : <X size={16} className="text-red-400" />}
                </span>
              )}
            </div>
            {fieldErrors.confirm && <p className="text-red-400 text-xs">{fieldErrors.confirm}</p>}
          </div>

          {/* Submit */}
          <button
            data-testid="btn-signup"
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
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : "Create Account"}
          </button>
        </form>

        {/* Login link */}
        <div className="mt-7 text-center">
          <span className="text-white/30 text-sm">Already have an account? </span>
          <button
            data-testid="link-login"
            onClick={() => setLocation("/login")}
            className="text-primary text-sm font-semibold hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
