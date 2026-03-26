import { useState, useEffect, useRef, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, User, Lock, LogOut, Music2, Bell, Smartphone,
  ChevronRight, Eye, EyeOff, Check, X, AlertCircle,
  ShieldCheck, Loader2, BarChart3, Heart, Bookmark, MessageSquare, Clock,
  AtSign, FileText, Image, Volume2, Zap, Radio, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Prefs = {
  autoplay: boolean;
  audioQuality: "low" | "high";
  crossfade: boolean;
  volumeNormalization: boolean;
  dataSaver: boolean;
  pushNotifications: boolean;
  notifyNewSongs: boolean;
  notifyActivity: boolean;
};

const DEFAULT_PREFS: Prefs = {
  autoplay: true, audioQuality: "high",
  crossfade: false, volumeNormalization: true, dataSaver: false,
  pushNotifications: true, notifyNewSongs: true, notifyActivity: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function pwStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-red-500", bars: 1 };
  if (score === 2) return { label: "Fair", color: "bg-yellow-500", bars: 2 };
  if (score === 3) return { label: "Good", color: "bg-blue-500", bars: 3 };
  return { label: "Strong", color: "bg-green-500", bars: 4 };
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled = false, testId,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; testId?: string }) {
  return (
    <button
      data-testid={testId}
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
        checked ? "bg-primary" : "bg-white/15",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200",
        checked ? "translate-x-5" : "translate-x-0",
      )} />
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-4 mb-2">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", color)}>
          <Icon size={13} className="text-white" />
        </div>
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="mx-4 rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden divide-y divide-white/6">
        {children}
      </div>
    </div>
  );
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  icon: Icon, iconColor = "text-white/50", label, sublabel, right, onClick, danger = false, testId,
}: {
  icon?: React.ElementType; iconColor?: string; label: string; sublabel?: string;
  right?: React.ReactNode; onClick?: () => void; danger?: boolean; testId?: string;
}) {
  const cls = cn(
    "flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors",
    onClick && (danger ? "hover:bg-red-500/8 active:bg-red-500/12" : "hover:bg-white/6 active:bg-white/10"),
  );
  const content = (
    <>
      {Icon && (
        <Icon size={17} className={cn("shrink-0", danger ? "text-red-400" : iconColor)} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", danger ? "text-red-400" : "text-white")}>{label}</p>
        {sublabel && <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{sublabel}</p>}
      </div>
      {right !== undefined ? right : onClick && (
        <ChevronRight size={15} className={cn("shrink-0", danger ? "text-red-400/50" : "text-white/25")} />
      )}
    </>
  );
  return onClick
    ? <button data-testid={testId} className={cls} onClick={onClick}>{content}</button>
    : <div className={cls}>{content}</div>;
}

// ─── Inline Field Editor ──────────────────────────────────────────────────────

function InlineField({
  label, value, placeholder, multiline = false, maxLength, onSave, loading, testId,
}: {
  label: string; value: string; placeholder: string; multiline?: boolean;
  maxLength?: number; onSave: (v: string) => Promise<void>; loading: boolean; testId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = async () => {
    if (val.trim() === value) { setEditing(false); return; }
    setSaving(true); setErr(null);
    try {
      await onSave(val.trim());
      setEditing(false);
    } catch (e: any) { setErr(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const cancel = () => { setVal(value); setEditing(false); setErr(null); };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-xs mb-0.5">{label}</p>
          <p className={cn("text-sm", val ? "text-white" : "text-white/25")}>{val || placeholder}</p>
        </div>
        <button
          data-testid={testId ? `btn-edit-${testId}` : undefined}
          onClick={() => setEditing(true)}
          disabled={loading}
          className="text-primary text-xs font-semibold hover:text-primary/80 transition-colors shrink-0"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <p className="text-white/40 text-xs mb-1.5">{label}</p>
      {err && (
        <p className="text-red-400 text-xs mb-1.5 flex items-center gap-1">
          <AlertCircle size={12} /> {err}
        </p>
      )}
      {multiline ? (
        <textarea
          ref={ref as any}
          data-testid={testId}
          value={val}
          onChange={e => setVal(e.target.value)}
          maxLength={maxLength}
          rows={3}
          className="w-full bg-white/8 border border-primary/40 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none resize-none"
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={ref as any}
          data-testid={testId}
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          maxLength={maxLength}
          className="w-full bg-white/8 border border-primary/40 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none"
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
      )}
      {maxLength && (
        <p className="text-white/25 text-xs text-right mt-0.5">{val.length}/{maxLength}</p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={cancel}
          className="flex-1 py-2 rounded-xl bg-white/8 text-white/60 text-xs font-semibold hover:bg-white/12 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Quality Selector ─────────────────────────────────────────────────────────

function QualitySelector({ value, onChange }: {
  value: "low" | "high"; onChange: (v: "low" | "high") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["low", "high"] as const).map(q => (
        <button
          key={q}
          data-testid={`btn-quality-${q}`}
          onClick={() => onChange(q)}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            value === q
              ? "bg-primary text-white"
              : "bg-white/8 text-white/40 hover:bg-white/12",
          )}
        >
          {q === "low" ? "Data Saver" : "High Quality"}
        </button>
      ))}
    </div>
  );
}

// ─── Change Password Form ─────────────────────────────────────────────────────

function ChangePasswordScreen({ onBack }: { onBack: () => void }) {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const strength = pwStrength(newPw);

  const validate = (): string | null => {
    if (!current)         return "Current password is required.";
    if (!newPw)           return "New password is required.";
    if (newPw.length < 6) return "At least 6 characters required.";
    if (newPw === current) return "New password must differ from current.";
    if (newPw !== confirm) return "Passwords don't match.";
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      await api.changePassword(current, newPw);
      setDone(true);
      toast({ description: "Password updated." });
    } catch (e: any) { setError(e.message ?? "Failed to change password."); }
    finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <ShieldCheck size={28} className="text-green-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Password Updated</h3>
        <p className="text-white/40 text-sm">Your password has been changed successfully.</p>
        <button onClick={onBack} className="mt-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold">
          Back to Settings
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <p className="text-white/40 text-sm">Enter your current password to verify, then set a new one.</p>
      {error && (
        <div data-testid="change-password-error" className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {/* Current password */}
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide block mb-1.5">Current Password</label>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60">
            {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      {/* New password */}
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide block mb-1.5">New Password</label>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60">
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {newPw.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= strength.bars ? strength.color : "bg-white/10")} />
              ))}
            </div>
            <span className="text-xs text-white/35">{strength.label}</span>
          </div>
        )}
      </div>
      {/* Confirm */}
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide block mb-1.5">Confirm New Password</label>
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
              {confirm === newPw ? <Check size={15} className="text-green-400" /> : <X size={15} className="text-red-400" />}
            </span>
          )}
        </div>
      </div>
      <button
        data-testid="btn-change-password-submit"
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm mt-1 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : "Update Password"}
      </button>
    </form>
  );
}

