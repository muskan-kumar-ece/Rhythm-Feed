import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileAudio, Image as ImageIcon, Tag, Activity, Users, Clock, PlayCircle,
  Plus, Music, Repeat, Heart, MessageCircle, TrendingUp, BarChart2, Sun, Lightbulb,
  AlertCircle, CheckCircle, X, Edit2, ChevronDown, ChevronUp, Loader2,
  Sparkles, Zap, Shield, Clock3, Check, SkipForward,
} from "lucide-react";
import { api, type ApiSong, type ApiSongStats, type ApiUploadResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import RythamLogo from "@/components/RythamLogo";

// ── Constants ─────────────────────────────────────────────────────────────────

const GENRES = ["Pop","Hip-Hop","Rap","R&B","Electronic","Dance","EDM","Trap","Lo-Fi","Indie","Alternative","Rock","Jazz","Afrobeats","Latin","Soul","Ambient","Country","Folk"];
const MOODS  = ["Chill","Focus","Study","Gym","Night Drive","Sad","Hype","Romantic","Party","Meditation"];
const HOUR_LABELS: Record<number, string> = {
  0:"12am",1:"1am",2:"2am",3:"3am",4:"4am",5:"5am",6:"6am",7:"7am",8:"8am",9:"9am",
  10:"10am",11:"11am",12:"12pm",13:"1pm",14:"2pm",15:"3pm",16:"4pm",17:"5pm",18:"6pm",
  19:"7pm",20:"8pm",21:"9pm",22:"10pm",23:"11pm",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtBytes(b: number): string {
  if (b >= 1_000_000) return (b / 1_000_000).toFixed(1) + " MB";
  if (b >= 1_000)     return (b / 1_000).toFixed(0) + " KB";
  return b + " B";
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
      <Check size={9} /> Live
    </span>
  );
  if (status === "pending") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
      <Clock3 size={9} /> Review
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
      <X size={9} /> Rejected
    </span>
  );
  return null;
}

// ── Phase Badge ───────────────────────────────────────────────────────────────

