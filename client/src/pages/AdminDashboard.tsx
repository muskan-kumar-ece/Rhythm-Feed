import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Play, SkipForward, CheckCircle, Clock, TrendingUp, BarChart2, Shield,
  Check, X, ChevronDown, ChevronUp, Loader2, Pause, Music2, Upload,
  PenLine, Filter, Square, CheckSquare, AlertCircle, Mic2, UserCheck, UserX,
} from "lucide-react";
import { api, type ApiAdminStats, type ApiSong, type ApiArtistRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// ── Constants ──────────────────────────────────────────────────────────────────

const GENRES = ["Pop","Hip-Hop","Rap","R&B","Electronic","Dance","EDM","Trap","Lo-Fi","Indie","Alternative","Rock","Jazz","Afrobeats","Latin","Soul","Ambient","Country","Folk"];
const MOODS  = ["Chill","Focus","Study","Gym","Night Drive","Sad","Hype","Romantic","Party","Meditation"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Stable fake waveform from song ID seed */
function seedWaveform(songId: string, bars = 60): number[] {
  let hash = 0;
  for (let i = 0; i < songId.length; i++) {
    hash = (hash * 31 + songId.charCodeAt(i)) >>> 0;
  }
  return Array.from({ length: bars }, (_, i) => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const base = 0.2 + (Math.sin(i / 6) * 0.5 + 0.5) * 0.4;
    const noise = ((hash >>> 8) & 0xff) / 255 * 0.4;
    return Math.max(0.06, Math.min(1, base + noise));
  });
}

// ── Audio Preview Player ────────────────────────────────────────────────────────

function AudioPreviewPlayer({ audioUrl, songId }: { audioUrl: string; songId: string }) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);          // 0–1
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const [errored,  setErrored]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const waveform = seedWaveform(songId);

  // Register listeners once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime  = () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    const onMeta  = () => { setDuration(audio.duration); setLoaded(true); };
    const onEnd   = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    const onError = () => { setErrored(true); setLoaded(false); };
    audio.addEventListener("timeupdate",        onTime);
    audio.addEventListener("loadedmetadata",    onMeta);
    audio.addEventListener("ended",             onEnd);
    audio.addEventListener("error",             onError);
    audio.addEventListener("canplaythrough",    () => setLoaded(true));
    return () => {
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended",          onEnd);
      audio.removeEventListener("error",          onError);
    };
  }, []);

  // Stop playback when component unmounts
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || errored) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else         { audio.play().then(() => setPlaying(true)).catch(() => setErrored(true)); }
  };

  const scrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setProgress(pct);
    setCurrent(pct * duration);
  };

  return (
    <div className="rounded-2xl bg-black/30 border border-white/10 p-4 space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={errored}
          data-testid={`button-audio-play-${songId}`}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
            errored ? "bg-white/5 text-white/20 cursor-not-allowed" :
            "bg-primary/20 text-primary hover:bg-primary/40 active:scale-95"
          )}
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
        </button>

        {/* Waveform + scrub overlay */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Waveform */}
          <div
            className="h-10 flex items-end gap-[2px] cursor-pointer group relative overflow-hidden rounded-lg"
            onClick={scrub}
            data-testid={`waveform-${songId}`}
          >
            {waveform.map((h, i) => {
              const isPlayed = i / waveform.length < progress;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-colors duration-100 group-hover:opacity-90",
                    isPlayed ? "bg-primary" : "bg-white/20"
                  )}
                  style={{ height: `${h * 100}%` }}
                />
              );
            })}
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
              style={{ left: `${progress * 100}%` }}
            />
          </div>

          {/* Time row */}
          <div className="flex items-center justify-between text-[10px] text-white/30 font-mono">
            <span>{fmtTime(current)}</span>
            {errored ? (
              <span className="text-red-400/60 text-[9px]">No audio preview</span>
            ) : !loaded ? (
              <span className="flex items-center gap-1"><Loader2 size={8} className="animate-spin" /> Loading…</span>
            ) : (
              <span>{fmtTime(duration)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Artist Info Row ────────────────────────────────────────────────────────────

function ArtistInfoRow({ song }: { song: ApiSong }) {
  const { data } = useQuery({
    queryKey: ["artist-upload-count", song.artist],
    queryFn:  () => api.getArtistUploadCount(song.artist),
  });
  return (
    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/3 border border-white/5">
      <div>
        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Artist</p>
        <p className="text-xs font-semibold text-white truncate">{song.artist}</p>
      </div>
      <div>
        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Uploaded</p>
        <p className="text-[10px] text-white/70 leading-snug">{fmtDate(song.createdAt)}</p>
      </div>
      <div>
        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">All Uploads</p>
        <p className="text-xs font-semibold text-primary">{data?.count ?? "—"}</p>
      </div>
    </div>
  );
}

// ── Inline Metadata Edit ───────────────────────────────────────────────────────

function MetadataEditForm({ song, onSaved }: { song: ApiSong; onSaved: (updated: ApiSong) => void }) {
  const [title,  setTitle]  = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [genre,  setGenre]  = useState(song.features?.genre?.[0] ?? "Pop");
  const [mood,   setMood]   = useState(song.mood);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const dirty = title !== song.title || artist !== song.artist || genre !== (song.features?.genre?.[0] ?? "Pop") || mood !== song.mood;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const updated = await api.adminUpdateMetadata(song.id, { title, artist, mood, genre });
      toast({ title: "Metadata saved", description: `"${updated.title}" updated.` });
      onSaved(updated);
    } catch {
      toast({ title: "Error", description: "Could not save metadata.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 p-3 rounded-xl bg-white/3 border border-white/5">
      <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold flex items-center gap-1.5">
        <PenLine size={10} /> Edit Metadata
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            data-testid={`input-admin-title-${song.id}`}
          />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Artist Name</label>
          <input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            data-testid={`input-admin-artist-${song.id}`}
          />
        </div>
        <div>
          <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Genre</label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-xs text-white appearance-none focus:outline-none focus:border-primary"
            data-testid={`select-admin-genre-${song.id}`}
          >
            {GENRES.map(g => <option key={g} value={g} className="bg-[hsl(240,12%,5%)]">{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Mood</label>
          <select
            value={mood}
            onChange={e => setMood(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-xs text-white appearance-none focus:outline-none focus:border-primary"
            data-testid={`select-admin-mood-${song.id}`}
          >
            {MOODS.map(m => <option key={m} value={m} className="bg-[hsl(240,12%,5%)]">{m}</option>)}
          </select>
        </div>
      </div>
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          data-testid={`button-save-metadata-${song.id}`}
        >
          {saving ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : <><Check size={11} /> Save Changes</>}
        </button>
      )}
    </div>
  );
}

// ── Moderation Card ────────────────────────────────────────────────────────────

function ModerationCard({ song: initialSong, selected, onSelect, onAction }: {
  song: ApiSong;
  selected: boolean;
  onSelect: (id: string, val: boolean) => void;
  onAction: (id: string) => void;
}) {
  const [song,      setSong]      = useState(initialSong);
  const [expanded,  setExpanded]  = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);
  const [reason,    setReason]    = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [loading,   setLoading]   = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Keep in sync when parent re-fetches
  useEffect(() => { setSong(initialSong); }, [initialSong.status, initialSong.title, initialSong.mood]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-songs"] });

  const handleApprove = async () => {
    setLoading("approve");
    try {
      await api.approveSong(song.id);
      toast({ title: "Song approved ✓", description: `"${song.title}" is now live in the feed.` });
      invalidate();
      onAction(song.id);
    } catch {
      toast({ title: "Error", description: "Could not approve track.", variant: "destructive" });
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!reason.trim() && !rejecting) { setRejecting(true); return; }
    if (!reason.trim()) return;
    setLoading("reject");
    try {
      await api.rejectSong(song.id, reason.trim());
      toast({ title: "Song rejected", description: `"${song.title}" has been rejected.` });
      invalidate();
      onAction(song.id);
    } catch {
      toast({ title: "Error", description: "Could not reject track.", variant: "destructive" });
      setLoading(null);
    }
  };

  const statusColor =
    song.status === "approved" ? "border-green-500/20 bg-green-500/5" :
    song.status === "rejected" ? "border-red-500/20 bg-red-500/5" :
                                  "border-yellow-500/20 bg-yellow-500/5";

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-200",
      statusColor,
      selected && "ring-2 ring-primary/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]",
      loading === "approve" && "ring-2 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.25)]",
      loading === "reject"  && "ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)]",
    )}>
      <div className="flex items-center gap-2 p-3">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(song.id, !selected)}
          className="w-5 h-5 shrink-0 flex items-center justify-center"
          data-testid={`checkbox-song-${song.id}`}
        >
          {selected
            ? <CheckSquare size={18} className="text-primary" />
            : <Square size={18} className="text-white/25 hover:text-white/50 transition-colors" />}
        </button>

        {/* Cover */}
        <button className="w-12 h-12 rounded-xl overflow-hidden shrink-0" onClick={() => setExpanded(e => !e)}>
          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
        </button>

        {/* Info */}
        <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(e => !e)}>
          <p className="font-semibold text-white text-sm truncate">{song.title}</p>
          <p className="text-[11px] text-white/50 truncate">{song.artist} · <span className="text-white/35">{song.mood}</span></p>
          {song.aiTags && song.aiTags.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {song.aiTags.slice(0, 4).map(tag => (
                <span key={tag} className="px-1.5 py-0 rounded-full bg-primary/10 text-[8px] text-primary border border-primary/15 leading-4">{tag}</span>
              ))}
            </div>
          )}
        </button>

        {/* Expand */}
        <button onClick={() => setExpanded(e => !e)} className="p-1 text-white/25 hover:text-white/60 transition-colors">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-3 pb-4 pt-3 space-y-3">

          {/* Audio preview */}
          <AudioPreviewPlayer audioUrl={song.audioUrl} songId={song.id} />

          {/* Artist info */}
          <ArtistInfoRow song={song} />

          {/* Inline metadata edit */}
          <div>
            <button
              onClick={() => setShowEdit(e => !e)}
              className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors mb-2"
              data-testid={`button-toggle-edit-${song.id}`}
            >
              <PenLine size={10} />
              {showEdit ? "Hide editor" : "Edit metadata before approving"}
              {showEdit ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {showEdit && (
              <MetadataEditForm
                song={song}
                onSaved={updated => setSong(updated)}
              />
            )}
          </div>

          {/* Rejection reason input */}
          {rejecting && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Rejection reason (required)…"
                rows={2}
                className="w-full bg-black/30 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-red-500"
                data-testid={`input-reject-reason-${song.id}`}
                autoFocus
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {song.status !== "approved" && (
              <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex-1 py-2.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-green-500/30 transition-all disabled:opacity-50 active:scale-[0.97]"
                data-testid={`button-approve-${song.id}`}
              >
                {loading === "approve"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <><Check size={12} /> Approve</>}
              </button>
            )}
            {song.status !== "rejected" && (
              <button
                onClick={handleReject}
                disabled={loading !== null}
                className={cn(
                  "flex-1 py-2.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 active:scale-[0.97]",
                  rejecting
                    ? reason.trim()
                      ? "bg-red-500/25 text-red-400 border-red-500/40 hover:bg-red-500/35"
                      : "bg-red-500/10 text-red-400/60 border-red-500/20 cursor-not-allowed"
                    : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                )}
                data-testid={`button-reject-${song.id}`}
              >
                {loading === "reject"
                  ? <Loader2 size={12} className="animate-spin" />
                  : rejecting
                    ? <><X size={12} /> Confirm Reject</>
                    : <><X size={12} /> Reject</>}
              </button>
            )}
            {rejecting && (
              <button
                onClick={() => { setRejecting(false); setReason(""); }}
                className="px-3 py-2.5 bg-white/5 text-white/30 rounded-xl text-xs hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {song.status === "rejected" && song.rejectionReason && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15">
              <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-300/70 leading-relaxed">{song.rejectionReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2", color)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 font-medium uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}

// ── Retention Bar ──────────────────────────────────────────────────────────────

function RetentionBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs font-bold text-white">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Chart Tooltip ──────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
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

// ── Main Component ─────────────────────────────────────────────────────────────

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export default function AdminDashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // ── Main analytics queries ────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn:  () => api.getAdminStats(),
    refetchInterval: 60_000,
  });
  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ["admin-daily"],
    queryFn:  () => api.getAdminDailyActivity(),
    refetchInterval: 60_000,
  });
  const { data: retention } = useQuery({
    queryKey: ["admin-retention"],
    queryFn:  () => api.getAdminRetention(),
    refetchInterval: 5 * 60_000,
  });

  // ── Main view ─────────────────────────────────────────────────────────────
  type MainView = "overview" | "moderation" | "requests";
  const [mainView, setMainView] = useState<MainView>("overview");

  // ── Artist requests ───────────────────────────────────────────────────────
  const { data: artistRequests = [], refetch: refetchRequests } = useQuery<ApiArtistRequest[]>({
    queryKey: ["admin-artist-requests"],
    queryFn:  () => api.getAdminArtistRequests(),
    enabled:  mainView === "requests",
  });
  const pendingRequests = artistRequests.filter(r => r.status === "pending");
  const [requestRejectNote, setRequestRejectNote] = useState<Record<string, string>>({});
  const [requestLoading,    setRequestLoading]    = useState<Record<string, boolean>>({});

  const handleApproveRequest = async (id: string) => {
    setRequestLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.approveArtistRequest(id);
      toast({ title: "Artist request approved", description: "User has been promoted to artist." });
      refetchRequests();
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    } finally {
      setRequestLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectRequest = async (id: string) => {
    setRequestLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.rejectArtistRequest(id, requestRejectNote[id] || "");
      toast({ title: "Request rejected" });
      refetchRequests();
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    } finally {
      setRequestLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── Moderation state ──────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkLoading,  setBulkLoading]  = useState<"approve" | "reject" | null>(null);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [showBulkReject,   setShowBulkReject]   = useState(false);

  const { data: moderationSongs = [], isLoading: modLoading } = useQuery<ApiSong[]>({
    queryKey: ["admin-songs", statusFilter],
    queryFn:  () => api.getAdminSongs(statusFilter === "all" ? undefined : statusFilter),
    refetchInterval: 30_000,
  });

  // Clear selection when filter changes
  useEffect(() => setSelectedIds(new Set()), [statusFilter]);

  // Remove song from list after action (optimistic)
  const removeSong = useCallback((id: string) => {
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    qc.setQueryData<ApiSong[]>(["admin-songs", statusFilter], prev =>
      prev ? prev.filter(s => s.id !== id) : prev
    );
  }, [statusFilter, qc]);

  const toggleSelect = (id: string, val: boolean) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      val ? s.add(id) : s.delete(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === moderationSongs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(moderationSongs.map(s => s.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading("approve");
    const ids = Array.from(selectedIds);
    try {
      const result = await api.bulkApproveSongs(ids);
      toast({ title: `${result.succeeded} song${result.succeeded !== 1 ? "s" : ""} approved ✓`, description: "All selected tracks are now live." });
      ids.forEach(id => removeSong(id));
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Bulk approve failed", description: "Please try again.", variant: "destructive" });
    } finally { setBulkLoading(null); }
  };

  const handleBulkReject = async () => {
    if (!showBulkReject) { setShowBulkReject(true); return; }
    if (selectedIds.size === 0) return;
    setBulkLoading("reject");
    const ids = Array.from(selectedIds);
    try {
      const result = await api.bulkRejectSongs(ids, bulkRejectReason || undefined);
      toast({ title: `${result.succeeded} song${result.succeeded !== 1 ? "s" : ""} rejected`, description: "Selected tracks have been rejected." });
      ids.forEach(id => removeSong(id));
      setSelectedIds(new Set());
      setShowBulkReject(false);
      setBulkRejectReason("");
    } catch {
      toast({ title: "Bulk reject failed", description: "Please try again.", variant: "destructive" });
    } finally { setBulkLoading(null); }
  };

  const formattedDaily = (daily ?? []).map(d => ({ ...d, date: d.date.slice(5) }));
  const day1Pct = retention && retention.totalUsers > 0 ? (retention.day1Retained / retention.totalUsers) * 100 : 0;
  const day7Pct = retention && retention.totalUsers > 0 ? (retention.day7Retained / retention.totalUsers) * 100 : 0;
  const s: ApiAdminStats = stats ?? { dau: 0, totalPlays: 0, skipRate: 0, completionRate: 0, avgDuration: 0, songsPerSession: 0 };

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: "pending",  label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all",      label: "All" },
  ];

  const pendingCount = moderationSongs.filter(s => s.status === "pending").length;

  return (
    <div className="h-[100dvh] w-full bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <div className="pt-12 pb-3 px-4 shrink-0 bg-black z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h1 className="text-xl font-display font-bold text-white">Admin Panel</h1>
          </div>
          <Link href="/profile">
            <a className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back</a>
          </Link>
        </div>

        {/* Main view tabs */}
        <div className="flex gap-1 mt-3">
          {([
            { id: "overview",    label: "Overview",   icon: BarChart2 },
            { id: "moderation",  label: "Moderation", icon: Shield, badge: pendingCount },
            { id: "requests",    label: "Artists",    icon: Mic2,   badge: pendingRequests.length },
          ] as const).map(tab => {
            const Icon = tab.icon;
            const active = mainView === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`admin-tab-${tab.id}`}
                onClick={() => setMainView(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all relative",
                  active ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:text-white/60 bg-white/5"
                )}
              >
                <Icon size={12} />
                {tab.label}
                {"badge" in tab && (tab.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 space-y-5">

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        {mainView === "overview" && <>

        {/* Stat Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[...Array(6)].map((_, i) => <div key={i} className="rounded-2xl bg-white/5 border border-white/10 h-24 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <StatCard icon={<Users size={16} className="text-blue-400" />}      label="Daily Active"  value={s.dau}                          sub="last 24 hours"    color="bg-blue-500/5 border-blue-500/20" />
            <StatCard icon={<Play size={16} className="text-green-400" />}      label="Total Plays"   value={s.totalPlays.toLocaleString()}  sub="all time"         color="bg-green-500/5 border-green-500/20" />
            <StatCard icon={<CheckCircle size={16} className="text-emerald-400" />} label="Completion" value={`${s.completionRate}%`}        sub="songs finished"   color="bg-emerald-500/5 border-emerald-500/20" />
            <StatCard icon={<SkipForward size={16} className="text-red-400" />} label="Skip Rate"     value={`${s.skipRate}%`}               sub="songs skipped"    color="bg-red-500/5 border-red-500/20" />
            <StatCard icon={<Clock size={16} className="text-purple-400" />}    label="Avg Listen"    value={`${s.avgDuration}s`}            sub="per song"         color="bg-purple-500/5 border-purple-500/20" />
            <StatCard icon={<BarChart2 size={16} className="text-orange-400" />} label="Songs/Session" value={s.songsPerSession}             sub="per user"         color="bg-orange-500/5 border-orange-500/20" />
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
            <div className="h-40 flex items-center justify-center text-xs text-white/30">No activity data yet</div>
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

        {/* Completions vs Skips */}
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
            <div className="h-40 flex items-center justify-center text-xs text-white/30">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={formattedDaily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                <Bar dataKey="completions" name="Completions" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="skips"       name="Skips"       fill="#ef4444" radius={[2, 2, 0, 0]} />
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
          {retention ? (
            <p className="text-xs text-white/30 mt-3">
              Based on {retention.totalUsers} total user{retention.totalUsers !== 1 ? "s" : ""} ·{" "}
              {retention.day1Retained} returned day 1 · {retention.day7Retained} returned day 7
            </p>
          ) : (
            <p className="text-xs text-white/20 mt-3">Tracking retention across user cohorts. More data needed.</p>
          )}
        </div>

        </>} {/* end overview */}

        {/* ── Moderation ────────────────────────────────────────────────────── */}
        {mainView === "moderation" && <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden pt-2">

          {/* Section header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">Moderation</span>
              {pendingCount > 0 && statusFilter === "pending" && (
                <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/30">
                  {pendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Filter size={9} /> Filter
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 pb-3">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                data-testid={`filter-tab-${tab.id}`}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
                  statusFilter === tab.id
                    ? tab.id === "pending"  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      tab.id === "approved" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      tab.id === "rejected" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                                              "bg-primary/20 text-primary border border-primary/30"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Select all / bulk action header */}
          {moderationSongs.length > 0 && (
            <div className="flex items-center gap-2 px-4 pb-3 border-b border-white/5">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                data-testid="button-select-all"
              >
                {selectedIds.size === moderationSongs.length && moderationSongs.length > 0
                  ? <CheckSquare size={13} className="text-primary" />
                  : <Square size={13} />}
                {selectedIds.size === 0 ? "Select all" : `${selectedIds.size} selected`}
              </button>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkLoading !== null}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
                    data-testid="button-bulk-approve"
                  >
                    {bulkLoading === "approve"
                      ? <Loader2 size={10} className="animate-spin" />
                      : <><Check size={10} /> Approve {selectedIds.size}</>}
                  </button>
                  <button
                    onClick={handleBulkReject}
                    disabled={bulkLoading !== null}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                    data-testid="button-bulk-reject"
                  >
                    {bulkLoading === "reject"
                      ? <Loader2 size={10} className="animate-spin" />
                      : <><X size={10} /> Reject {selectedIds.size}</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bulk reject reason input */}
          {showBulkReject && selectedIds.size > 0 && (
            <div className="px-4 pb-3 space-y-2 animate-in fade-in duration-200">
              <textarea
                value={bulkRejectReason}
                onChange={e => setBulkRejectReason(e.target.value)}
                placeholder="Optional: rejection reason for all selected songs…"
                rows={2}
                className="w-full bg-black/30 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-red-500"
                data-testid="input-bulk-reject-reason"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleBulkReject}
                  disabled={bulkLoading !== null}
                  className="flex-1 py-2 bg-red-500/25 text-red-400 border border-red-500/35 rounded-xl text-xs font-bold hover:bg-red-500/35 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  data-testid="button-bulk-reject-confirm"
                >
                  {bulkLoading === "reject"
                    ? <Loader2 size={11} className="animate-spin" />
                    : <><X size={11} /> Reject {selectedIds.size} Songs</>}
                </button>
                <button
                  onClick={() => { setShowBulkReject(false); setBulkRejectReason(""); }}
                  className="px-4 py-2 bg-white/5 text-white/40 rounded-xl text-xs hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Song list */}
          <div className="px-4 pb-4 space-y-3">
            {modLoading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 size={18} className="animate-spin text-white/30" />
              </div>
            ) : moderationSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  {statusFilter === "pending"
                    ? <CheckCircle size={18} className="text-green-400" />
                    : <Music2 size={18} className="text-white/20" />}
                </div>
                <p className="text-xs text-white/40">
                  {statusFilter === "pending" ? "Queue is clear — no pending tracks" :
                   statusFilter === "approved" ? "No approved tracks yet" :
                   statusFilter === "rejected" ? "No rejected tracks" :
                   "No tracks in the system"}
                </p>
              </div>
            ) : (
              moderationSongs.map(song => (
                <ModerationCard
                  key={song.id}
                  song={song}
                  selected={selectedIds.has(song.id)}
                  onSelect={toggleSelect}
                  onAction={removeSong}
                />
              ))
            )}
          </div>
        </div>} {/* end moderation */}

        {/* ── Artist Requests ───────────────────────────────────────────────── */}
        {mainView === "requests" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">
                {artistRequests.length === 0 ? "No requests yet" :
                 `${pendingRequests.length} pending · ${artistRequests.length} total`}
              </p>
              <button
                onClick={() => refetchRequests()}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Refresh
              </button>
            </div>

            {artistRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Mic2 size={20} className="text-white/20" />
                </div>
                <p className="text-sm text-white/30 font-medium">No artist applications yet</p>
                <p className="text-xs text-white/20">New requests will appear here</p>
              </div>
            ) : (
              artistRequests.map(req => {
                const isLoading = requestLoading[req.id];
                const statusColor =
                  req.status === "pending"  ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                  req.status === "approved" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                                              "text-red-400 border-red-500/30 bg-red-500/10";
                return (
                  <div
                    key={req.id}
                    data-testid={`request-card-${req.id}`}
                    className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
                  >
                    {/* User info */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <img
                        src={req.user?.avatarUrl || `https://i.pravatar.cc/80?u=${req.userId}`}
                        alt={req.user?.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {req.user?.displayName || "Unknown"}
                        </p>
                        <p className="text-xs text-white/40">@{req.user?.username}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statusColor)}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Reason */}
                    {req.reason && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-white/50 italic leading-relaxed">"{req.reason}"</p>
                      </div>
                    )}

                    {/* Admin note (on rejected) */}
                    {req.status === "rejected" && req.adminNote && (
                      <div className="mx-4 mb-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-[10px] text-red-400">Note: {req.adminNote}</p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="px-4 pb-3">
                      <p className="text-[10px] text-white/20">
                        Submitted {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {req.reviewedAt && ` · Reviewed ${new Date(req.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </p>
                    </div>

                    {/* Approve / Reject actions (only for pending) */}
                    {req.status === "pending" && (
                      <div className="border-t border-white/5 px-4 py-3 space-y-2">
                        <div className="flex gap-2">
                          <button
                            data-testid={`button-approve-request-${req.id}`}
                            disabled={isLoading}
                            onClick={() => handleApproveRequest(req.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                            Approve
                          </button>
                          <button
                            data-testid={`button-reject-request-${req.id}`}
                            disabled={isLoading}
                            onClick={() => handleRejectRequest(req.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <UserX size={13} />}
                            Reject
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Rejection note (optional)…"
                          value={requestRejectNote[req.id] || ""}
                          onChange={e => setRequestRejectNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary/40"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
