import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart, Share2, Play, Pause, Mic, Music2, ChevronUp, ChevronDown,
  MessageCircle, Bookmark, Upload, X, Tag, Clock, Eye
} from "lucide-react";
import { api, type ApiSpotlight } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import RythamLogo from "@/components/RythamLogo";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + "K";
  return String(n);
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PROMPT_COLORS: Record<string, string> = {
  "production":      "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "songwriting":     "bg-pink-500/20   text-pink-300   border-pink-500/30",
  "gear":            "bg-blue-500/20   text-blue-300   border-blue-500/30",
  "journey":         "bg-amber-500/20  text-amber-300  border-amber-500/30",
  "default":         "bg-white/10      text-white/60   border-white/20",
};
function tagColor(tag: string) {
  return PROMPT_COLORS[tag] ?? PROMPT_COLORS["default"];
}

// ─── audio waveform bars (deterministic per spotlight) ─────────────────────

function seedBars(id: string, count = 48): number[] {
  const bars: number[] = [];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  for (let i = 0; i < count; i++) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    bars.push(0.15 + (hash % 1000) / 1000 * 0.85);
  }
  return bars;
}

// ─── AudioPlayer component ─────────────────────────────────────────────────

function AudioWaveform({
  spotlightId,
  playing,
  progress,
  onSeek,
}: {
  spotlightId: string;
  playing: boolean;
  progress: number;      // 0-1
  onSeek: (p: number) => void;
}) {
  const bars   = seedBars(spotlightId);
  const barW   = 100 / bars.length;
  const filled = Math.floor(progress * bars.length);

  return (
    <div
      className="flex items-end gap-[2px] h-14 cursor-pointer w-full select-none"
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onSeek((e.clientX - rect.left) / rect.width);
      }}
      data-testid="spotlight-waveform"
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-75"
          style={{
            height: `${h * 100}%`,
            background:
              i < filled
                ? "linear-gradient(to top, #a855f7, #ec4899)"
                : playing && Math.abs(i - filled) <= 1
                ? "rgba(168,85,247,0.6)"
                : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Single Spotlight Card ─────────────────────────────────────────────────

function SpotlightCard({
  spotlight,
  isActive,
  likedSet,
  onLikeToggle,
}: {
  spotlight: ApiSpotlight;
  isActive: boolean;
  likedSet: Set<string>;
  onLikeToggle: (id: string) => void;
}) {
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const viewedRef  = useRef(false);
  const { toast }  = useToast();

  const hasAudio = !!spotlight.mediaUrl;
  const isLiked  = likedSet.has(spotlight.id);

  // Pause when card leaves viewport
  useEffect(() => {
    if (!isActive) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [isActive]);

  // Record view once
  useEffect(() => {
    if (isActive && !viewedRef.current) {
      viewedRef.current = true;
      api.recordSpotlightView(spotlight.id).catch(() => {});
    }
  }, [isActive, spotlight.id]);

  const togglePlay = useCallback(() => {
    if (!hasAudio) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing, hasAudio]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || spotlight.durationSeconds || 1;
    setProgress(audio.currentTime / dur);
    setCurrentTime(audio.currentTime);
  };

  const handleSeek = (p: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || spotlight.durationSeconds || 1;
    audio.currentTime = p * dur;
    setProgress(p);
  };

  const handleShare = async () => {
    const text = `🎤 "${spotlight.title}" by ${spotlight.artistName} — Artist Spotlight on Rytham`;
    try {
      if (navigator.share) {
        await navigator.share({ title: spotlight.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ description: "Copied to clipboard!" });
      }
    } catch {}
  };

  const totalDur = spotlight.durationSeconds || 0;
  const elapsed  = Math.floor(currentTime);

  return (
    <div
      data-testid={`spotlight-card-${spotlight.id}`}
      className="relative w-full h-full flex-shrink-0 overflow-hidden"
    >
      {/* Background cover */}
      <div className="absolute inset-0">
        <img
          src={spotlight.coverUrl}
          alt={spotlight.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      </div>

      {/* Hidden audio element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={spotlight.mediaUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { setPlaying(false); setProgress(1); }}
          preload="metadata"
        />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end pb-20 px-4 gap-3">

        {/* Prompt badge */}
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 leading-tight max-w-[80%]">
            💬 {spotlight.prompt}
          </span>
        </div>

        {/* Artist row */}
        <div className="flex items-center gap-3">
          <img
            src={spotlight.artistAvatarUrl}
            alt={spotlight.artistName}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-lg"
          />
          <div>
            <p className="font-bold text-white text-sm leading-none">{spotlight.artistName}</p>
            <p className="text-xs text-white/50 mt-0.5">{relativeTime(spotlight.createdAt)}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-white/40 text-xs">
            {spotlight.mediaType === "video" ? (
              <Music2 size={12} />
            ) : (
              <Mic size={12} />
            )}
            <span className="capitalize">{spotlight.mediaType}</span>
          </div>
        </div>

        {/* Title & description */}
        <div>
          <h2 className="text-white font-bold text-lg leading-tight">{spotlight.title}</h2>
          <p
            data-testid={`spotlight-desc-${spotlight.id}`}
            className={cn(
              "text-white/60 text-sm mt-1 leading-relaxed",
              expanded ? "" : "line-clamp-2"
            )}
          >
            {spotlight.description}
          </p>
          {spotlight.description.length > 80 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-primary text-xs mt-0.5"
            >
              {expanded ? "less" : "more"}
            </button>
          )}
        </div>

        {/* Tags */}
        {spotlight.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {spotlight.tags.map(t => (
              <span
                key={t}
                className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium", tagColor(t))}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Waveform + play */}
        <div className="flex items-center gap-3">
          <button
            data-testid={`spotlight-play-${spotlight.id}`}
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0 active:scale-95 transition-transform"
          >
            {playing ? (
              <Pause size={18} className="text-white" />
            ) : (
              <Play size={18} className="text-white ml-0.5" />
            )}
          </button>

          <div className="flex-1">
            <AudioWaveform
              spotlightId={spotlight.id}
              playing={playing}
              progress={progress}
              onSeek={handleSeek}
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
              <span>{fmtDuration(elapsed)}</span>
              <span>{fmtDuration(totalDur)}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-white/40 text-xs">
          <span className="flex items-center gap-1"><Eye size={11} />{fmtNum(spotlight.views)}</span>
          <span className="flex items-center gap-1"><Heart size={11} />{fmtNum(spotlight.likes)}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{fmtDuration(totalDur)}</span>
        </div>
      </div>

      {/* Right action sidebar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">

        {/* Like */}
        <button
          data-testid={`spotlight-like-${spotlight.id}`}
          onClick={() => onLikeToggle(spotlight.id)}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center border",
            isLiked
              ? "bg-pink-500/20 border-pink-500/40"
              : "bg-white/10 border-white/20"
          )}>
            <Heart
              size={20}
              className={isLiked ? "fill-pink-400 text-pink-400" : "text-white"}
            />
          </div>
          <span className="text-[10px] text-white/50">{fmtNum(spotlight.likes + (isLiked ? 1 : 0))}</span>
        </button>

        {/* Share */}
        <button
          data-testid={`spotlight-share-${spotlight.id}`}
          onClick={handleShare}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20">
            <Share2 size={20} className="text-white" />
          </div>
          <span className="text-[10px] text-white/50">Share</span>
        </button>

        {/* Save */}
        <button
          data-testid={`spotlight-save-${spotlight.id}`}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20">
            <Bookmark size={20} className="text-white" />
          </div>
          <span className="text-[10px] text-white/50">Save</span>
        </button>
      </div>
    </div>
  );
}

// ─── Upload Spotlight Modal ────────────────────────────────────────────────

const INTERVIEW_PROMPTS = [
  "What does your creative process look like?",
  "Which track are you most proud of and why?",
  "What was your biggest musical breakthrough?",
  "How do you deal with creative blocks?",
  "What piece of gear changed your sound?",
  "Who are the artists that inspired you most?",
  "What would you tell your younger self?",
  "Walk us through your favorite track stem-by-stem.",
];

function UploadModal({ onClose }: { onClose: () => void }) {
  const [file,          setFile]     = useState<File | null>(null);
  const [cover,         setCover]    = useState<File | null>(null);
  const [coverPreview,  setCPreview] = useState("");
  const [artistName,    setArtist]   = useState("");
  const [title,         setTitle]    = useState("");
  const [description,   setDesc]     = useState("");
  const [selectedPrompt, setPrompt]  = useState(INTERVIEW_PROMPTS[0]);
  const [tags,          setTags]     = useState("");
  const [uploading,     setUploading] = useState(false);
  const [done,          setDone]     = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleCover = (f: File) => {
    setCover(f);
    setCPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !artistName.trim() || !title.trim()) {
      toast({ description: "Please fill in all required fields and attach a media file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("media", file);
      if (cover) fd.append("cover", cover);
      fd.append("artistName", artistName.trim());
      fd.append("title",      title.trim());
      fd.append("description", description.trim());
      fd.append("prompt",     selectedPrompt);
      fd.append("tags",       tags.trim());
      fd.append("durationSeconds", "0");
      await api.uploadSpotlight(fd);
      qc.invalidateQueries({ queryKey: ["spotlights"] });
      setDone(true);
    } catch (e) {
      toast({ description: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end">
      <div className="w-full max-w-md mx-auto bg-[#0a0a0f] border-t border-white/10 rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-[#0a0a0f] z-10">
          <h2 className="text-white font-bold text-base">Submit a Spotlight</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X size={16} className="text-white/60" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Mic size={32} className="text-primary" />
            </div>
            <h3 className="text-white font-bold text-lg">Submitted for Review!</h3>
            <p className="text-white/50 text-sm mt-2">Your spotlight will appear after approval. Thanks for sharing your story.</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-4">

            {/* Cover pick */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Cover Image (optional)</label>
              <label className="block cursor-pointer">
                <div className="w-full h-36 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} className="w-full h-full object-cover" alt="cover" />
                  ) : (
                    <span className="text-white/30 text-sm">Tap to choose cover</span>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCover(e.target.files[0])} />
              </label>
            </div>

            {/* Media file */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Audio / Video Clip *</label>
              <label
                data-testid="upload-spotlight-media"
                className="block cursor-pointer w-full py-3 rounded-xl bg-white/5 border border-dashed border-white/20 text-center"
              >
                <span className="text-white/40 text-sm">
                  {file ? file.name : "Tap to attach audio or video"}
                </span>
                <input type="file" accept="audio/*,video/*" className="hidden"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
              </label>
            </div>

            {/* Artist name */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Your Artist Name *</label>
              <input
                data-testid="input-spotlight-artist"
                value={artistName}
                onChange={e => setArtist(e.target.value)}
                placeholder="e.g. Neon Waves"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-primary/50"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Spotlight Title *</label>
              <input
                data-testid="input-spotlight-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. How I made my debut track"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-primary/50"
              />
            </div>

            {/* Interview prompt picker */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Interview Prompt</label>
              <div className="flex flex-col gap-2">
                {INTERVIEW_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPrompt(p)}
                    className={cn(
                      "text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                      selectedPrompt === p
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Description</label>
              <textarea
                data-testid="input-spotlight-description"
                value={description}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                placeholder="Give listeners a teaser of what you share..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-primary/50 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Tag size={11} />Tags (comma-separated)
              </label>
              <input
                data-testid="input-spotlight-tags"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="production, gear, journey"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-primary/50"
              />
            </div>

            <button
              data-testid="btn-submit-spotlight"
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full py-3 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Submit Spotlight"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter bar ────────────────────────────────────────────────────────────

const FILTER_TAGS = ["All", "production", "songwriting", "journey", "gear", "collaboration"];

// ─── Main Spotlight page ───────────────────────────────────────────────────

export default function Spotlight() {
  const [filterTag,    setFilterTag]    = useState("All");
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [likedSet,     setLikedSet]     = useState<Set<string>>(new Set());
  const [showUpload,   setShowUpload]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qc           = useQueryClient();
  const { toast }    = useToast();

  const { data: spotlights = [], isLoading } = useQuery({
    queryKey: ["spotlights", filterTag],
    queryFn: () =>
      filterTag === "All"
        ? api.getSpotlights({ limit: 20 })
        : api.getSpotlights({ tag: filterTag }),
  });

  // Like / unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (likedSet.has(id)) {
        await api.unlikeSpotlight(id);
        return { id, liked: false };
      } else {
        await api.likeSpotlight(id);
        return { id, liked: true };
      }
    },
    onSuccess: ({ id, liked }) => {
      setLikedSet(prev => {
        const next = new Set(prev);
        if (liked) next.add(id); else next.delete(id);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["spotlights"] });
    },
    onError: () => toast({ description: "Could not update like.", variant: "destructive" }),
  });

  // Vertical scroll snapping via IntersectionObserver
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) {
          const idx = cardRefs.current.indexOf(visible.target as HTMLDivElement);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      { threshold: 0.6 }
    );
    cardRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [spotlights]);

  const scrollTo = (dir: "up" | "down") => {
    const next = dir === "down" ? activeIndex + 1 : activeIndex - 1;
    if (next < 0 || next >= spotlights.length) return;
    cardRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-3 pb-2 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2">
          <RythamLogo size="sm" />
          <div>
            <span className="text-white font-bold text-sm">Spotlight</span>
            <p className="text-white/40 text-[10px] leading-none">Artist Interviews</p>
          </div>
        </div>

        <button
          data-testid="btn-open-upload-spotlight"
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold"
        >
          <Upload size={12} />Submit
        </button>
      </div>

      {/* Filter bar */}
      <div className="absolute top-14 left-0 right-0 z-30 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTER_TAGS.map(tag => (
            <button
              key={tag}
              data-testid={`filter-${tag}`}
              onClick={() => { setFilterTag(tag); setActiveIndex(0); }}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                filterTag === tag
                  ? "bg-primary text-white border-primary"
                  : "bg-white/5 text-white/50 border-white/10 hover:border-white/20"
              )}
            >
              {tag === "All" ? "All" : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main vertical feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {isLoading ? (
          <div className="h-[100dvh] flex items-center justify-center">
            <div className="text-center">
              <Mic size={40} className="text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-white/50 text-sm">Loading spotlights…</p>
            </div>
          </div>
        ) : spotlights.length === 0 ? (
          <div className="h-[100dvh] flex items-center justify-center px-6 text-center">
            <div>
              <Mic size={48} className="text-white/20 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">No Spotlights Yet</h3>
              <p className="text-white/40 text-sm mb-6">
                Be the first artist to share your creative story with the Rytham community.
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-bold"
              >
                Submit Your Spotlight
              </button>
            </div>
          </div>
        ) : (
          spotlights.map((spot, i) => (
            <div
              key={spot.id}
              ref={el => { cardRefs.current[i] = el; }}
              className="w-full snap-start"
              style={{ height: "100dvh" }}
            >
              <SpotlightCard
                spotlight={spot}
                isActive={i === activeIndex}
                likedSet={likedSet}
                onLikeToggle={id => likeMutation.mutate(id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Scroll arrows */}
      {spotlights.length > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              data-testid="scroll-up-spotlight"
              onClick={() => scrollTo("up")}
              className="absolute right-4 top-1/2 -translate-y-16 z-30 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronUp size={16} className="text-white/60" />
            </button>
          )}
          {activeIndex < spotlights.length - 1 && (
            <button
              data-testid="scroll-down-spotlight"
              onClick={() => scrollTo("down")}
              className="absolute right-4 top-1/2 translate-y-4 z-30 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronDown size={16} className="text-white/60" />
            </button>
          )}
        </>
      )}

      {/* Dot pagination */}
      {spotlights.length > 1 && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
          {spotlights.slice(0, 10).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i === activeIndex
                  ? "w-1.5 h-4 bg-primary"
                  : "w-1.5 h-1.5 bg-white/20"
              )}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
