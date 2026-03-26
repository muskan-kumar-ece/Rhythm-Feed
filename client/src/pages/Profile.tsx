import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Edit2, Play, Heart, Bookmark, ListMusic, History, Users, Music2, Quote, BarChart2, X, Mic2, Clock, CheckCircle2, XCircle, RefreshCw, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { api, ApiSong, ApiArtistRequest } from "@/lib/api";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import RythamLogo from "@/components/RythamLogo";

export default function Profile() {
  const [activeTab,    setActiveTab]    = useState<'liked' | 'playlists' | 'saved' | 'moments' | 'history'>('liked');

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { state, refresh } = useAuth();
  const authUser = state.status === "authenticated" ? state.user : null;
  const role     = authUser?.role ?? "user";

  // ── Artist request (only for regular users) ─────────────────────────────
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [requestReason,   setRequestReason]   = useState("");
  const [refreshingRole,  setRefreshingRole]  = useState(false);

  const { data: myRequestData, refetch: refetchMyRequest } = useQuery({
    queryKey: ["my-artist-request"],
    queryFn:  () => api.getMyArtistRequest(),
    enabled:  role === "user",
  });
  const myRequest = myRequestData?.request as ApiArtistRequest | null | undefined;

  const submitRequestMutation = useMutation({
    mutationFn: (reason: string) => api.submitArtistRequest(reason),
    onSuccess: () => {
      toast({ title: "Application submitted!", description: "An admin will review your request." });
      setShowArtistModal(false);
      setRequestReason("");
      refetchMyRequest();
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Failed to submit request";
      // Already pending → just refresh
      if (msg.includes("pending")) { refetchMyRequest(); setShowArtistModal(false); return; }
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleRoleRefresh = async () => {
    setRefreshingRole(true);
    try {
      await refresh();
      refetchMyRequest();
    } finally {
      setRefreshingRole(false);
    }
  };

  // ── Profile editing ──────────────────────────────────────────────────────
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio,         setEditBio]         = useState("");

  const editProfileMutation = useMutation({
    mutationFn: (data: { displayName: string; bio: string }) => api.updateProfile(data),
    onSuccess: (updated) => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      refresh();
      setShowEditProfile(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Could not update profile", variant: "destructive" });
    },
  });

  const { data: userProfile } = useQuery({ queryKey: ["user-profile"], queryFn: () => api.getProfile() });
  const { data: likedSongs = [], isLoading: likedLoading } = useQuery({ queryKey: ["liked-songs"], queryFn: () => api.getLikedSongs() });
  const { data: savedSongs = [], isLoading: savedLoading } = useQuery({ queryKey: ["saved-songs"], queryFn: () => api.getSavedSongs() });
  const { data: historyLogs = [] } = useQuery({ queryKey: ["history"], queryFn: () => api.getHistory() });
  const { data: allSongs = [] } = useQuery({ queryKey: ["songs"], queryFn: () => api.getSongs() });
  const { data: userMoments = [], isLoading: momentsLoading } = useQuery({
    queryKey: ["user-moments"],
    queryFn: () => api.getUserMoments(),
  });

  const user = {
    name:      authUser?.displayName || userProfile?.displayName || "Vibe Scroller",
    handle:    `@${authUser?.username || userProfile?.username || "vibescroller"}`,
    bio:       authUser?.bio         || userProfile?.bio         || "Music is life.",
    followers: userProfile?.followers || 0,
    following: userProfile?.following || 0,
    avatarUrl: authUser?.avatarUrl   || userProfile?.avatarUrl   || "https://i.pravatar.cc/150?u=vibescroller",
  };

  const playlists = [
    { title: "Late Night Drive", count: 12, cover: allSongs[0]?.coverUrl || "" },
    { title: "Gym Hype", count: 24, cover: allSongs[3]?.coverUrl || allSongs[0]?.coverUrl || "" },
    { title: "Focus Mode", count: 8, cover: allSongs[1]?.coverUrl || allSongs[0]?.coverUrl || "" }
  ].filter(p => p.cover);

  const listeningHistory = historyLogs.map(log => {
    const song = allSongs.find(s => s.id === log.songId);
    return song ? {
      ...song,
      playedAt: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } : null;
  }).filter(Boolean) as (ApiSong & { playedAt: string })[];


  return (
    <div className="min-h-screen bg-background pb-20 page-enter">
      {/* Profile Header */}
      <div className="relative pt-12 pb-6 px-6 glass rounded-b-[2.5rem]">
        <div className="absolute top-6 left-6">
          <RythamLogo size="xs" />
        </div>
        <div className="absolute top-6 right-6 flex gap-4">
          {role === "admin" && (
            <Link href="/admin">
              <a className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors" title="Admin Panel">
                <BarChart2 size={18} className="text-primary" />
              </a>
            </Link>
          )}
          <button
            data-testid="button-settings"
            onClick={() => setLocation("/settings")}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Account Settings"
          >
            <Settings size={20} className="text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center mt-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/30 p-1">
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
            </div>
            <button
              data-testid="button-edit-profile"
              onClick={() => {
                setEditDisplayName(user.name);
                setEditBio(user.bio);
                setShowEditProfile(true);
              }}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <Edit2 size={14} className="text-primary-foreground" />
            </button>
          </div>
          
          <h1 className="text-2xl font-display font-bold text-white mt-4">{user.name}</h1>
          <p className="text-white/60 text-sm font-medium">{user.handle}</p>
          <p className="text-white/80 text-sm mt-3 text-center max-w-[80%] leading-relaxed">{user.bio}</p>
          
          <div className="flex items-center gap-8 mt-6 bg-white/5 rounded-2xl px-6 py-3 border border-white/10">
             <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
               <p className="text-lg font-bold text-white">{user.followers.toLocaleString()}</p>
               <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Followers</p>
             </div>
             <div className="w-px h-8 bg-white/10" />
             <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
               <p className="text-lg font-bold text-white">{user.following.toLocaleString()}</p>
               <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Following</p>
             </div>
             <div className="w-px h-8 bg-white/10" />
             <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
               <p className="text-lg font-bold text-white">42</p>
               <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Artists</p>
             </div>
          </div>
        </div>
      </div>

      {/* Become an Artist banner — only for regular users */}
      {role === "user" && (
        <div className="px-4 pt-4">
          {!myRequest ? (
            /* No request yet — show CTA */
            <button
              data-testid="button-become-artist"
              onClick={() => setShowArtistModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:border-primary/60 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Mic2 size={16} className="text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">Become an Artist</p>
                <p className="text-[10px] text-white/40">Apply to upload music and reach listeners</p>
              </div>
              <ChevronRight size={16} className="text-white/30 shrink-0" />
            </button>
          ) : myRequest.status === "pending" ? (
            /* Pending */
            <div
              data-testid="status-artist-request-pending"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30"
            >
              <Clock size={16} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-400">Application Under Review</p>
                <p className="text-[10px] text-amber-400/60">An admin is reviewing your request</p>
              </div>
              <button
                data-testid="button-refresh-role"
                onClick={handleRoleRefresh}
                disabled={refreshingRole}
                className="text-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-40"
                title="Refresh status"
              >
                <RefreshCw size={14} className={refreshingRole ? "animate-spin" : ""} />
              </button>
            </div>
          ) : myRequest.status === "approved" ? (
            /* Approved — role update might be pending a re-login */
            <div
              data-testid="status-artist-request-approved"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30"
            >
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-400">Application Approved!</p>
                <p className="text-[10px] text-green-400/60">Refresh to unlock your artist account</p>
              </div>
              <button
                data-testid="button-refresh-role-approved"
                onClick={handleRoleRefresh}
                disabled={refreshingRole}
                className="text-green-400/60 hover:text-green-400 transition-colors disabled:opacity-40"
              >
                <RefreshCw size={14} className={refreshingRole ? "animate-spin" : ""} />
              </button>
            </div>
          ) : myRequest.status === "rejected" ? (
            /* Rejected */
            <div
              data-testid="status-artist-request-rejected"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30"
            >
              <XCircle size={16} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-400">Application Not Accepted</p>
                {myRequest.adminNote && (
                  <p className="text-[10px] text-red-400/60 truncate">Note: {myRequest.adminNote}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Artist / Admin badge pill */}
      {(role === "artist" || role === "admin") && (
        <div className="px-4 pt-4">
          <div
            data-testid="badge-role"
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
              role === "admin"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-primary/10 border-primary/30 text-primary"
            )}
          >
            <Mic2 size={12} />
            {role === "admin" ? "Platform Admin" : "Verified Artist"}
          </div>
        </div>
      )}

      {/* Scrollable Tabs */}
      <div className="overflow-x-auto no-scrollbar border-b border-white/5 mt-4">
        <div className="flex px-4 min-w-max">
          <button 
            onClick={() => setActiveTab('liked')}
            className={cn("flex flex-col items-center gap-2 transition-colors px-4 py-3 relative", activeTab === 'liked' ? "text-primary" : "text-white/50 hover:text-white/80")}
          >
            <Heart size={20} className={activeTab === 'liked' ? "fill-primary" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Likes</span>
            {activeTab === 'liked' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('playlists')}
            className={cn("flex flex-col items-center gap-2 transition-colors px-4 py-3 relative", activeTab === 'playlists' ? "text-primary" : "text-white/50 hover:text-white/80")}
          >
            <ListMusic size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Playlists</span>
            {activeTab === 'playlists' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={cn("flex flex-col items-center gap-2 transition-colors px-4 py-3 relative", activeTab === 'saved' ? "text-primary" : "text-white/50 hover:text-white/80")}
          >
            <Bookmark size={20} className={activeTab === 'saved' ? "fill-primary" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Saved</span>
            {activeTab === 'saved' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />}
          </button>

          <button 
            onClick={() => setActiveTab('moments')}
            className={cn("flex flex-col items-center gap-2 transition-colors px-4 py-3 relative", activeTab === 'moments' ? "text-primary" : "text-white/50 hover:text-white/80")}
          >
            <Quote size={20} className={activeTab === 'moments' ? "fill-primary text-primary" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Moments</span>
            {activeTab === 'moments' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />}
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={cn("flex flex-col items-center gap-2 transition-colors px-4 py-3 relative", activeTab === 'history' ? "text-primary" : "text-white/50 hover:text-white/80")}
          >
            <History size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
            {activeTab === 'history' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 mt-6">
        {activeTab === 'liked' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {likedLoading && [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
            {!likedLoading && likedSongs.length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Heart size={24} className="text-white/30" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Likes Yet</h3>
                <p className="text-sm text-white/50">Double-tap a song in the feed to like it.</p>
              </div>
            )}
            {likedSongs.map((song) => (
              <LikedSongRow
                key={song.id}
                song={song}
                onUnlike={() => {
                  api.unlikeSong(song.id)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["liked-songs"] });
                      toast({ description: `Removed ${song.title} from likes` });
                    })
                    .catch(() => toast({ description: "Failed to unlike", variant: "destructive" }));
                }}
              />
            ))}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {savedLoading && [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
            {!savedLoading && savedSongs.length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Bookmark size={24} className="text-white/30" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Saved Songs</h3>
                <p className="text-sm text-white/50">Tap the bookmark on any song to save it for later.</p>
              </div>
            )}
            {savedSongs.map((song) => (
              <SavedSongRow
                key={song.id}
                song={song}
                onUnsave={() => {
                  api.unsaveSong(song.id)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["saved-songs"] });
                      toast({ description: `Removed ${song.title} from saved` });
                    })
                    .catch(() => toast({ description: "Failed to unsave", variant: "destructive" }));
                }}
              />
            ))}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Create New Playlist Button */}
             <button
               data-testid="button-new-playlist"
               onClick={() => toast({ title: "New Playlist", description: "Playlist creation coming soon." })}
               className="aspect-square rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all group bg-white/[0.02]"
             >
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors relative">
                   <div className="w-6 h-0.5 bg-white/60 group-hover:bg-primary rounded-full absolute" />
                   <div className="h-6 w-0.5 bg-white/60 group-hover:bg-primary rounded-full absolute" />
                </div>
                <p className="font-semibold text-sm text-white/60 group-hover:text-primary transition-colors">New Playlist</p>
             </button>

             {playlists.map((pl, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-square rounded-3xl overflow-hidden relative mb-3 shadow-lg border border-white/5">
                    <img src={pl.cover} alt={pl.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                       <p className="text-xs font-bold text-white bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
                          <ListMusic size={12} className="text-primary" /> {pl.count}
                       </p>
                    </div>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.6)] scale-90 group-hover:scale-100 transition-transform">
                         <Play size={24} className="text-primary-foreground fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white px-1 text-sm">{pl.title}</h3>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'moments' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {momentsLoading && [...Array(2)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-5 animate-pulse">
                <div className="flex gap-2 mb-4">
                  <div className="h-5 w-16 bg-white/10 rounded-full" />
                  <div className="h-5 w-20 bg-white/10 rounded-full ml-auto" />
                </div>
                <div className="space-y-2 py-4">
                  <div className="h-6 bg-white/10 rounded w-4/5" />
                  <div className="h-6 bg-white/10 rounded w-3/5" />
                </div>
                <div className="h-4 bg-white/10 rounded w-full mt-2" />
              </div>
            ))}
            {!momentsLoading && userMoments.length > 0 ? userMoments.map((moment) => (
              <div key={moment.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 relative overflow-hidden group">
                {/* Background blur from cover */}
                <div 
                  className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl" 
                  style={{ backgroundImage: `url(${moment.song?.coverUrl})` }}
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/20">{moment.mood}</span>
                    <span className="text-xs font-medium text-white/40">{new Date(moment.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="px-2 py-4">
                    <Quote className="text-primary/30 w-8 h-8 mb-2 -ml-2" />
                    <p className="font-display text-2xl font-bold text-white italic leading-tight">
                      "{moment.lyricLine}"
                    </p>
                  </div>
                  
                  <p className="text-sm text-white/80 mt-2 mb-5 px-2">{moment.caption}</p>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
                      <img src={moment.song?.coverUrl} alt="cover" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{moment.song?.title}</p>
                      <p className="text-xs text-white/50">{moment.song?.artist}</p>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <Play size={14} className="text-white fill-white ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Quote size={24} className="text-white/40" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Moments Yet</h3>
                <p className="text-sm text-white/50">Share your favorite lyrics and moods from the feed.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && listeningHistory.length === 0 && (
          <div className="text-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <History size={24} className="text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Listening History</h3>
            <p className="text-sm text-white/50">Songs you listen to will appear here.</p>
          </div>
        )}

        {activeTab === 'history' && listeningHistory.length > 0 && (
          <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-500 relative before:absolute before:inset-0 before:ml-[27px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {listeningHistory.map((song, i) => (
              <div key={`${song.id}-${i}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-3">
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white/20 bg-background group-hover:border-primary group-hover:bg-primary/20 transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_0_4px_var(--background)] relative z-10 ml-4 md:ml-0">
                  <div className="w-1.5 h-1.5 bg-white/50 group-hover:bg-primary rounded-full transition-colors" />
                </div>
                
                {/* Time label */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6 text-xs font-medium text-white/40 md:group-odd:text-right absolute left-12 md:static mt-12 md:mt-0">
                  {song.playedAt}
                </div>

                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6">
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group/card border border-transparent hover:border-white/10">
                    <div className="w-12 h-12 rounded-xl overflow-hidden relative">
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <Play size={16} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{song.title}</h3>
                      <p className="text-xs text-white/50 truncate">{song.artist}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditProfile(false)} />
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-4 animate-slide-up">
            <button
              onClick={() => setShowEditProfile(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Edit2 size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Edit Profile</h2>
                <p className="text-xs text-white/40">Update your display name and bio</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Display Name</label>
                <input
                  data-testid="input-display-name"
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  maxLength={60}
                  placeholder="Your display name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Bio</label>
                <textarea
                  data-testid="input-bio"
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Tell us about yourself…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-primary/40 transition-colors"
                />
                <p className="text-[10px] text-white/20 text-right mt-1">{editBio.length}/200</p>
              </div>
            </div>

            <button
              data-testid="button-save-profile"
              disabled={editProfileMutation.isPending || !editDisplayName.trim()}
              onClick={() => editProfileMutation.mutate({ displayName: editDisplayName.trim(), bio: editBio.trim() })}
              className="w-full py-3 rounded-2xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {editProfileMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Become an Artist — application modal */}
      {showArtistModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowArtistModal(false)}
          />
          {/* Sheet */}
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-5 animate-slide-up">
            {/* Close */}
            <button
              data-testid="button-close-artist-modal"
              onClick={() => setShowArtistModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Mic2 size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Apply to be an Artist</h2>
                <p className="text-xs text-white/40">Tell us about your music journey</p>
              </div>
            </div>

            {/* What you get */}
            <div className="space-y-2">
              {[
                "Upload your original tracks",
                "Access the Artist Portal",
                "Reach listeners on the feed",
                "View track analytics",
              ].map(perk => (
                <div key={perk} className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-primary shrink-0" />
                  <p className="text-xs text-white/60">{perk}</p>
                </div>
              ))}
            </div>

            {/* Reason textarea */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">
                Why do you want to be an artist? (optional)
              </label>
              <textarea
                data-testid="input-artist-reason"
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder="Tell us a little about yourself and your music…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              data-testid="button-submit-artist-request"
              disabled={submitRequestMutation.isPending}
              onClick={() => submitRequestMutation.mutate(requestReason)}
              className="w-full py-3 rounded-2xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitRequestMutation.isPending ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Mic2 size={16} />
              )}
              Submit Application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function LikedSongRow({ song, onUnlike }: { song: ApiSong; onUnlike: () => void }) {
  const [removing, setRemoving] = useState(false);
  return (
    <div
      data-testid={`card-liked-song-${song.id}`}
      className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/10"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0">
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} className="text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-base truncate">{song.title}</h3>
        <p className="text-sm text-white/50 truncate">{song.artist}</p>
      </div>
      <button
        data-testid={`button-unlike-${song.id}`}
        disabled={removing}
        onClick={(e) => {
          e.stopPropagation();
          setRemoving(true);
          onUnlike();
        }}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-500/10 transition-colors group/unlike shrink-0"
        title="Remove like"
      >
        <Heart size={18} className={cn("transition-colors", removing ? "text-white/30" : "fill-primary text-primary group-hover/unlike:fill-red-400 group-hover/unlike:text-red-400")} />
      </button>
    </div>
  );
}

function SavedSongRow({ song, onUnsave }: { song: ApiSong; onUnsave: () => void }) {
  const [removing, setRemoving] = useState(false);
  return (
    <div
      data-testid={`card-saved-song-${song.id}`}
      className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/10"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0">
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} className="text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-base truncate">{song.title}</h3>
        <p className="text-sm text-white/50 truncate">{song.artist}</p>
      </div>
      <button
        data-testid={`button-unsave-${song.id}`}
        disabled={removing}
        onClick={(e) => {
          e.stopPropagation();
          setRemoving(true);
          onUnsave();
        }}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors group/unsave shrink-0"
        title="Remove from saved"
      >
        <Bookmark size={18} className={cn("transition-colors", removing ? "text-white/30" : "fill-primary text-primary group-hover/unsave:fill-white/70 group-hover/unsave:text-white/70")} />
      </button>
    </div>
  );
}