function PhaseBadge({ phase, score }: { phase?: string; score?: number }) {
  if (!phase || phase === "full") return null;
  const color =
    phase === "test"       ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
    phase === "growth"     ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
    phase === "broad"      ? "bg-primary/20 text-primary border-primary/30" :
    phase === "suppressed" ? "bg-red-500/20 text-red-400 border-red-500/30" : "";
  const label =
    phase === "test"       ? `${score?.toFixed(0)}% reach` :
    phase === "growth"     ? "Growing" :
    phase === "broad"      ? "Broad reach" :
    phase === "suppressed" ? "Low engagement" : phase;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", color)}>
      <Zap size={8} /> {label}
    </span>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, trend, isSmall = false }: {
  icon: React.ReactNode; label: string; value: string; trend?: string; isSmall?: boolean;
}) {
  return (
    <div className={cn("p-5 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors", isSmall && "p-4 rounded-2xl")}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("text-primary", isSmall && "scale-75 origin-top-left")}>{icon}</div>
        {trend && <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <p className="text-xs text-white/50 mb-1 font-medium">{label}</p>
      <p className={cn("font-display font-bold text-white", isSmall ? "text-lg" : "text-3xl")}>{value}</p>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ song, onClose, onSave }: { song: ApiSong; onClose: () => void; onSave: () => void }) {
  const [title,  setTitle]  = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [mood,   setMood]   = useState(song.mood);
  const [genre,  setGenre]  = useState(song.features?.genre?.[0] ?? "Pop");
  const [tempo,  setTempo]  = useState(song.features?.tempo ?? "medium");
  const [energy, setEnergy] = useState(song.features?.energy ?? "medium");
  const [lyricsText, setLyricsText] = useState(
    song.lyrics?.map(l => l.text).join("\n") ?? ""
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSongMetadata(song.id, { title, artist, mood, genre, tempo, energy, lyricsText });
      toast({ title: "Saved", description: "Track metadata updated." });
      onSave();
      onClose();
    } catch {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full bg-[hsl(240,12%,5%)] border-t border-white/10 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-bold text-white tracking-tight">Edit Track</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Artist Name</label>
            <input value={artist} onChange={e => setArtist(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Genre</label>
              <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary">
                {GENRES.map(g => <option key={g} value={g} className="bg-[hsl(240,12%,5%)]">{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Primary Mood</label>
              <select value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary">
                {MOODS.map(m => <option key={m} value={m} className="bg-[hsl(240,12%,5%)]">{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Tempo</label>
              <select value={tempo} onChange={e => setTempo(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary">
                {["slow","medium","fast"].map(t => <option key={t} value={t} className="bg-[hsl(240,12%,5%)]">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Energy</label>
              <select value={energy} onChange={e => setEnergy(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary">
                {["low","medium","high"].map(e => <option key={e} value={e} className="bg-[hsl(240,12%,5%)]">{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5 block">Lyrics (one line per segment)</label>
            <textarea value={lyricsText} onChange={e => setLyricsText(e.target.value)} rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 resize-none focus:outline-none focus:border-primary font-mono leading-relaxed" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-primary text-white font-bold rounded-xl py-4 hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-[0.98]">
          {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving…</span> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Track Row ─────────────────────────────────────────────────────────────────

function TrackRow({ song, onEdit, onRefresh }: { song: ApiSong; onEdit: (s: ApiSong) => void; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: stats } = useQuery<ApiSongStats>({
    queryKey: ["song-stats", song.id],
    queryFn: () => api.getSongStats(song.id),
    enabled: expanded,
  });

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
        data-testid={`track-row-${song.id}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
          {song.status === "pending" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Clock3 size={14} className="text-yellow-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{song.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <StatusBadge status={song.status} />
            {song.status === "approved" && <PhaseBadge phase={song.distributionPhase} score={song.distributionScore} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {song.status === "pending" && (
            <button
              data-testid={`button-edit-${song.id}`}
              onClick={e => { e.stopPropagation(); onEdit(song); }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Edit2 size={13} className="text-white/70" />
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          {song.status === "rejected" && song.rejectionReason && (
            <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300/80 leading-relaxed">{song.rejectionReason}</p>
            </div>
          )}

          {song.status === "pending" && (
            <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Shield size={14} className="text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300/80 leading-relaxed">
                Your track is being reviewed by our team. Typically takes 24–48h. You can edit metadata while it's pending.
              </p>
            </div>
          )}

          {song.aiTags && song.aiTags.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2">AI Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {song.aiTags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {song.status === "approved" && (
            <>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-3">Performance</p>
              {stats ? (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Plays",   value: fmtNum(stats.plays),       icon: <PlayCircle size={14} className="text-primary" /> },
                    { label: "Likes",   value: fmtNum(stats.likes),        icon: <Heart size={14} className="text-accent" /> },
                    { label: "Skips",   value: fmtNum(stats.skips),        icon: <SkipForward size={14} className="text-white/40" /> },
                    { label: "Score",   value: `${stats.engagementScore}`, icon: <Zap size={14} className="text-yellow-400" /> },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5">
                      {icon}
                      <p className="text-sm font-bold text-white">{value}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-16">
                  <Loader2 size={16} className="animate-spin text-white/30" />
                </div>
              )}

              {song.distributionPhase && song.distributionPhase !== "full" && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1">Distribution</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                        style={{ width: `${song.distributionScore ?? 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40">{song.distributionScore?.toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">
                    {song.distributionPhase === "test"   ? "Testing with a small audience" :
                     song.distributionPhase === "growth" ? "Growing — strong engagement detected" :
                     song.distributionPhase === "broad"  ? "Broad distribution unlocked" :
                     "Suppressed — low engagement"}
                  </p>
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-white/30 mt-3">
            Uploaded {new Date(song.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" · "}{song.mood} · {song.features?.genre?.[0]}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Upload Success Screen ─────────────────────────────────────────────────────

function UploadSuccess({ song, analysis, autoApproved, onDone }: {
  song: ApiSong;
  analysis: { tempo: string; energy: string; aiTags: string[]; estimatedBpm: number };
  autoApproved: boolean;
  onDone: () => void;
}) {
  const glowColor  = autoApproved ? "bg-primary/15"   : "bg-green-500/15";
  const ringColor  = autoApproved ? "bg-primary/20 border-primary/40"   : "bg-green-500/20 border-green-500/40";
  const iconColor  = autoApproved ? "text-primary"     : "text-green-400";
  const labelColor = autoApproved ? "text-primary"     : "text-green-400";

  const steps = autoApproved ? [
    { icon: <Sparkles size={14} />, text: "AI tags & metadata extracted",   done: true },
    { icon: <Check size={14} />,    text: "Auto-approved — live in feed now", done: true },
    { icon: <Zap size={14} />,      text: "Discovery boost activated",       done: true },
    { icon: <TrendingUp size={14} />, text: "Smart distribution begins",     done: true },
  ] : [
    { icon: <Shield size={14} />,    text: "Sent to moderation queue",          done: true },
    { icon: <Sparkles size={14} />,  text: "AI tags & metadata extracted",      done: true },
    { icon: <Zap size={14} />,       text: "Discovery boost activated on approval", done: false },
    { icon: <TrendingUp size={14} />, text: "Smart distribution begins",        done: false },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative">
        <div className={`absolute inset-0 scale-125 rounded-full ${glowColor} blur-xl`} />
        <div className={`w-20 h-20 rounded-full ${ringColor} border flex items-center justify-center relative z-10`}>
          <CheckCircle size={36} className={iconColor} />
        </div>
      </div>

      <div>
        <p className={`text-xs uppercase tracking-widest font-bold mb-2 ${labelColor}`}>
          {autoApproved ? "Track Published" : "Track Submitted"}
        </p>
        <h2 className="text-2xl font-display font-bold text-white tracking-tight mb-1">"{song.title}"</h2>
        <p className="text-white/40 text-sm">
          {autoApproved ? "is live in the feed now" : "is under review"}
        </p>
      </div>

      <div className="w-full max-w-xs p-4 rounded-2xl bg-white/5 border border-white/5 text-left space-y-3">
        <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">AI Analysis Results</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Tempo",    value: analysis.tempo.charAt(0).toUpperCase()+analysis.tempo.slice(1) },
            { label: "Energy",   value: analysis.energy.charAt(0).toUpperCase()+analysis.energy.slice(1) },
            { label: "Est. BPM", value: String(analysis.estimatedBpm) },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl bg-white/5 text-center">
              <p className="text-xs font-bold text-white">{value}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">AI Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.aiTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-[10px] text-primary font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-2 text-left">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              step.done ? (autoApproved ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-400") : "bg-white/5 text-white/30"
            )}>
              {step.done ? <Check size={12} /> : step.icon}
            </div>
            <p className={cn("text-xs", step.done ? "text-white/70" : "text-white/30")}>{step.text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="w-full max-w-xs bg-primary text-white font-bold rounded-xl py-4 hover:bg-primary/90 transition-all active:scale-[0.98]"
        data-testid="button-done-upload"
      >
        {autoApproved ? "View Live Tracks" : "View My Tracks"}
      </button>
    </div>
  );
}

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({ onSuccess }: { onSuccess: (song: ApiSong, analysis: ApiUploadResult["analysis"], autoApproved: boolean) => void }) {
  const [title,      setTitle]      = useState("");
  const [artist,     setArtist]     = useState("Local Artist");
  const [genre,      setGenre]      = useState("Pop");
  const [mood,       setMood]       = useState("Chill");
  const [tempo,      setTempo]      = useState<"slow"|"medium"|"fast">("medium");
  const [energy,     setEnergy]     = useState<"low"|"medium"|"high">("medium");
  const [lyricsText, setLyricsText] = useState("");
  const [audioFile,  setAudioFile]  = useState<File | null>(null);
  const [coverFile,  setCoverFile]  = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const [uploading,  setUploading]  = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())    e.title  = "Title is required";
    if (!artist.trim())   e.artist = "Artist name is required";
    if (!audioFile)       e.audio  = "Audio file is required";
    if (audioFile && audioFile.size > 100 * 1024 * 1024) e.audio = "File must be under 100 MB";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, audio: "File must be under 100 MB" }));
      return;
    }
    if (!/\.(mp3|wav|flac)$/i.test(f.name) && !/^audio\//.test(f.type)) {
      setErrors(prev => ({ ...prev, audio: "Must be MP3, WAV, or FLAC" }));
      return;
    }
    setAudioFile(f);
    setErrors(prev => { const n = { ...prev }; delete n.audio; return n; });
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const simulateProgress = useCallback((onDone: () => void) => {
    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 95) { p = 95; clearInterval(timer); onDone(); }
      setProgress(Math.min(p, 95));
    }, 200);
    return timer;
  }, []);

  const handleUpload = async () => {
    if (!validate()) return;
    setUploading(true);
    setProgress(0);
    let doneSignal = false;

    const progressTimer = simulateProgress(() => { doneSignal = true; });

    try {
      const fd = new FormData();
      fd.append("audio",      audioFile!);
      if (coverFile) fd.append("cover", coverFile);
      fd.append("title",      title.trim());
      fd.append("artist",     artist.trim());
      fd.append("genre",      genre);
      fd.append("mood",       mood);
      fd.append("tempo",      tempo);
      fd.append("energy",     energy);
      fd.append("lyricsText", lyricsText);

      const result = await api.uploadTrack(fd);

      clearInterval(progressTimer);
      setProgress(100);
      setTimeout(() => {
        onSuccess(result.song, result.analysis, result.autoApproved ?? false);
      }, 400);
    } catch (err: any) {
      clearInterval(progressTimer);
      setProgress(0);
      toast({ title: "Upload Failed", description: err.message || "Something went wrong.", variant: "destructive" });
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Audio File Drop Zone */}
      <label
        className={cn(
          "relative block p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all overflow-hidden group",
          audioFile
            ? "border-primary/60 bg-primary/5"
            : errors.audio ? "border-red-500/60 bg-red-500/5" : "border-white/10 bg-white/3 hover:bg-white/8 hover:border-primary/40"
        )}
      >
        <input ref={audioRef} type="file" accept=".mp3,.wav,.flac,audio/*" className="hidden" onChange={handleAudioChange} data-testid="input-audio-file" />
        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110",
          audioFile ? "bg-primary/20" : "bg-white/5"
        )}>
          <FileAudio size={28} className={audioFile ? "text-primary" : "text-white/40"} />
        </div>
        <div>
          {audioFile ? (
            <>
              <p className="font-semibold text-white">{audioFile.name}</p>
              <p className="text-xs text-primary mt-0.5">{fmtBytes(audioFile.size)} · Ready to upload</p>
            </>
          ) : (
            <>
              <p className="font-medium text-white">Upload Audio File</p>
              <p className="text-xs text-white/40 mt-0.5">MP3, WAV, or FLAC · up to 100 MB</p>
            </>
          )}
        </div>
        {audioFile && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setAudioFile(null); if (audioRef.current) audioRef.current.value = ""; }}
            className="absolute top-3 right-3 w-7 h-7 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={13} className="text-white" />
          </button>
        )}
      </label>
      {errors.audio && <p className="text-xs text-red-400 -mt-3 px-1">{errors.audio}</p>}

      {/* Metadata */}
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Track Title *</label>
            <input
              value={title} onChange={e => { setTitle(e.target.value); setErrors(p => { const n={...p}; delete n.title; return n; }); }}
              className={cn("w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors",
                errors.title ? "border-red-500/60" : "border-white/10")}
              placeholder="e.g. Midnight Drive" data-testid="input-track-title"
            />
            {errors.title && <p className="text-[10px] text-red-400">{errors.title}</p>}
          </div>

          {/* Cover Art */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Cover Art</label>
            <label className="w-20 h-[50px] border border-white/10 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 relative overflow-hidden group" data-testid="input-cover-file">
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              {coverPreview
                ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                : <ImageIcon size={20} className="text-white/30" />}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={16} className="text-white" />
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Artist Name *</label>
          <input
            value={artist} onChange={e => { setArtist(e.target.value); setErrors(p => { const n={...p}; delete n.artist; return n; }); }}
            className={cn("w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors",
              errors.artist ? "border-red-500/60" : "border-white/10")}
            placeholder="Your artist name" data-testid="input-artist-name"
          />
          {errors.artist && <p className="text-[10px] text-red-400">{errors.artist}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Genre</label>
            <div className="relative">
              <select value={genre} onChange={e => setGenre(e.target.value)} data-testid="select-genre"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary">
                {GENRES.map(g => <option key={g} value={g} className="bg-[hsl(240,12%,5%)]">{g}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Primary Mood</label>
            <div className="relative">
              <select value={mood} onChange={e => setMood(e.target.value)} data-testid="select-mood"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary">
                {MOODS.map(m => <option key={m} value={m} className="bg-[hsl(240,12%,5%)]">{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Tempo</label>
            <div className="flex gap-1">
              {(["slow","medium","fast"] as const).map(t => (
                <button key={t} onClick={() => setTempo(t)} data-testid={`button-tempo-${t}`}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    tempo === t ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Energy</label>
            <div className="flex gap-1">
              {(["low","medium","high"] as const).map(e => (
                <button key={e} onClick={() => setEnergy(e)} data-testid={`button-energy-${e}`}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    energy === e ? "bg-accent text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
                  {e.charAt(0).toUpperCase()+e.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-white/50 uppercase tracking-wider font-semibold flex items-center justify-between">
            Lyrics <span className="text-white/25 normal-case font-normal">(optional — one line per segment)</span>
          </label>
          <textarea
            value={lyricsText} onChange={e => setLyricsText(e.target.value)} rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 resize-none focus:outline-none focus:border-primary font-mono leading-relaxed"
            placeholder="Paste lyrics here…" data-testid="textarea-lyrics"
          />
        </div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{progress < 40 ? "Uploading audio…" : progress < 70 ? "Running AI analysis…" : progress < 95 ? "Saving to database…" : "Finalizing…"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !audioFile}
        className="w-full bg-primary text-white font-bold rounded-xl py-4 hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
        data-testid="button-upload"
      >
        {uploading ? (
          <><Loader2 size={18} className="animate-spin" /> Processing…</>
        ) : (
          <><Upload size={18} /> Upload Track</>
        )}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ArtistPortal() {
  const [activeTab, setActiveTab] = useState<"analytics" | "tracks" | "upload">("tracks");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Upload success state (includes autoApproved flag from backend)
  const [uploadResult, setUploadResult] = useState<ApiUploadResult | null>(null);

  // Edit modal
  const [editSong, setEditSong] = useState<ApiSong | null>(null);

  const { data: artistSongs = [], isLoading: songsLoading } = useQuery<ApiSong[]>({
    queryKey: ["artist-songs"],
    queryFn: () => api.getArtistSongs(),
    refetchInterval: uploadResult ? 5000 : false,
  });

  const { data: moodData }    = useQuery({ queryKey: ["analytics-mood"],  queryFn: api.getMoodBreakdown });
  const { data: retentionData } = useQuery({ queryKey: ["analytics-retention", ""], queryFn: () => api.getRetentionData("") });
  const { data: hourlyData }  = useQuery({ queryKey: ["analytics-hourly"], queryFn: api.getHourlyPerformance });
  const { data: growthData }  = useQuery({ queryKey: ["analytics-growth"], queryFn: api.getListenerGrowth });

  // ── Analytics derived ──────────────────────────────────────────────────────
  const totalPlays       = useMemo(() => (moodData ?? []).reduce((s, d) => s + d.plays, 0), [moodData]);
  const totalLikes       = useMemo(() => (moodData ?? []).reduce((s, d) => s + d.likes, 0), [moodData]);
  const totalCompletions = useMemo(() => (moodData ?? []).reduce((s, d) => s + d.completions, 0), [moodData]);
  const completionRate   = totalPlays > 0 ? Math.round((totalCompletions / totalPlays) * 100) : 0;
  const likeRate         = totalPlays > 0 ? Math.round((totalLikes / totalPlays) * 100) : 0;
  const maxHourlyPlays   = Math.max(...(hourlyData ?? []).map(d => d.plays), 1);
  const peakHour         = (hourlyData ?? []).reduce((best, d) => d.plays > best.plays ? d : best, { hour: 0, plays: 0 });
  const peakHourLabel    = HOUR_LABELS[peakHour.hour] ?? `${peakHour.hour}:00`;
  const maxGrowth        = Math.max(...(growthData ?? []).map(d => d.plays), 1);
  const maxMoodPlays     = Math.max(...(moodData ?? []).map(d => d.plays), 1);
  const retentionCurve   = useMemo(() => {
    if (!retentionData || retentionData.length === 0) return [100,95,88,80,73,67,62,56,51,47,43,40,36,33,30,27,25];
    const maxBucket = Math.max(...retentionData.map(d => d.bucket));
    const totalListeners = retentionData.reduce((s, d) => s + d.count, 0);
    let cumulative = totalListeners;
    const curve: number[] = [];
    for (let b = 0; b <= Math.max(maxBucket, 16); b++) {
      const dropOff = retentionData.find(d => d.bucket === b)?.count ?? 0;
      cumulative = Math.max(0, cumulative - dropOff * 0.3);
      curve.push(Math.round((cumulative / totalListeners) * 100));
    }
    return curve.slice(0, 17);
  }, [retentionData]);

  const insights = useMemo(() => {
    const results: { type: "warning" | "tip" | "win"; text: string }[] = [];
    if (completionRate < 50) results.push({ type: "warning", text: `Completion rate is ${completionRate}% — your hooks may need strengthening in the first 30 seconds.` });
    if (completionRate >= 70) results.push({ type: "win", text: `${completionRate}% completion rate — listeners are hooked!` });
    if (likeRate >= 20) results.push({ type: "win", text: `${likeRate}% like rate is above average — your audience loves this.` });
    if (peakHour.plays > 0) results.push({ type: "tip", text: `Peak listening at ${peakHourLabel}. Release new tracks just before this window.` });
    const topMood = (moodData ?? [])[0];
    if (topMood) results.push({ type: "tip", text: `"${topMood.mood}" is your top-performing mood (${topMood.plays} plays).` });
    if (results.length === 0) results.push({ type: "tip", text: "Keep creating — analytics populate as listeners engage." });
    return results;
  }, [completionRate, likeRate, peakHour, moodData]);

  // Track counts
  const pendingCount  = artistSongs.filter(s => s.status === "pending").length;
  const approvedCount = artistSongs.filter(s => s.status === "approved").length;
  const rejectedCount = artistSongs.filter(s => s.status === "rejected").length;

  return (
    <div className="min-h-screen bg-background pb-20 page-enter">
      <header className="pt-12 pb-6 px-6 glass sticky top-0 z-40">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-display font-bold tracking-tight gradient-text-subtle">Studio</h1>
          <RythamLogo size="xs" />
        </div>
        <div className="flex gap-1 mt-4">
          {(["tracks", "analytics", "upload"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab !== "upload") setUploadResult(null); }}
              data-testid={`tab-${tab}`}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
                activeTab === tab ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:text-white/70"
              )}
            >
              {tab === "tracks" ? (
                <span className="flex items-center justify-center gap-1.5">
                  My Tracks {artistSongs.length > 0 && <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[9px]">{artistSongs.length}</span>}
                </span>
              ) : tab === "upload" ? "Upload" : "Analytics"}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">

        {/* ── Tracks Tab ─────────────────────────────────────────────── */}
        {activeTab === "tracks" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto space-y-5">

            {/* Summary */}
            {artistSongs.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Approved", count: approvedCount, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
                  { label: "Review",   count: pendingCount,  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
                  { label: "Rejected", count: rejectedCount, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
                ].map(({ label, count, color, bg }) => (
                  <div key={label} className={cn("p-3 rounded-2xl border text-center", bg)}>
                    <p className={cn("text-xl font-display font-bold", color)}>{count}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {songsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-white/30" />
              </div>
            ) : artistSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Music size={28} className="text-white/20" />
                </div>
                <div>
                  <p className="text-white/40 font-medium mb-1">No tracks yet</p>
                  <p className="text-white/25 text-sm">Upload your first track to get started</p>
                </div>
                <button onClick={() => setActiveTab("upload")} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all">
                  Upload Track
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {artistSongs.map(song => (
                  <TrackRow
                    key={song.id}
                    song={song}
                    onEdit={setEditSong}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ["artist-songs"] })}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveTab("upload")}
              className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-white/10 rounded-2xl text-white/40 hover:border-primary/40 hover:text-primary transition-all"
              data-testid="button-upload-track"
            >
              <Plus size={18} /> Upload New Track
            </button>
          </div>
        )}

        {/* ── Upload Tab ──────────────────────────────────────────────── */}
        {activeTab === "upload" && (
          uploadResult ? (
            <UploadSuccess
              song={uploadResult.song}
              analysis={uploadResult.analysis}
              autoApproved={uploadResult.autoApproved ?? false}
              onDone={() => {
                setUploadResult(null);
                setActiveTab("tracks");
                queryClient.invalidateQueries({ queryKey: ["artist-songs"] });
              }}
            />
          ) : (
            <UploadForm
              onSuccess={(song, analysis, autoApproved) => {
                setUploadResult({ song, analysis, autoApproved });
                queryClient.invalidateQueries({ queryKey: ["artist-songs"] });
              }}
            />
          )
        )}

        {/* ── Analytics Tab ───────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={<PlayCircle />} label="Total Plays" value={fmtNum(totalPlays) || "—"} trend={totalPlays > 0 ? "+live" : undefined} />
              <StatCard icon={<Users />} label="Unique Listeners" value={fmtNum(Math.round(totalPlays * 0.72)) || "—"} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">Engagement Funnel</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Activity />}       label="Completion Rate" value={totalPlays > 0 ? `${completionRate}%` : "—"} isSmall />
                <StatCard icon={<Repeat />}         label="Like Rate"       value={totalPlays > 0 ? `${likeRate}%` : "—"} isSmall />
                <StatCard icon={<Heart />}          label="Total Likes"     value={fmtNum(totalLikes) || "—"} isSmall />
                <StatCard icon={<MessageCircle />}  label="Skips"           value={fmtNum((moodData??[]).reduce((s,d)=>s+d.skips,0)) || "—"} isSmall />
              </div>
            </div>
            <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-white">Audience Retention</h3>
                  <p className="text-xs text-white/50">{retentionData?.length ? "Where listeners drop off — per 10 sec bucket" : "Average drop-off curve (estimated)"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{retentionCurve[retentionCurve.length - 1] ?? 0}%</p>
                  <p className="text-[10px] text-white/40">Reach End</p>
                </div>
              </div>
              <div className="h-40 flex items-end gap-1 w-full">
                {retentionCurve.map((pct, i) => (
                  <div key={i} className="flex-1 bg-primary/20 rounded-t-sm relative group cursor-pointer hover:bg-primary/50 transition-colors" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className="w-full h-full bg-gradient-to-t from-primary/60 to-primary/30 rounded-t-sm" />
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black font-bold text-[10px] py-1 px-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      {pct}% at {i * 10}s
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                <span>0:00</span><span>Mid</span><span>End</span>
              </div>
            </div>
            {moodData && moodData.length > 0 && (
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 size={16} className="text-primary" />
                  <h3 className="font-semibold text-white">Engagement by Mood</h3>
                </div>
                <div className="space-y-3">
                  {moodData.slice(0, 6).map(d => {
                    const completionPct = d.plays > 0 ? Math.round((d.completions / d.plays) * 100) : 0;
                    return (
                      <div key={d.mood} data-testid={`mood-row-${d.mood}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white/80">{d.mood}</span>
                          <div className="flex items-center gap-3 text-[10px] text-white/40">
                            <span>{fmtNum(d.plays)} plays</span>
                            <span className="text-primary font-bold">{completionPct}% comp.</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                            style={{ width: `${Math.round((d.plays / maxMoodPlays) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sun size={16} className="text-yellow-400" />
                  <h3 className="font-semibold text-white">Time of Day</h3>
                </div>
                {peakHour.plays > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-yellow-400">{peakHourLabel}</p>
                    <p className="text-[10px] text-white/40">Peak hour</p>
                  </div>
                )}
              </div>
              {hourlyData?.length ? (
                <div className="h-32 flex items-end gap-0.5 w-full">
                  {Array.from({ length: 24 }, (_, h) => {
                    const d = hourlyData.find(x => x.hour === h);
                    const pct = d ? Math.round((d.plays / maxHourlyPlays) * 100) : 2;
                    const isPeak = d && d.hour === peakHour.hour;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div
                          className={cn("w-full rounded-t-sm transition-colors", isPeak ? "bg-yellow-400/60" : "bg-primary/30 hover:bg-primary/60")}
                          style={{ height: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-white/30 text-xs">Play some songs to see hourly data</div>
              )}
              <div className="flex justify-between mt-2 text-[10px] text-white/30">
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
              </div>
            </div>
            {growthData?.length ? (
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={16} className="text-green-400" />
                  <h3 className="font-semibold text-white">Listener Growth</h3>
                  <span className="text-xs text-white/40 ml-auto">Last 30 days</span>
                </div>
                <div className="h-28 flex items-end gap-1 w-full">
                  {growthData.map((d, i) => (
                    <div key={d.date} className="flex-1 rounded-t-sm bg-green-400/30 hover:bg-green-400/60 transition-colors relative group cursor-pointer"
                      style={{ height: `${Math.max(Math.round((d.plays / maxGrowth) * 100), 3)}%` }} data-testid={`growth-bar-${i}`}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded z-10 whitespace-nowrap shadow-xl pointer-events-none">
                        {d.date.slice(5)}: {d.plays}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-white/30">
                  <span>{growthData[0]?.date.slice(5)}</span>
                  <span>{growthData[growthData.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            ) : null}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={16} className="text-accent" />
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Insights</h3>
              </div>
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div key={i} className={cn("flex items-start gap-3 p-4 rounded-2xl border",
                    ins.type === "warning" ? "bg-red-500/5 border-red-500/20" :
                    ins.type === "win"     ? "bg-green-500/5 border-green-500/20" :
                                             "bg-primary/5 border-primary/20")}>
                    {ins.type === "warning" ? <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" /> :
                     ins.type === "win"     ? <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" /> :
                                              <Lightbulb   size={16} className="text-primary shrink-0 mt-0.5" />}
                    <p className="text-sm text-white/80 leading-relaxed">{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editSong && (
        <EditModal
          song={editSong}
          onClose={() => setEditSong(null)}
          onSave={() => queryClient.invalidateQueries({ queryKey: ["artist-songs"] })}
        />
      )}
    </div>
  );
}
