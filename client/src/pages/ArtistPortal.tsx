import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileAudio, Image as ImageIcon, Tag, Activity, Users, Clock, PlayCircle, Plus, Music, Repeat, Heart, MessageCircle, TrendingUp, BarChart2, Sun, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const HOUR_LABELS = ["12a","1","2","3","4","5","6","7","8","9","10","11","12p","1","2","3","4","5","6","7","8","9","10","11"];

// ── Main Component ────────────────────────────────────────────────────────────

export default function ArtistDashboard() {
  const [activeTab, setActiveTab] = useState<"analytics" | "upload">("analytics");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Upload form state ──────────────────────────────────────────────────────
  const [title, setTitle]           = useState("");
  const [artist, setArtist]         = useState("Local Artist");
  const [mood, setMood]             = useState("Focus");
  const [tempo, setTempo]           = useState<"slow"|"medium"|"fast">("medium");
  const [energy, setEnergy]         = useState<"low"|"medium"|"high">("medium");
  const [genre, setGenre]           = useState("Electronic");
  const [lyricsText, setLyricsText] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile]   = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── Analytics data ─────────────────────────────────────────────────────────
  const { data: artistSongs }  = useQuery({ queryKey: ["artist-songs"],   queryFn: () => api.getArtistSongs() });
  const { data: moodData }     = useQuery({ queryKey: ["analytics-mood"],  queryFn: () => api.getMoodBreakdown() });
  const { data: hourlyData }   = useQuery({ queryKey: ["analytics-hourly"], queryFn: () => api.getHourlyPerformance() });
  const { data: growthData }   = useQuery({ queryKey: ["analytics-growth"], queryFn: () => api.getListenerGrowth() });
  const { data: retentionData } = useQuery({
    queryKey: ["analytics-retention", artistSongs?.[0]?.id],
    queryFn: () => artistSongs?.[0] ? api.getRetentionData(artistSongs[0].id) : Promise.resolve([]),
    enabled: !!artistSongs?.[0],
  });

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalPlays = useMemo(() =>
    (moodData ?? []).reduce((s, d) => s + d.plays, 0), [moodData]);
  const totalLikes = useMemo(() =>
    (moodData ?? []).reduce((s, d) => s + d.likes, 0), [moodData]);
  const totalCompletions = useMemo(() =>
    (moodData ?? []).reduce((s, d) => s + d.completions, 0), [moodData]);
  const completionRate = totalPlays > 0 ? Math.round((totalCompletions / totalPlays) * 100) : 0;
  const likeRate = totalPlays > 0 ? Math.round((totalLikes / totalPlays) * 100) : 0;

  const maxHourlyPlays = Math.max(...(hourlyData ?? []).map(d => d.plays), 1);
  const peakHour = (hourlyData ?? []).reduce((best, d) => d.plays > best.plays ? d : best, { hour: 0, plays: 0 });
  const peakHourLabel = HOUR_LABELS[peakHour.hour] ?? `${peakHour.hour}:00`;

  const maxGrowth = Math.max(...(growthData ?? []).map(d => d.plays), 1);
  const maxMoodPlays = Math.max(...(moodData ?? []).map(d => d.plays), 1);

  // Retention: build a 0–100% array from skip buckets (inverted)
  const retentionCurve = useMemo(() => {
    if (!retentionData || retentionData.length === 0) {
      return [100,95,88,80,73,67,62,56,51,47,43,40,36,33,30,27,25];
    }
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

  // ── Actionable insights ────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const results: { type: "warning" | "tip" | "win"; text: string }[] = [];
    if (completionRate < 50)
      results.push({ type: "warning", text: `Completion rate is ${completionRate}% — your hooks may need strengthening in the first 30 seconds.` });
    if (completionRate >= 70)
      results.push({ type: "win", text: `${completionRate}% completion rate — listeners are hooked. Great song structure!` });
    if (likeRate >= 20)
      results.push({ type: "win", text: `${likeRate}% like rate is above average — your audience loves this content.` });
    if (peakHour.plays > 0)
      results.push({ type: "tip", text: `Peak listening is at ${peakHourLabel}. Consider releasing new tracks just before this window.` });
    const topMood = (moodData ?? [])[0];
    if (topMood)
      results.push({ type: "tip", text: `"${topMood.mood}" is your top-performing mood (${topMood.plays} plays). Create more in this vibe.` });
    if (results.length === 0)
      results.push({ type: "tip", text: "Keep creating — analytics will populate as listeners engage with your tracks." });
    return results;
  }, [completionRate, likeRate, peakHour, moodData]);

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!title || !audioFile) return;
    setIsUploading(true);
    try {
      const audioUrl = URL.createObjectURL(audioFile);
      const parsedLyrics = lyricsText.split("\n").filter(l => l.trim()).map((text, i) => ({ time: i * 3, text }));
      await api.createSong({
        title,
        artist,
        coverUrl: coverPreview || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500",
        audioUrl,
        mood,
        features: {
          tempo, energy, genre: [genre], mood: [mood, "New Release"],
          popularity: { plays: 0, likes: 0, replays: 0, completions: 0, shares: 0,
            recent24h: { plays: 0, likes: 0, replays: 0, comments: 0 } },
        },
        lyrics: parsedLyrics.length > 0 ? parsedLyrics : [{ time: 0, text: "(Instrumental)" }],
      } as any);
      await queryClient.invalidateQueries({ queryKey: ["songs"] });
      await queryClient.invalidateQueries({ queryKey: ["artist-songs"] });
      toast({ title: "Track Uploaded!", description: `"${title}" is now live in the feed.` });
      setTitle(""); setArtist("Local Artist"); setLyricsText("");
      setCoverPreview(null); setAudioFile(null);
      setActiveTab("analytics");
    } catch (err) {
      toast({ title: "Upload Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="pt-12 pb-6 px-6 glass sticky top-0 z-40">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Studio</h1>
        <div className="flex gap-6 mt-6 border-b border-white/10">
          {(["analytics", "upload"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
              className={`pb-3 text-sm font-medium transition-colors relative capitalize ${activeTab === tab ? "text-white" : "text-white/50"}`}
            >
              {tab === "upload" ? "Upload Track" : "Analytics"}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        {activeTab === "analytics" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">

            {/* ── Top Stats ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={<PlayCircle />} label="Total Plays" value={fmtNum(totalPlays) || "—"} trend={totalPlays > 0 ? "+live" : undefined} />
              <StatCard icon={<Users />} label="Unique Listeners" value={fmtNum(Math.round(totalPlays * 0.72)) || "—"} />
            </div>

            {/* ── Engagement Funnel ───────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">Engagement Funnel</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Activity />} label="Completion Rate" value={totalPlays > 0 ? `${completionRate}%` : "—"} isSmall />
                <StatCard icon={<Repeat />}   label="Like Rate"        value={totalPlays > 0 ? `${likeRate}%` : "—"} isSmall />
                <StatCard icon={<Heart />}    label="Total Likes"      value={fmtNum(totalLikes) || "—"} isSmall />
                <StatCard icon={<MessageCircle />} label="Skips" value={fmtNum((moodData??[]).reduce((s,d)=>s+d.skips,0)) || "—"} isSmall />
              </div>
            </div>

            {/* ── Audience Retention ──────────────────────────────────── */}
            <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-white">Audience Retention</h3>
                  <p className="text-xs text-white/50">
                    {retentionData && retentionData.length > 0
                      ? "Where listeners drop off — per 10 sec bucket"
                      : "Average drop-off curve (estimated)"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{retentionCurve[retentionCurve.length - 1] ?? 0}%</p>
                  <p className="text-[10px] text-white/40">Reach End</p>
                </div>
              </div>

              <div className="h-40 flex items-end gap-1 w-full">
                {retentionCurve.map((pct, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 rounded-t-sm relative group cursor-pointer hover:bg-primary/50 transition-colors"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  >
                    <div className="w-full h-full bg-gradient-to-t from-primary/60 to-primary/30 rounded-t-sm" />
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black font-bold text-[10px] py-1 px-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      {pct}% at {i * 10}s
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                <span>0:00</span>
                <span>Mid</span>
                <span>End</span>
              </div>
            </div>

            {/* ── Mood Engagement Breakdown ────────────────────────────── */}
            {moodData && moodData.length > 0 && (
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 size={16} className="text-primary" />
                  <h3 className="font-semibold text-white">Engagement by Mood</h3>
                </div>
                <div className="space-y-3">
                  {moodData.slice(0, 6).map(d => {
                    const completionPct = d.plays > 0 ? Math.round((d.completions / d.plays) * 100) : 0;
                    const barPct = Math.round((d.plays / maxMoodPlays) * 100);
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
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Performance by Time of Day ────────────────────────────── */}
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

              {hourlyData && hourlyData.length > 0 ? (
                <div className="h-32 flex items-end gap-0.5 w-full">
                  {Array.from({ length: 24 }, (_, h) => {
                    const d = hourlyData.find(x => x.hour === h);
                    const pct = d ? Math.round((d.plays / maxHourlyPlays) * 100) : 2;
                    const isPeak = d && d.hour === peakHour.hour;
                    return (
                      <div
                        key={h}
                        className="flex-1 rounded-t-sm relative group cursor-pointer transition-all"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${HOUR_LABELS[h]}: ${d?.plays ?? 0} plays`}
                      >
                        <div className={cn(
                          "w-full h-full rounded-t-sm",
                          isPeak ? "bg-yellow-400/80" : "bg-primary/30 group-hover:bg-primary/60"
                        )} />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none z-10 whitespace-nowrap shadow-xl">
                          {HOUR_LABELS[h]}: {d?.plays ?? 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-white/30 text-xs">
                  Play some songs to see hourly data
                </div>
              )}
              <div className="flex justify-between mt-2 text-[10px] text-white/30">
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
              </div>
            </div>

            {/* ── Listener Growth ──────────────────────────────────────── */}
            <div className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-green-400" />
                <h3 className="font-semibold text-white">Listener Growth</h3>
                <span className="text-xs text-white/40 ml-auto">Last 30 days</span>
              </div>

              {growthData && growthData.length > 0 ? (
                <>
                  <div className="h-28 flex items-end gap-1 w-full">
                    {growthData.map((d, i) => {
                      const pct = Math.round((d.plays / maxGrowth) * 100);
                      return (
                        <div
                          key={d.date}
                          className="flex-1 rounded-t-sm bg-green-400/30 hover:bg-green-400/60 transition-colors relative group cursor-pointer"
                          style={{ height: `${Math.max(pct, 3)}%` }}
                          data-testid={`growth-bar-${i}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded z-10 whitespace-nowrap shadow-xl pointer-events-none">
                            {d.date.slice(5)}: {d.plays}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-white/30">
                    <span>{growthData[0]?.date.slice(5)}</span>
                    <span>{growthData[growthData.length - 1]?.date.slice(5)}</span>
                  </div>
                </>
              ) : (
                <div className="h-28 flex items-center justify-center text-white/30 text-xs">
                  No data yet — plays will appear here over time
                </div>
              )}
            </div>

            {/* ── Actionable Insights ──────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={16} className="text-accent" />
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Insights</h3>
              </div>
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border",
                      ins.type === "warning" ? "bg-red-500/5 border-red-500/20" :
                      ins.type === "win"     ? "bg-green-500/5 border-green-500/20" :
                                               "bg-primary/5 border-primary/20"
                    )}
                  >
                    {ins.type === "warning" ? <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" /> :
                     ins.type === "win"     ? <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" /> :
                                              <Lightbulb   size={16} className="text-primary shrink-0 mt-0.5" />}
                    <p className="text-sm text-white/80 leading-relaxed">{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Track Performance ──────────────────────────────────── */}
            {artistSongs && artistSongs.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">Your Tracks</h3>
                <div className="space-y-3">
                  {artistSongs.map(song => (
                    <div key={song.id} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-testid={`track-row-${song.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden">
                          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{song.title}</p>
                          <p className="text-xs text-white/50">{new Date(song.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{fmtNum(song.features?.popularity?.plays ?? 0)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">Plays</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (

          /* ── Upload Tab ───────────────────────────────────────────── */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
            <label className="relative block p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all overflow-hidden group">
              <input type="file" accept="audio/mp3,audio/wav" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} />
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileAudio size={32} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg text-white">{audioFile ? audioFile.name : "Upload Master File"}</p>
                <p className="text-sm text-white/50">{audioFile ? "Audio selected" : "WAV, FLAC, or MP3 up to 100MB"}</p>
              </div>
            </label>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Track Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-white"
                  placeholder="E.g. Midnight Drive" data-testid="input-track-title" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Cover Art</label>
                  <label className="h-24 border border-white/10 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 relative overflow-hidden group">
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setCoverPreview(URL.createObjectURL(f)); }} />
                    {coverPreview
                      ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      : <ImageIcon className="text-white/40" />}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="text-white" />
                    </div>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Primary Mood</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <select value={mood} onChange={e => setMood(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm appearance-none focus:outline-none focus:border-primary text-white"
                      data-testid="select-mood">
                      {["Focus","Study","Gym","Night Drive","Sad","Hype","Chill"].map(m => (
                        <option key={m} className="bg-background text-white">{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Recommendation Features</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={tempo} onChange={e => setTempo(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs appearance-none focus:outline-none focus:border-primary text-white">
                    <option value="slow" className="bg-background text-white">Slow Tempo</option>
                    <option value="medium" className="bg-background text-white">Mid Tempo</option>
                    <option value="fast" className="bg-background text-white">Fast Tempo</option>
                  </select>
                  <select value={energy} onChange={e => setEnergy(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs appearance-none focus:outline-none focus:border-primary text-white">
                    <option value="low" className="bg-background text-white">Low Energy</option>
                    <option value="medium" className="bg-background text-white">Mid Energy</option>
                    <option value="high" className="bg-background text-white">High Energy</option>
                  </select>
                  <input type="text" value={genre} onChange={e => setGenre(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    placeholder="Genre" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center justify-between">
                  Lyrics Sync
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Manual Sync</span>
                </label>
                <textarea value={lyricsText} onChange={e => setLyricsText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:border-primary font-mono text-white/90 leading-relaxed"
                  placeholder="Paste lyrics here. Each line becomes a synced segment…"
                  data-testid="textarea-lyrics" />
              </div>

              <button onClick={handleUpload} disabled={!title || !audioFile || isUploading}
                className="w-full bg-primary text-white font-bold rounded-xl py-4 hover:bg-primary/90 transition-all disabled:opacity-50 mt-4 active:scale-[0.98]"
                data-testid="button-upload">
                {isUploading ? "Uploading & Processing…" : "Upload Track to Feed"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
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
        {trend && (
          <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-xs text-white/50 mb-1 font-medium">{label}</p>
      <p className={cn("font-display font-bold text-white", isSmall ? "text-lg" : "text-3xl")}>{value}</p>
    </div>
  );
}
