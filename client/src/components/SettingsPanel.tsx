import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  X, Lock, LogOut, ChevronRight, Eye, EyeOff,
  Check, AlertCircle, ShieldCheck, User, Mail, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Password strength meter ──────────────────────────────────────────────────

type Strength = { label: string; color: string; bars: number };

function pwStrength(pw: string): Strength {
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

// ─── ChangePasswordForm ───────────────────────────────────────────────────────

function ChangePasswordForm({ onBack }: { onBack: () => void }) {
  const [current,  setCurrent]  = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);
  const { toast } = useToast();
  const strength = pwStrength(newPw);

  const validate = (): string | null => {
    if (!current)          return "Current password is required.";
    if (!newPw)            return "New password is required.";
    if (newPw.length < 6)  return "New password must be at least 6 characters.";
    if (newPw === current)  return "New password must be different from your current one.";
    if (newPw !== confirm)  return "Passwords don't match.";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    try {
      await api.changePassword(current, newPw);
      setSuccess(true);
      toast({ description: "Password updated successfully." });
    } catch (e: any) {
      setError(e.message ?? "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <ShieldCheck size={32} className="text-green-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Password Changed</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          Your password has been updated. You'll stay signed in on this device.
        </p>
        <button
          data-testid="btn-done-change-password"
          onClick={onBack}
          className="mt-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-4 pt-2 pb-6">
      <p className="text-white/40 text-xs leading-relaxed">
        Enter your current password to confirm your identity, then choose a new password.
      </p>

      {/* Error banner */}
      {error && (
        <div
          data-testid="change-password-error"
          className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Current password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs uppercase tracking-wide">Current Password</label>
        <div className="relative">
          <input
            data-testid="input-current-password"
            type={showCur ? "text" : "password"}
            autoComplete="current-password"
            value={current}
            onChange={e => { setCurrent(e.target.value); setError(null); }}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
          />
          <button type="button" onClick={() => setShowCur(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors">
            {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* New password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs uppercase tracking-wide">New Password</label>
        <div className="relative">
          <input
            data-testid="input-new-password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            value={newPw}
            onChange={e => { setNewPw(e.target.value); setError(null); }}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
          />
          <button type="button" onClick={() => setShowNew(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {newPw.length > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300",
                  i <= strength.bars ? strength.color : "bg-white/10")} />
              ))}
            </div>
            <span className="text-xs text-white/40 w-12 text-right">{strength.label}</span>
          </div>
        )}
      </div>

      {/* Confirm new password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs uppercase tracking-wide">Confirm New Password</label>
        <div className="relative">
          <input
            data-testid="input-confirm-new-password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(null); }}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
          />
          {confirm.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {confirm === newPw
                ? <Check size={16} className="text-green-400" />
                : <X    size={16} className="text-red-400" />}
            </span>
          )}
        </div>
      </div>

      <button
        data-testid="btn-change-password-submit"
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update Password"}
      </button>
    </form>
  );
}

// ─── LogoutConfirm dialog ─────────────────────────────────────────────────────

function LogoutConfirm({
  onConfirm, onCancel, loading,
}: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-xs bg-[#111118] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
          <LogOut size={22} className="text-red-400" />
        </div>
        <h3 className="text-white font-bold text-center text-base mb-1">Sign Out?</h3>
        <p className="text-white/40 text-sm text-center mb-6 leading-relaxed">
          You'll be redirected to the login screen. Your progress and preferences are saved.
        </p>
        <div className="flex gap-3">
          <button
            data-testid="btn-logout-cancel"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-white/8 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/12 transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="btn-logout-confirm"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-red-500/90 text-white text-sm font-bold hover:bg-red-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            {loading ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main SettingsPanel ───────────────────────────────────────────────────────

type Screen = "home" | "change-password";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [screen,          setScreen]          = useState<Screen>("home");
  const [showLogoutConfirm, setShowLogout]    = useState(false);
  const [logoutLoading,   setLogoutLoading]   = useState(false);

  const { state, logout } = useAuth();
  const qc                = useQueryClient();
  const [, setLocation]   = useLocation();
  const { toast }         = useToast();

  const authUser = state.status === "authenticated" ? state.user : null;

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      // 1. Call the backend to clear the httpOnly cookie
      await logout();
      // 2. Wipe every cached query so stale user-data can't leak
      qc.clear();
      // 3. Close the panel
      onClose();
      // 4. Show confirmation toast
      toast({ description: "You've been signed out." });
      // 5. Redirect to login — wouter navigates without a full reload
      setLocation("/login");
    } catch {
      toast({ description: "Sign-out failed. Please try again.", variant: "destructive" });
    } finally {
      setLogoutLoading(false);
      setShowLogout(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl bg-[#0d0d14] border-t border-white/8 shadow-2xl"
        style={{ animation: "slide-up 0.25s cubic-bezier(0.4,0,0.2,1)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
          {screen === "change-password" ? (
            <button
              onClick={() => setScreen("home")}
              className="flex items-center gap-1.5 text-white/60 text-sm hover:text-white/90 transition-colors"
            >
              <ChevronRight size={16} className="rotate-180" />
              Back
            </button>
          ) : (
            <h2 className="text-white font-bold text-base">Account Settings</h2>
          )}
          {screen === "change-password" && (
            <h2 className="text-white font-semibold text-sm absolute left-1/2 -translate-x-1/2">
              Change Password
            </h2>
          )}
          <button
            onClick={onClose}
            data-testid="btn-close-settings"
            className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <X size={16} className="text-white/60" />
          </button>
        </div>

        {/* Content */}
        {screen === "home" ? (
          <div className="py-3 pb-8">
            {/* Account info */}
            {authUser && (
              <div className="px-4 py-3 mx-4 mb-3 rounded-xl bg-white/4 border border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{authUser.displayName}</p>
                    <p className="text-white/40 text-xs">@{authUser.username}</p>
                    {authUser.email && (
                      <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
                        <Mail size={10} />
                        {authUser.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Menu items */}
            <div className="px-4 flex flex-col gap-1">
              {/* Change password */}
              <button
                data-testid="btn-open-change-password"
                onClick={() => setScreen("change-password")}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/12 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                  <Lock size={16} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Change Password</p>
                  <p className="text-white/35 text-xs mt-0.5">Update your login credentials</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>

              {/* Sign out */}
              <button
                data-testid="btn-open-logout-confirm"
                onClick={() => setShowLogout(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/6 hover:bg-red-500/12 border border-red-500/15 hover:border-red-500/25 transition-colors text-left mt-1"
              >
                <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                  <LogOut size={16} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-red-400 text-sm font-semibold">Sign Out</p>
                  <p className="text-white/30 text-xs mt-0.5">Clear session and return to login</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <ChangePasswordForm onBack={() => setScreen("home")} />
        )}
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <LogoutConfirm
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
          loading={logoutLoading}
        />
      )}
    </>
  );
}