// ─── Change Username Form ─────────────────────────────────────────────────────

function ChangeUsernameScreen({ currentUsername, onBack }: { currentUsername: string; onBack: () => void }) {
  const [newUsername, setNewUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) { setError("New username is required."); return; }
    if (newUsername.trim().length < 2) { setError("At least 2 characters required."); return; }
    if (!/^[a-z0-9_]+$/i.test(newUsername.trim())) { setError("Letters, numbers, underscores only."); return; }
    if (!password) { setError("Password is required."); return; }
    setLoading(true); setError(null);
    try {
      await api.changeUsername(newUsername.trim(), password);
      await refresh();
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      setDone(true);
      toast({ description: `Username changed to @${newUsername.trim().toLowerCase()}` });
    } catch (e: any) { setError(e.message ?? "Failed to change username."); }
    finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <AtSign size={28} className="text-primary" />
        </div>
        <h3 className="text-white font-bold text-lg">Username Changed</h3>
        <p className="text-white/40 text-sm">Your new username is @{newUsername.trim().toLowerCase()}</p>
        <button onClick={onBack} className="mt-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold">
          Back to Settings
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <p className="text-white/40 text-sm">Current username: <span className="text-white/70">@{currentUsername}</span></p>
      <p className="text-white/30 text-xs">Your password is required to confirm this change.</p>
      {error && (
        <div data-testid="change-username-error" className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide block mb-1.5">New Username</label>
        <input
          data-testid="input-new-username"
          type="text"
          autoComplete="username"
          value={newUsername}
          onChange={e => { setNewUsername(e.target.value); setError(null); }}
          placeholder="your_new_username"
          maxLength={30}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
        />
      </div>
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide block mb-1.5">Confirm with Password</label>
        <div className="relative">
          <input
            data-testid="input-username-password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/60 transition-colors"
          />
          <button type="button" onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <button
        data-testid="btn-change-username-submit"
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm mt-1 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : "Change Username"}
      </button>
    </form>
  );
}

// ─── Logout Confirm ───────────────────────────────────────────────────────────

