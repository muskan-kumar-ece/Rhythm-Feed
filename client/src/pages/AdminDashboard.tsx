import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Play, SkipForward, CheckCircle, Clock, TrendingUp, BarChart2, Shield,
  AlertCircle, Check, X, ChevronDown, ChevronUp, Clock3, Loader2, Inbox,
} from "lucide-react";
import { api, type ApiAdminStats, type ApiSong } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2",
      color
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 font-medium uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/80">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function RetentionBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs font-bold text-white">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Moderation Card ───────────────────────────────────────────────────────────

function ModerationCard({ song, onAction }: {
  song: ApiSong;
  onAction: () => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [reason,    setReason]    = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [loading,   setLoading]   = useState<"approve"|"reject"|null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleApprove = async () => {
    setLoading("approve");
    try {
      await api.approveSong(song.id);
      toast({ title: "Approved", description: `"${song.title}" is now live.` });
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      onAction();
    } catch {
      toast({ title: "Error", description: "Could not approve track.", variant: "destructive" });
    } finally { setLoading(null); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { setRejecting(true); return; }
    setLoading("reject");
    try {
      await api.rejectSong(song.id, reason.trim() || "Does not meet content guidelines");
      toast({ title: "Rejected", description: `"${song.title}" rejected.` });
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      onAction();
    } catch {
      toast({ title: "Error", description: "Could not reject track.", variant: "destructive" });
    } finally { setLoading(null); setRejecting(false); }
  };

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 text-left transition-colors"
        data-testid={`pending-song-${song.id}`}
        onClick={() => setExpanded(e => !e)}
      >
        <img src={song.coverUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{song.title}</p>
          <p className="text-xs text-white/50 truncate">{song.artist} · {song.mood}</p>
          {song.aiTags && song.aiTags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {song.aiTags.slice(0, 3).map(tag => (
                <span key={tag} className="px-1.5 py-0 rounded-full bg-primary/10 text-[9px] text-primary border border-primary/15">{tag}</span>
              ))}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/30 shrink-0" /> : <ChevronDown size={14} className="text-white/30 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          {song.aiTags && song.aiTags.length > 0 && (
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">AI Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {song.aiTags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
            <span>Genre: <span className="text-white/70">{song.features?.genre?.[0] ?? "—"}</span></span>
            <span>Tempo: <span className="text-white/70">{song.features?.tempo ?? "—"}</span></span>
            <span>Energy: <span className="text-white/70">{song.features?.energy ?? "—"}</span></span>
            <span>Mood: <span className="text-white/70">{song.mood}</span></span>
          </div>

          {rejecting ? (
            <div className="space-y-2">
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Rejection reason (required)…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-red-500"
                data-testid={`input-reject-reason-${song.id}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!reason.trim() || loading === "reject"}
                  className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  data-testid={`button-confirm-reject-${song.id}`}
                >
                  {loading === "reject" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Confirm Reject"}
                </button>
                <button
                  onClick={() => { setRejecting(false); setReason(""); }}
                  className="px-4 py-2 bg-white/5 text-white/40 rounded-xl text-xs hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex-1 py-2.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                data-testid={`button-approve-${song.id}`}
              >
                {loading === "approve" ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Approve</>}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={loading !== null}
                className="flex-1 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                data-testid={`button-reject-${song.id}`}
              >
                <X size={12} /> Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.getAdminStats(),
    refetchInterval: 60_000,
  });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ["admin-daily"],
    queryFn: () => api.getAdminDailyActivity(),
    refetchInterval: 60_000,
  });

  const { data: retention } = useQuery({
    queryKey: ["admin-retention"],
    queryFn: () => api.getAdminRetention(),
    refetchInterval: 5 * 60_000,
  });

  const { data: pendingSongs = [], isLoading: pendingLoading } = useQuery<ApiSong[]>({
    queryKey: ["admin-pending"],
    queryFn: () => api.getPendingSongs(),
    refetchInterval: 30_000,
  });

  const formattedDaily = (daily ?? []).map(d => ({
    ...d,
    date: d.date.slice(5), // "MM-DD"
  }));

  const day1Pct  = retention && retention.totalUsers > 0
    ? (retention.day1Retained / retention.totalUsers) * 100
    : 0;
  const day7Pct  = retention && retention.totalUsers > 0
    ? (retention.day7Retained / retention.totalUsers) * 100
    : 0;

  const s: ApiAdminStats = stats ?? {
    dau: 0, totalPlays: 0, skipRate: 0,
    completionRate: 0, avgDuration: 0, songsPerSession: 0,
  };

  return (
    <div className="h-[100dvh] w-full bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <div className="pt-12 pb-3 px-4 shrink-0 bg-black z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h1 className="text-xl font-display font-bold text-white">Platform Analytics</h1>
          </div>
          <Link href="/profile">
            <a className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back</a>
          </Link>
        </div>
        <p className="text-xs text-white/30 mt-1">Live platform metrics · Refreshes every 60s</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 space-y-5">

        {/* Stat Cards Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <StatCard
              icon={<Users size={16} className="text-blue-400" />}
              label="Daily Active"
              value={s.dau}
              sub="last 24 hours"
              color="bg-blue-500/5 border-blue-500/20"
            />
            <StatCard
              icon={<Play size={16} className="text-green-400" />}
              label="Total Plays"
              value={s.totalPlays.toLocaleString()}
              sub="all time"
              color="bg-green-500/5 border-green-500/20"
            />
            <StatCard
              icon={<CheckCircle size={16} className="text-emerald-400" />}
              label="Completion"
              value={`${s.completionRate}%`}
              sub="songs finished"
              color="bg-emerald-500/5 border-emerald-500/20"
            />
            <StatCard
              icon={<SkipForward size={16} className="text-red-400" />}
              label="Skip Rate"
              value={`${s.skipRate}%`}
              sub="songs skipped"
              color="bg-red-500/5 border-red-500/20"
            />
            <StatCard
              icon={<Clock size={16} className="text-purple-400" />}
              label="Avg Listen"
              value={`${s.avgDuration}s`}
              sub="per song"
              color="bg-purple-500/5 border-purple-500/20"
            />
            <StatCard
              icon={<BarChart2 size={16} className="text-orange-400" />}
              label="Songs/Session"
              value={s.songsPerSession}
              sub="per user"
              color="bg-orange-500/5 border-orange-500/20"
            />
          </div>
        )}

        {/* Daily Activity Chart */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-sm font-bold text-white">Daily Activity</span>
            <span className="text-xs text-white/30">last 14 days</span>
          </div>
          {dailyLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : formattedDaily.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-white/30">
              No activity data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={formattedDaily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="plays" name="Plays" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Skip vs Completion Bar Chart */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-primary" />
            <span className="text-sm font-bold text-white">Completions vs Skips</span>
          </div>
          {dailyLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : formattedDaily.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-white/30">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={formattedDaily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                <Bar dataKey="completions" name="Completions" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="skips" name="Skips" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Retention */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-primary" />
            <span className="text-sm font-bold text-white">User Retention</span>
          </div>
          <div className="space-y-3">
            <RetentionBar label="Day 1 Retention" pct={day1Pct} color="bg-blue-500" />
            <RetentionBar label="Day 7 Retention" pct={day7Pct} color="bg-purple-500" />
          </div>
          {retention && (
            <p className="text-xs text-white/30 mt-3">
              Based on {retention.totalUsers} total user{retention.totalUsers !== 1 ? "s" : ""} ·{" "}
              {retention.day1Retained} returned day 1 · {retention.day7Retained} returned day 7
            </p>
          )}
          {!retention && (
            <p className="text-xs text-white/20 mt-3">
              Tracking retention across user cohorts. More data needed for accurate calculation.
            </p>
          )}
        </div>

        {/* ── Moderation Queue ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">Moderation Queue</span>
            </div>
            {pendingSongs.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/30">
                {pendingSongs.length} pending
              </span>
            )}
          </div>

          {pendingLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 size={18} className="animate-spin text-white/30" />
            </div>
          ) : pendingSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={18} className="text-green-400" />
              </div>
              <p className="text-xs text-white/40">Queue is clear — no pending tracks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSongs.map(song => (
                <ModerationCard
                  key={song.id}
                  song={song}
                  onAction={() => qc.invalidateQueries({ queryKey: ["admin-pending"] })}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
