import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, Share2, Music2, Loader2, Copy, CheckCircle2,
  ExternalLink, Quote
} from "lucide-react";
import { api, ApiMoment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MOOD_GRADIENTS: Record<string, string> = {
  Chill:   "from-blue-900/60 to-blue-500/10",
  Hype:    "from-orange-900/60 to-orange-500/10",
  Sad:     "from-indigo-900/60 to-indigo-500/10",
  Focus:   "from-green-900/60 to-green-500/10",
  Night:   "from-purple-900/60 to-purple-500/10",
  Gym:     "from-red-900/60 to-red-500/10",
  Study:   "from-teal-900/60 to-teal-500/10",
};

export default function MomentPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: moment, isLoading, isError } = useQuery<ApiMoment>({
    queryKey: ["moment", params.id],
    queryFn: () => api.getMoment(params.id),
    enabled: !!params.id,
    retry: false,
  });

  const handleShare = () => {
    if (!moment) return;
    const url = `${window.location.origin}/moment/${moment.id}`;
    const text = `"${moment.lyricLine}" — ${moment.song?.title ?? "a song"} on Rytham`;
    if (navigator.share) {
      navigator.share({ title: "Rytham Moment", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url)
        .then(() => toast({ description: "Link copied! 🔗" }))
        .catch(() => toast({ description: "Couldn't copy link", variant: "destructive" }));
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!moment) return;
    const url = `${window.location.origin}/moment/${moment.id}`;
    navigator.clipboard.writeText(url)
      .then(() => { toast({ description: "Link copied! 🔗" }); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })
      .catch(() => toast({ description: "Couldn't copy link", variant: "destructive" }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080e] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !moment) {
    return (
      <div className="min-h-screen bg-[#08080e] flex flex-col items-center justify-center gap-4 p-8">
        <Quote size={48} className="text-white/20" />
        <p className="text-white/50 text-center">Moment not found or has been removed.</p>
        <button
          onClick={() => setLocation("/")}
          className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold text-sm"
        >
          Open Rytham
        </button>
      </div>
    );
  }

  const gradient = MOOD_GRADIENTS[moment.mood] ?? "from-primary/20 to-pink-500/10";
  const shareUrl = `${window.location.origin}/moment/${moment.id}`;

  return (
    <div className="min-h-screen bg-[#08080e] pb-8 overflow-y-auto">
      {/* Blurred background from song cover */}
      <div className="fixed inset-0 z-0">
        {moment.song?.coverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl scale-110"
            style={{ backgroundImage: `url(${moment.song.coverUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080e]/70 via-[#08080e]/80 to-[#08080e]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <button
            data-testid="button-back-moment"
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <Music2 size={12} className="text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Moment</span>
          </div>
          <button
            data-testid="button-open-app-moment"
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
          >
            <ExternalLink size={16} className="text-white/70" />
          </button>
        </div>

        <div className="px-5 pt-4">
          {/* Moment card */}
          <div className={cn(
            "rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-6",
            `bg-gradient-to-br ${gradient}`
          )}>
            {/* Song cover header */}
            {moment.song && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={moment.song.coverUrl}
                  alt={moment.song.title}
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 flex-shrink-0">
                    <img src={moment.song.coverUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{moment.song.title}</p>
                    <p className="text-xs text-white/60 truncate">{moment.song.artist}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lyric */}
            <div className="p-6">
              <p className="font-display text-2xl font-bold text-white italic leading-snug mb-4">
                "{moment.lyricLine}"
              </p>

              {/* Mood + caption */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-white/10 border border-white/10 text-white/70 px-2.5 py-1 rounded-full font-semibold">
                  {moment.mood}
                </span>
              </div>

              {moment.caption && (
                <p className="text-sm text-white/70 mb-4 leading-relaxed">{moment.caption}</p>
              )}

              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={moment.user?.avatarUrl || `https://i.pravatar.cc/150?u=${moment.user?.username}`}
                    alt={moment.user?.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {moment.user?.displayName || moment.user?.username}
                  </p>
                  <p className="text-xs text-white/40">{timeAgo(moment.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 text-white/40">
                  <Heart size={14} />
                  <span className="text-xs">{moment.likes}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              data-testid="button-share-moment-page"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-bold text-sm active:scale-95 transition-transform"
            >
              {linkCopied ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
              {linkCopied ? "Shared!" : "Share Moment"}
            </button>
            <button
              data-testid="button-open-app-cta"
              onClick={() => setLocation("/")}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm active:scale-95 transition-transform"
            >
              <ExternalLink size={18} />
              Open App
            </button>
          </div>

          {/* Link box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Moment Link</p>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-white/70 truncate font-mono">{shareUrl}</p>
              <button
                data-testid="button-copy-moment-link"
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