function LogoutConfirm({
  onConfirm, onCancel, loading,
}: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-xs bg-[#111118] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
          <LogOut size={20} className="text-red-400" />
        </div>
        <h3 className="text-white font-bold text-center text-base mb-1">Sign Out?</h3>
        <p className="text-white/40 text-sm text-center mb-5 leading-relaxed">
          You'll be redirected to the login screen. Your preferences are saved.
        </p>
        <div className="flex gap-3">
          <button
            data-testid="btn-logout-cancel"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-white/8 border border-white/10 text-white/70 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            data-testid="btn-logout-confirm"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-red-500/90 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            {loading ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

type Screen = "main" | "change-password" | "change-username";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>("main");
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, logout, refresh } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const authUser = state.status === "authenticated" ? state.user : null;

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: api.getProfile,
    enabled: !!authUser,
  });

  const { data: serverPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: api.getPreferences,
    enabled: !!authUser,
  });

  const { data: stats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: api.getUserStats,
    enabled: !!authUser,
  });

  // Local prefs state (merged with server)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    if (serverPrefs) setPrefs({ ...DEFAULT_PREFS, ...serverPrefs });
  }, [serverPrefs]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const profileMutation = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
      api.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      refresh();
      toast({ description: "Profile updated." });
    },
    onError: (e: any) => toast({ description: e.message ?? "Update failed.", variant: "destructive" }),
  });

  // ── Preference toggle (debounced save) ───────────────────────────────────
  const savePref = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPrefsSaving(true);
      try {
        await api.updatePreferences(patch);
        qc.invalidateQueries({ queryKey: ["user-preferences"] });
      } catch {
        toast({ description: "Could not save preference.", variant: "destructive" });
        setPrefs(prefs); // rollback
      } finally { setPrefsSaving(false); }
    }, 600);
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      qc.clear();
      toast({ description: "You've been signed out." });
      setLocation("/login");
    } catch {
      toast({ description: "Sign-out failed.", variant: "destructive" });
    } finally { setLogoutLoading(false); setShowLogout(false); }
  };

  // ── Header ───────────────────────────────────────────────────────────────
  const headerTitle = {
    main: "Settings",
    "change-password": "Change Password",
    "change-username": "Change Username",
  }[screen];

  const loading = profileLoading || prefsLoading;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-xl border-b border-white/6">
        <button
          data-testid="btn-settings-back"
          onClick={() => screen === "main" ? setLocation("/profile") : setScreen("main")}
          className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
        >
          <ArrowLeft size={18} className="text-white/70" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">{headerTitle}</h1>
        {prefsSaving && (
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Loader2 size={12} className="animate-spin" /> Saving…
          </div>
        )}
      </div>

      {/* Sub-screens */}
      {screen === "change-password" && (
        <div className="flex-1 overflow-y-auto pb-24">
          <ChangePasswordScreen onBack={() => setScreen("main")} />
        </div>
      )}
      {screen === "change-username" && authUser && (
        <div className="flex-1 overflow-y-auto pb-24">
          <ChangeUsernameScreen currentUsername={authUser.username} onBack={() => setScreen("main")} />
        </div>
      )}

      {/* Main settings */}
      {screen === "main" && (
        <div className="flex-1 overflow-y-auto pb-28">
          <div className="pt-4">

            {/* ── Account Info Card ── */}
            {authUser && (
              <div className="mx-4 mb-5 rounded-2xl bg-white/[0.04] border border-white/8 p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 shrink-0">
                  <img
                    src={profile?.avatarUrl ?? authUser.avatarUrl}
                    alt={authUser.displayName}
                    className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{profile?.displayName ?? authUser.displayName}</p>
                  <p className="text-white/40 text-xs">@{authUser.username}</p>
                  <p className="text-primary/70 text-xs capitalize mt-0.5">{authUser.role}</p>
                </div>
              </div>
            )}

            {/* ── ACCOUNT ── */}
            <Section icon={User} title="Account" color="bg-violet-500/70">
              <InlineField
                label="Display Name" value={profile?.displayName ?? authUser?.displayName ?? ""}
                placeholder="Your name" maxLength={60}
                onSave={v => profileMutation.mutateAsync({ displayName: v })}
                loading={profileMutation.isPending} testId="displayName"
              />
              <div className="border-t border-white/6">
                <InlineField
                  label="Bio" value={profile?.bio ?? ""} placeholder="Tell the world about yourself…"
                  multiline maxLength={200}
                  onSave={v => profileMutation.mutateAsync({ bio: v })}
                  loading={profileMutation.isPending} testId="bio"
                />
              </div>
              <div className="border-t border-white/6">
                <InlineField
                  label="Avatar URL" value={profile?.avatarUrl ?? ""} placeholder="https://..."
                  onSave={v => profileMutation.mutateAsync({ avatarUrl: v })}
                  loading={profileMutation.isPending} testId="avatarUrl"
                />
              </div>
              <SettingRow
                icon={AtSign} label="Change Username"
                sublabel={`Currently @${authUser?.username ?? "…"}`}
                onClick={() => setScreen("change-username")}
                testId="btn-open-change-username"
              />
            </Section>

            {/* ── SECURITY ── */}
            <Section icon={Lock} title="Security" color="bg-pink-500/70">
              <SettingRow
                icon={Lock} label="Change Password"
                sublabel="Update your login credentials"
                onClick={() => setScreen("change-password")}
                testId="btn-open-change-password"
              />
              <SettingRow
                icon={LogOut} label="Sign Out"
                sublabel="Clear session and return to login"
                onClick={() => setShowLogout(true)}
                danger testId="btn-open-logout-confirm"
              />
            </Section>

            {/* ── PLAYBACK ── */}
            <Section icon={Music2} title="Playback" color="bg-blue-500/70">
              <SettingRow
                icon={Radio} label="Autoplay"
                sublabel="Continue playing when a track ends"
                right={
                  <Toggle
                    checked={prefs.autoplay}
                    onChange={v => savePref({ autoplay: v })}
                    testId="toggle-autoplay"
                  />
                }
              />
              <SettingRow
                icon={Volume2} label="Volume Normalization"
                sublabel="Keep consistent volume across songs"
                right={
                  <Toggle
                    checked={prefs.volumeNormalization}
                    onChange={v => savePref({ volumeNormalization: v })}
                    testId="toggle-volume-normalization"
                  />
                }
              />
              <SettingRow
                icon={Layers} label="Crossfade"
                sublabel="Smooth transition between tracks"
                right={
                  <Toggle
                    checked={prefs.crossfade}
                    onChange={v => savePref({ crossfade: v })}
                    testId="toggle-crossfade"
                  />
                }
              />
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3 mb-3">
                  <Zap size={17} className="text-white/50 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Audio Quality</p>
                    <p className="text-white/35 text-xs mt-0.5">Higher quality uses more data</p>
                  </div>
                </div>
                <QualitySelector value={prefs.audioQuality} onChange={v => savePref({ audioQuality: v })} />
              </div>
            </Section>

            {/* ── NOTIFICATIONS ── */}
            <Section icon={Bell} title="Notifications" color="bg-amber-500/70">
              <SettingRow
                icon={Bell} label="Push Notifications"
                sublabel="Receive alerts on your device"
                right={
                  <Toggle
                    checked={prefs.pushNotifications}
                    onChange={v => savePref({ pushNotifications: v })}
                    testId="toggle-push-notifications"
                  />
                }
              />
              <SettingRow
                icon={Music2} label="New Songs from Artists"
                sublabel="Get notified when followed artists upload"
                right={
                  <Toggle
                    checked={prefs.notifyNewSongs}
                    onChange={v => savePref({ notifyNewSongs: v })}
                    disabled={!prefs.pushNotifications}
                    testId="toggle-notify-new-songs"
                  />
                }
              />
              <SettingRow
                icon={Heart} label="Activity Notifications"
                sublabel="Likes and comments on your content"
                right={
                  <Toggle
                    checked={prefs.notifyActivity}
                    onChange={v => savePref({ notifyActivity: v })}
                    disabled={!prefs.pushNotifications}
                    testId="toggle-notify-activity"
                  />
                }
              />
            </Section>

            {/* ── APP PREFERENCES ── */}
            <Section icon={Smartphone} title="App Preferences" color="bg-teal-500/70">
              <SettingRow
                icon={Smartphone} label="Data Saver Mode"
                sublabel="Reduce streaming quality to save data"
                right={
                  <Toggle
                    checked={prefs.dataSaver}
                    onChange={v => savePref({ dataSaver: v })}
                    testId="toggle-data-saver"
                  />
                }
              />
            </Section>

            {/* ── LISTENING STATS ── */}
            {stats && (
              <Section icon={BarChart3} title="Your Stats" color="bg-emerald-500/70">
                <div className="grid grid-cols-2 gap-px bg-white/6">
                  {[
                    { icon: Heart, label: "Liked Songs", value: stats.likedSongs, color: "text-pink-400" },
                    { icon: Bookmark, label: "Saved Songs", value: stats.savedSongs, color: "text-blue-400" },
                    { icon: MessageSquare, label: "Moments", value: stats.moments, color: "text-violet-400" },
                    { icon: Clock, label: "Listen Time", value: fmtSeconds(stats.totalListenSeconds), color: "text-amber-400", raw: true },
                  ].map(({ icon: Icon, label, value, color, raw }) => (
                    <div key={label} className="flex flex-col items-center gap-1 py-4 bg-[#0d0d14]">
                      <Icon size={18} className={color} />
                      <p className={cn("text-lg font-bold", color)}>{raw ? value : value.toLocaleString()}</p>
                      <p className="text-white/35 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Version tag */}
            <p className="text-center text-white/15 text-xs pb-4 mt-2">Rytham v1.0 · All rights reserved</p>
          </div>
        </div>
      )}

      {/* Logout confirm */}
      {showLogout && (
        <LogoutConfirm
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
          loading={logoutLoading}
        />
      )}
    </div>
  );
}
