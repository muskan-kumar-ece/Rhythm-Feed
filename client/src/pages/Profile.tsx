import { useState } from "react";
import { Settings, Edit2, Play, Heart, Bookmark, ListMusic } from "lucide-react";
import { dummySongs } from "@/lib/dummyData";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'liked' | 'playlists' | 'saved'>('liked');
  const [, setLocation] = useLocation();

  // Mock profile data
  const user = {
    name: "Alex Vibes",
    handle: "@alexvibes",
    bio: "Late night drives & early morning coffees. Synthwave enthusiast.",
    followers: 1240,
    following: 432,
    avatarUrl: "https://i.pravatar.cc/150?u=alex"
  };

  // Use dummy songs for the tabs
  const likedSongs = dummySongs;
  const savedSongs = [...dummySongs].reverse();
  const playlists = [
    { title: "Late Night Drive", count: 12, cover: dummySongs[0].coverUrl },
    { title: "Gym Hype", count: 24, cover: dummySongs[3].coverUrl },
    { title: "Focus Mode", count: 8, cover: dummySongs[1].coverUrl }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header */}
      <div className="relative pt-12 pb-6 px-6 glass rounded-b-[2.5rem]">
        <div className="absolute top-6 right-6 flex gap-4">
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
             <Settings size={20} className="text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center mt-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/30 p-1">
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 size={14} className="text-primary-foreground" />
            </button>
          </div>
          
          <h1 className="text-2xl font-display font-bold text-white mt-4">{user.name}</h1>
          <p className="text-white/60 text-sm">{user.handle}</p>
          <p className="text-white/80 text-sm mt-3 text-center max-w-[80%]">{user.bio}</p>
          
          <div className="flex items-center gap-8 mt-6">
             <div className="text-center">
               <p className="text-xl font-bold text-white">{user.followers.toLocaleString()}</p>
               <p className="text-xs text-white/50 uppercase tracking-wider">Followers</p>
             </div>
             <div className="w-px h-8 bg-white/10" />
             <div className="text-center">
               <p className="text-xl font-bold text-white">{user.following.toLocaleString()}</p>
               <p className="text-xs text-white/50 uppercase tracking-wider">Following</p>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-around mt-6 px-6 border-b border-white/5 pb-4">
        <button 
          onClick={() => setActiveTab('liked')}
          className={cn("flex flex-col items-center gap-2 transition-colors", activeTab === 'liked' ? "text-primary" : "text-white/40")}
        >
          <Heart size={24} className={activeTab === 'liked' ? "fill-primary" : ""} />
          <span className="text-xs font-medium">Likes</span>
        </button>
        <button 
          onClick={() => setActiveTab('playlists')}
          className={cn("flex flex-col items-center gap-2 transition-colors", activeTab === 'playlists' ? "text-primary" : "text-white/40")}
        >
          <ListMusic size={24} />
          <span className="text-xs font-medium">Playlists</span>
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className={cn("flex flex-col items-center gap-2 transition-colors", activeTab === 'saved' ? "text-primary" : "text-white/40")}
        >
          <Bookmark size={24} className={activeTab === 'saved' ? "fill-primary" : ""} />
          <span className="text-xs font-medium">Saved</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="px-4 mt-6">
        {activeTab === 'liked' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {likedSongs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 rounded-xl overflow-hidden relative">
                    <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={24} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-base">{song.title}</h3>
                    <p className="text-sm text-white/50">{song.artist}</p>
                  </div>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center">
                     <Heart size={20} className="fill-primary text-primary" />
                  </button>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {savedSongs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 rounded-xl overflow-hidden relative">
                    <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={24} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-base">{song.title}</h3>
                    <p className="text-sm text-white/50">{song.artist}</p>
                  </div>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center">
                     <Bookmark size={20} className="fill-primary text-primary" />
                  </button>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {playlists.map((pl, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-square rounded-2xl overflow-hidden relative mb-2 shadow-lg">
                    <img src={pl.cover} alt={pl.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                       <p className="text-xs font-medium text-white/80 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
                          <ListMusic size={12} /> {pl.count}
                       </p>
                    </div>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.5)]">
                         <Play size={24} className="text-white fill-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white px-1">{pl.title}</h3>
                </div>
             ))}
             {/* Create New Playlist Button */}
             <div className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all group">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                   <div className="w-6 h-px bg-white/60 absolute group-hover:bg-primary" />
                   <div className="h-6 w-px bg-white/60 absolute group-hover:bg-primary" />
                </div>
                <p className="font-medium text-white/60 group-hover:text-primary transition-colors">New Playlist</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
