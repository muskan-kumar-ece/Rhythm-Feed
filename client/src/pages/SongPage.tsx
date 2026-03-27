import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Play, Pause, Heart, Bookmark, Share2, MessageCircle,
  Music2, Loader2, Copy, CheckCircle2, ExternalLink
} from "lucide-react";
import { api, ApiSong } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { audioManager } from "@/lib/audioManager";
import { useAuth } from "@/contexts/AuthContext";

function shareOrCopy(url: string, title: string, artist: string, toast: ReturnType<typeof useToast>["toast"]) {
  const text = `Listen to "${title}" by ${artist} on Rytham`;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast({ description: "Link copied! 🔗" }))
      .catch(() => toast({ description: "Couldn't copy link", variant: "destructive" }));
  }
}

export default function SongPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state: authState } = useAuth();
  const isAuthed = authState.status === "authenticated";

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const audioKey = `song-page-${params.id}`;

  const { data: song, isLoading, isError } = useQuery<ApiSong>({
    queryKey: ["song", params.id],
    queryFn: () => api.getSong(params.id),
    enabled: !!params.id,
    retry: false,
  });

  useEffect(() => {
    if (!song?.id || !isAuthed) return;
    api.isLiked(song.id).then(r => setIsLiked(r.liked)).catch(() => {});
    api.isSaved(song.id).then(r => setIsSaved(r.saved)).catch(() => {});
  }, [song?.id, isAuthed]);

  useEffect(() => {
    if (!song?.audioUrl) return;
    audioManager.preload(audioKey, song.audioUrl);
    const interval = setInterval(() => {
      const el = audioManager.getElement(audioKey);
      if (el && el.duration > 0) setProgress((el.currentTime / el.duration) * 100);
    }, 500);
    return () => {
      clearInterval(interval);
      audioManager.pause(audioKey);
    };
  }, [song?.audioUrl, audioKey]);

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
    shareOrCopy(url, song.title, song.artist, toast);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    api.shareSong(song.id).catch(() => {});
  };

  const handleCopyLink = () => {
    if (!song) return;
    const url = `${window.location.origin}/song/${song.id}`;
    navigator.clipboard.writeText(url)
      .then(() => { toast({ description: "Link copied! 🔗" }); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })
      .catch(() => toast({ description: "Couldn't copy link", variant: "destructive" }));
    api.shareSong(song.id).catch(() => {});
  };

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
        <button
          onClick={() => setLocation("/")}
          className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold text-sm"
        >
          Open Rytham
        </button>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/song/${song.id}`;

  return (
    <div className="min-h-screen bg-[#08080e] pb-8 overflow-y-auto">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-110"
          style={{ backgroundImage: `url(${song.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080e]/60 via-[#08080e]/80 to-[#08080e]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
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

        {/* Cover art */}
        <div className="px-8 pt-4 pb-8">
          <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/5">
            <img
              src={song.coverUrl}
              alt={song.title}
              className={cn("w-full h-full object-cover transition-transform duration-[20s]", isPlaying && "scale-110")}
            />
          </div>
        </div>

        {/* Song info */}
        <div className="px-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-display font-bold text-white leading-tight truncate">{song.title}</h1>
              <p className="text-base text-white/60 mt-1">{song.artist}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-semibold">{song.mood}</span>
                <span className="text-xs text-white/30">{song.likes.toLocaleString()} likes</span>
                <span className="text-xs text-white/30">{song.shares?.toLocaleString() ?? 0} shares</span>
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

          {/* Progress bar */}
          <div
            className="w-full h-1 bg-white/10 rounded-full mb-6 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              const el = audioManager.getElement(audioKey);
              if (el && el.duration > 0) audioManager.seek(audioKey, pct * el.duration);
            }}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-75 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
            </div>
          </div>

          {/* Play button */}
          <div className="flex items-center justify-center mb-8">
            <button
              data-testid="button-play-song-page"
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.5)] active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause size={36} className="text-white" />
              ) : (
                <Play size={36} className="text-white fill-white ml-1" />
              )}
            </button>
          </div>

          {/* Action row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <button
              data-testid="button-save-song-page"
              onClick={toggleSave}
              className={cn(
                "flex flex-col items-center gap-2 py-4 rounded-2xl border transition-colors",
                isSaved
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white/5 border-white/10 text-white/60"
              )}
            >
              <Bookmark size={20} className={isSaved ? "fill-primary" : ""} />
              <span className="text-xs font-semibold">{isSaved ? "Saved" : "Save"}</span>
            </button>

            <button
              data-testid="button-share-song-page"
              onClick={handleShare}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60"
            >
              {linkCopied ? (
                <CheckCircle2 size={20} className="text-green-400" />
              ) : (
                <Share2 size={20} />
              )}
              <span className="text-xs font-semibold">{linkCopied ? "Shared!" : "Share"}</span>
            </button>

            <button
              data-testid="button-open-feed-song-page"
              onClick={() => setLocation("/")}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60"
            >
              <ExternalLink size={20} />
              <span className="text-xs font-semibold">Open App</span>
            </button>
          </div>

          {/* Share link box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Song Link</p>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-white/70 truncate font-mono">{shareUrl}</p>
              <button
                data-testid="button-copy-song-link"
                onClick={handleCopyLink}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center"
              >
                {linkCopied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} className="text-primary" />}
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
  );
}
