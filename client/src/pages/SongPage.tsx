import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Play, Pause, Heart, Bookmark, Share2, MessageCircle,
  Music2, Loader2, Copy, CheckCircle2, ExternalLink, Send, X,
} from "lucide-react";
import { api, ApiSong, ApiComment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { audioManager } from "@/lib/audioManager";
import { useAuth } from "@/contexts/AuthContext";

// ── Comments Modal ────────────────────────────────────────────────────────────

function CommentsModal({
  songId,
  onClose,
  isAuthed,
}: {
  songId: string;
  onClose: () => void;
  isAuthed: boolean;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<ApiComment[]>({
    queryKey: ["comments", songId],
    queryFn: () => api.getComments({ songId }),
    enabled: !!songId,
  });

  const handlePost = async () => {
    if (!text.trim()) return;
    if (!isAuthed) { toast({ description: "Sign in to comment" }); return; }
    setPosting(true);
    try {
      await api.createComment({ songId, content: text.trim() });
      setText("");
      queryClient.invalidateQueries({ queryKey: ["comments", songId] });
    } catch {
      toast({ description: "Couldn't post comment", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-[#0f0f1a] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 flex-shrink-0">
          <div>
            <h3 className="font-bold text-white text-sm">Comments</h3>
            <p className="text-[10px] text-white/40">{comments.length} {comments.length === 1 ? "comment" : "comments"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 bg-white/5 rounded" />
                    <div className="h-4 w-full bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-white/30">
              <MessageCircle size={28} className="opacity-40" />
              <p className="text-xs">No comments yet — be the first!</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">{(c.user?.username || "U")[0].toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-white/70 mb-0.5">{c.user?.username || "User"}</p>
                  <p className="text-sm text-white leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 flex items-center gap-3">
          <input
            data-testid="input-comment-song-page"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
            placeholder={isAuthed ? "Add a comment…" : "Sign in to comment"}
            disabled={!isAuthed || posting}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/50 disabled:opacity-50 transition-colors"
          />
          <button
            data-testid="btn-post-comment-song-page"
            onClick={handlePost}
            disabled={!text.trim() || posting || !isAuthed}
            className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            {posting ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SongPage ──────────────────────────────────────────────────────────────────

export default function SongPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { state: authState } = useAuth();
  const isAuthed = authState.status === "authenticated";
  const lyricsRef = useRef<HTMLDivElement>(null);

  const [isPlaying,     setIsPlaying]     = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [isLiked,       setIsLiked]       = useState(false);
  const [isSaved,       setIsSaved]       = useState(false);
  const [linkCopied,    setLinkCopied]    = useState(false);
  const [showComments,  setShowComments]  = useState(false);
  const audioKey = `song-page-${params.id}`;

  const { data: song, isLoading, isError } = useQuery<ApiSong>({
    queryKey: ["song", params.id],
    queryFn: () => api.getSong(params.id),
    enabled: !!params.id,
    retry: false,
  });

  // Fetch like/save state
  useEffect(() => {
    if (!song?.id || !isAuthed) return;
    api.isLiked(song.id).then(r => setIsLiked(r.liked)).catch(() => {});
    api.isSaved(song.id).then(r => setIsSaved(r.saved)).catch(() => {});
  }, [song?.id, isAuthed]);

  // Preload + autoplay + progress tracking
  useEffect(() => {
    if (!song?.audioUrl) return;
    audioManager.preload(audioKey, song.audioUrl);

    // Autoplay once audio is ready
    const tryAutoplay = () => {
      audioManager.play(audioKey)
        .then(() => setIsPlaying(true))
        .catch(() => {}); // Silently fail if browser blocks autoplay
    };
    const el = audioManager.getElement(audioKey);
    if (el) {
      if (el.readyState >= 2) {
        tryAutoplay();
      } else {
        el.addEventListener("canplay", tryAutoplay, { once: true });
      }
    }

    // Progress + currentTime interval
    const interval = setInterval(() => {
      const el = audioManager.getElement(audioKey);
      if (el && el.duration > 0) {
        setProgress((el.currentTime / el.duration) * 100);
        setCurrentTime(el.currentTime);
      }
    }, 250);

    return () => {
      clearInterval(interval);
      audioManager.pause(audioKey);
    };
  }, [song?.audioUrl, audioKey]);

  // Auto-scroll lyrics to active line
  const lyrics = song?.lyrics ?? [];
  const currentLyricIndex = lyrics.reduce((best, lyric, i) => {
    return lyric.time <= currentTime ? i : best;
  }, -1);

  useEffect(() => {
    if (!lyricsRef.current || currentLyricIndex < 0) return;
    const activeLine = lyricsRef.current.querySelector(`[data-lyric="${currentLyricIndex}"]`) as HTMLElement;
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentLyricIndex]);

  const togglePlay = () => {
    if (!song?.audioUrl) return;
    if (isPlaying) {
      audioManager.pause(audioKey);
      setIsPlaying(false);
    } else {
      audioManager.play(audioKey).then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleLike = () => {
    if (!song || !isAuthed) { toast({ description: "Sign in to like songs" }); return; }
    const newVal = !isLiked;
    setIsLiked(newVal);
    (newVal ? api.likeSong(song.id) : api.unlikeSong(song.id)).catch(() => setIsLiked(!newVal));
  };

  const toggleSave = () => {
    if (!song || !isAuthed) { toast({ description: "Sign in to save songs" }); return; }
    const newVal = !isSaved;
    setIsSaved(newVal);
    (newVal ? api.saveSong(song.id) : api.unsaveSong(song.id)).catch(() => setIsSaved(!newVal));
  };

  const handleShare = () => {
    if (!song) return;
    const url = `${window.location.origin}/song/${song.id}`;
    const text = `Listen to "${song.title}" by ${song.artist} on Rytham`;
    if (navigator.share) {
      navigator.share({ title: song.title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url)
        .then(() => toast({ description: "Link copied!" }))
        .catch(() => {});
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    api.shareSong(song.id).catch(() => {});
  };

  const handleCopyLink = () => {
    if (!song) return;
    const url = `${window.location.origin}/song/${song.id}`;
    navigator.clipboard.writeText(url)
      .then(() => { toast({ description: "Link copied!" }); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })
      .catch(() => toast({ description: "Couldn't copy link", variant: "destructive" }));
    api.shareSong(song.id).catch(() => {});
  };

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080e] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !song) {
    return (
      <div className="min-h-screen bg-[#08080e] flex flex-col items-center justify-center gap-4 p-8">
        <Music2 size={48} className="text-white/20" />
        <p className="text-white/50 text-center">Song not found or has been removed.</p>
        <button onClick={() => setLocation("/")} className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold text-sm">
          Open Rytham
        </button>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/song/${song.id}`;

  return (
    <>
      {showComments && (
        <CommentsModal songId={song.id} onClose={() => setShowComments(false)} isAuthed={isAuthed} />
      )}

      <div className="min-h-screen bg-[#08080e] pb-8 overflow-y-auto">
        {/* Blurred cover background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-110"
            style={{ backgroundImage: `url(${song.coverUrl})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08080e]/60 via-[#08080e]/80 to-[#08080e]" />
        </div>

        <div className="relative z-10">
          {/* Nav bar */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4">
            <button
              data-testid="button-back-song"
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
              <Music2 size={12} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Rytham</span>
            </div>
            <button
              data-testid="button-open-in-app"
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
            >
              <ExternalLink size={16} className="text-white/70" />
            </button>
          </div>

          {/* Cover art — spins while playing */}
          <div className="px-8 pt-4 pb-8">
            <div className={cn(
              "aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/5 transition-all",
              isPlaying && "shadow-[0_0_60px_rgba(168,85,247,0.25)]"
            )}>
              <img
                src={song.coverUrl}
                alt={song.title}
                className={cn("w-full h-full object-cover transition-transform duration-[20s]", isPlaying && "scale-110")}
              />
            </div>
          </div>

          <div className="px-6">
            {/* Song info + like */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-display font-bold text-white leading-tight truncate">{song.title}</h1>
                <p className="text-base text-white/60 mt-1">{song.artist}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-semibold">{song.mood}</span>
                  <span className="text-xs text-white/30">{song.likes.toLocaleString()} likes</span>
                  <span className="text-xs text-white/30">{song.comments} comments</span>
                </div>
              </div>
              <button
                data-testid="button-like-song-page"
                onClick={toggleLike}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
              >
                <Heart size={22} className={cn("transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-white/60")} />
              </button>
            </div>

            {/* Progress bar — seekable */}
            <div
              className="w-full h-1.5 bg-white/10 rounded-full mb-5 cursor-pointer group"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const el = audioManager.getElement(audioKey);
                if (el && el.duration > 0) audioManager.seek(audioKey, pct * el.duration);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-primary to-pink-500 rounded-full transition-all duration-75 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Play button */}
            <div className="flex items-center justify-center mb-6">
              <button
                data-testid="button-play-song-page"
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.5)] active:scale-95 transition-transform"
              >
                {isPlaying
                  ? <Pause size={36} className="text-white" />
                  : <Play size={36} className="text-white fill-white ml-1" />}
              </button>
            </div>

            {/* Action row — 4 buttons */}
            <div className="grid grid-cols-4 gap-2.5 mb-6">
              <button
                data-testid="button-save-song-page"
                onClick={toggleSave}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border transition-colors",
                  isSaved ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/60"
                )}
              >
                <Bookmark size={18} className={isSaved ? "fill-primary" : ""} />
                <span className="text-[10px] font-semibold">{isSaved ? "Saved" : "Save"}</span>
              </button>

              <button
                data-testid="button-comment-song-page"
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
              >
                <MessageCircle size={18} />
                <span className="text-[10px] font-semibold">Comment</span>
              </button>

              <button
                data-testid="button-share-song-page"
                onClick={handleShare}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
              >
                {linkCopied
                  ? <CheckCircle2 size={18} className="text-green-400" />
                  : <Share2 size={18} />}
                <span className="text-[10px] font-semibold">{linkCopied ? "Shared!" : "Share"}</span>
              </button>

              <button
                data-testid="button-open-feed-song-page"
                onClick={() => setLocation("/")}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
              >
                <ExternalLink size={18} />
                <span className="text-[10px] font-semibold">Open App</span>
              </button>
            </div>

            {/* Time-synced lyrics */}
            {lyrics.length > 0 && (
              <div className="mb-6 rounded-3xl bg-white/3 border border-white/5 overflow-hidden">
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <Music2 size={12} className="text-primary" />
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">Lyrics</p>
                </div>
                <div
                  ref={lyricsRef}
                  className="max-h-56 overflow-y-auto px-5 pb-5 space-y-2 scrollbar-hide"
                >
                  {lyrics.map((line, i) => (
                    <p
                      key={i}
                      data-lyric={i}
                      className={cn(
                        "text-sm leading-relaxed transition-all duration-300",
                        i === currentLyricIndex
                          ? "text-white font-semibold scale-[1.02] origin-left"
                          : i < currentLyricIndex
                          ? "text-white/30"
                          : "text-white/50"
                      )}
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Share link box */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Song Link</p>
              <div className="flex items-center gap-3">
                <p className="flex-1 text-xs text-white/60 truncate font-mono">{shareUrl}</p>
                <button
                  data-testid="button-copy-song-link"
                  onClick={handleCopyLink}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center"
                >
                  {linkCopied ? <CheckCircle2 size={15} className="text-green-400" /> : <Copy size={15} className="text-primary" />}
                </button>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-primary/10 to-pink-500/10 border border-primary/20 rounded-3xl p-6 text-center">
              <h3 className="text-lg font-display font-bold text-white mb-2">Discover more on Rytham</h3>
              <p className="text-sm text-white/50 mb-4">AI-powered music discovery — your next favorite song is waiting.</p>
              <button
                onClick={() => setLocation("/")}
                className="w-full py-3 rounded-2xl bg-primary font-bold text-white text-sm"
              >
                Open Rytham
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
