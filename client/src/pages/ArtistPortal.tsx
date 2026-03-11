import { useState } from "react";
import { Upload, FileAudio, Image as ImageIcon, Tag, Activity, Users, Clock, MapPin, PlayCircle, Plus } from "lucide-react";
import { dummyAnalytics, dummySongs, Song } from "@/lib/dummyData";
import { useLocation } from "wouter";

export default function ArtistDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'upload'>('analytics');
  const [, setLocation] = useLocation();

  // Upload Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("Local Artist");
  const [mood, setMood] = useState("Focus");
  const [tempo, setTempo] = useState<'slow'|'medium'|'fast'>('medium');
  const [energy, setEnergy] = useState<'low'|'medium'|'high'>('medium');
  const [genre, setGenre] = useState("Electronic");
  
  const [lyricsText, setLyricsText] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  const handleUpload = () => {
    if (!title || !audioFile) return; // Basic validation
    setIsUploading(true);

    // Simulate upload delay and processing
    setTimeout(() => {
      // Create a dummy audio URL (in reality, we'd use the uploaded file)
      const audioUrl = URL.createObjectURL(audioFile);

      // Parse simple lyrics (each line becomes a timed lyric block for mockup purposes)
      const parsedLyrics = lyricsText.split('\n').filter(l => l.trim()).map((text, i) => ({
        time: i * 3, // mock 3s intervals
        text
      }));

      const newSong: Song = {
        id: `mock-${Date.now()}`,
        title,
        artist,
        coverUrl: coverPreview || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop",
        audioUrl,
        mood,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
        isFollowingArtist: false,
        features: {
          tempo,
          energy,
          genre: [genre],
          mood: [mood, 'New Release'],
          popularity: {
            plays: 0,
            likes: 0,
            replays: 0,
            completions: 0,
            shares: 0
          }
        },
        lyrics: parsedLyrics.length > 0 ? parsedLyrics : [{ time: 0, text: "(Instrumental)" }]
      };

      // Add to front of dummy feed
      dummySongs.unshift(newSong);
      
      setIsUploading(false);
      
      // Reset form and navigate to feed
      setTitle("");
      setLyricsText("");
      setCoverPreview(null);
      setAudioFile(null);
      setLocation("/");
      
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="pt-12 pb-6 px-6 glass sticky top-0 z-40">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Artist Portal</h1>
        <div className="flex gap-6 mt-6 border-b border-white/10">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'analytics' ? 'text-white' : 'text-white/50'}`}
          >
            Overview
            {activeTab === 'analytics' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'upload' ? 'text-white' : 'text-white/50'}`}
          >
            Upload Track
            {activeTab === 'upload' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
            )}
          </button>
        </div>
      </header>

      <main className="p-6">
        {activeTab === 'analytics' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={<PlayCircle />} label="Total Plays" value={dummyAnalytics.totalPlays} />
              <StatCard icon={<Activity />} label="Completion" value={dummyAnalytics.completionRate} />
              <StatCard icon={<Clock />} label="Top Time" value="10pm-2am" isSmall />
              <StatCard icon={<MapPin />} label="Top Region" value="LA, USA" isSmall />
            </div>

            {/* Listener Retention Chart (Mockup) */}
            <div className="mt-8 p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
              <h3 className="text-sm font-medium text-white/60 mb-4">Listener Retention</h3>
              <div className="h-40 flex items-end gap-2">
                {[80, 75, 68, 65, 60, 58, 55, 50, 48, 45, 40, 38].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/20 rounded-t-sm relative group cursor-pointer hover:bg-primary/40 transition-colors" style={{ height: `${h}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-xs p-1 rounded transition-opacity pointer-events-none">
                      {h}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>0:00</span>
                <span>Drop</span>
                <span>End</span>
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="mt-8">
              <h3 className="text-lg font-display font-semibold mb-4">Recent Tracks</h3>
              <div className="space-y-3">
                {dummyAnalytics.recentUploads.map((track, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                        <PlayCircle size={20} className="text-white/50" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{track.title}</p>
                        <p className="text-xs text-white/50">{track.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-primary">{track.plays.toLocaleString()}</p>
                      <p className="text-xs text-white/50">plays</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
            {/* Audio Upload */}
            <label className="relative block p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all overflow-hidden group">
              <input type="file" accept="audio/mp3,audio/wav" className="hidden" onChange={handleAudioChange} />
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileAudio size={32} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg text-white">
                  {audioFile ? audioFile.name : "Upload Master File"}
                </p>
                <p className="text-sm text-white/50">
                  {audioFile ? "Audio selected" : "WAV, FLAC, or MP3 up to 100MB"}
                </p>
              </div>
            </label>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Track Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-white"
                  placeholder="E.g. Midnight Drive"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Cover Art</label>
                  <label className="h-24 border border-white/10 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors relative overflow-hidden group">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <ImageIcon className="text-white/40" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Plus className="text-white" />
                    </div>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Primary Mood</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <select 
                      value={mood}
                      onChange={e => setMood(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm appearance-none focus:outline-none focus:border-primary transition-all text-white"
                    >
                      <option className="bg-background text-white">Focus</option>
                      <option className="bg-background text-white">Study</option>
                      <option className="bg-background text-white">Gym</option>
                      <option className="bg-background text-white">Night Drive</option>
                      <option className="bg-background text-white">Sad</option>
                      <option className="bg-background text-white">Hype</option>
                      <option className="bg-background text-white">Chill</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Recommendation Features</label>
                <div className="grid grid-cols-3 gap-2">
                   <select 
                      value={tempo}
                      onChange={e => setTempo(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs appearance-none focus:outline-none focus:border-primary transition-all text-white"
                    >
                      <option value="slow" className="bg-background text-white">Slow Tempo</option>
                      <option value="medium" className="bg-background text-white">Mid Tempo</option>
                      <option value="fast" className="bg-background text-white">Fast Tempo</option>
                    </select>
                    
                    <select 
                      value={energy}
                      onChange={e => setEnergy(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs appearance-none focus:outline-none focus:border-primary transition-all text-white"
                    >
                      <option value="low" className="bg-background text-white">Low Energy</option>
                      <option value="medium" className="bg-background text-white">Mid Energy</option>
                      <option value="high" className="bg-background text-white">High Energy</option>
                    </select>

                    <input 
                      type="text" 
                      value={genre}
                      onChange={e => setGenre(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all text-white"
                      placeholder="Genre (e.g. Pop)"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center justify-between">
                  Lyrics Sync
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Manual Sync</span>
                </label>
                <textarea 
                  value={lyricsText}
                  onChange={e => setLyricsText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:border-primary transition-all font-mono text-white/90 leading-relaxed"
                  placeholder="Paste lyrics here. Each line will become a synced segment..."
                ></textarea>
              </div>

              <button 
                onClick={handleUpload}
                disabled={!title || !audioFile || isUploading}
                className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-4 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 active:scale-[0.98]"
              >
                {isUploading ? "Uploading & Processing..." : "Upload Track to Feed"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, isSmall = false }: { icon: React.ReactNode, label: string, value: string, isSmall?: boolean }) {
  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
      <div className="text-primary mb-3">
        {icon}
      </div>
      <p className="text-sm text-white/50 mb-1">{label}</p>
      <p className={`font-display font-semibold ${isSmall ? 'text-xl' : 'text-2xl'} text-white`}>{value}</p>
    </div>
  );
}