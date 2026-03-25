import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Users, Play, SkipForward, CheckCircle, Clock, TrendingUp, BarChart2, Shield } from "lucide-react";
import { api, type ApiAdminStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

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

export default function AdminDashboard() {
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
            <RetentionBar
              label="Day 1 Retention"
              pct={day1Pct}
              color="bg-blue-500"
            />
            <RetentionBar
              label="Day 7 Retention"
              pct={day7Pct}
              color="bg-purple-500"
            />
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
      </div>
    </div>
  );
}
