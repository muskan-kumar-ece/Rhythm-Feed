import synthwaveImg from '../assets/images/cover-synthwave.png';
import lofiImg from '../assets/images/cover-lofi.png';
import sadImg from '../assets/images/cover-sad.png';
import gymImg from '../assets/images/cover-gym.png';

export type SongFeatures = {
  tempo: 'slow' | 'medium' | 'fast';
  energy: 'low' | 'medium' | 'high';
  genre: string[];
  mood: string[]; // Expanded from single string to array for better matching
  popularity: number; // 0-100 score combining likes, saves, plays
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string; // We'll just use a dummy or no audio for mockup
  mood: string; // Primary mood for display
  likes: number;
  comments: number;
  saves: number;
  lyrics: { time: number; text: string }[];
  isFollowingArtist: boolean;
  features: SongFeatures; // New detailed metadata
};

export const dummySongs: Song[] = [
  {
    id: "1",
    title: "Midnight Drive",
    artist: "Neon Waves",
    coverUrl: synthwaveImg,
    audioUrl: "",
    mood: "Focus",
    likes: 12400,
    comments: 342,
    saves: 890,
    isFollowingArtist: false,
    features: {
      tempo: 'medium',
      energy: 'medium',
      genre: ['Synthwave', 'Electronic', 'Retrowave'],
      mood: ['Focus', 'Night Drive', 'Nostalgic'],
      popularity: 85
    },
    lyrics: [
      { time: 0, text: "Cruising down the empty street" },
      { time: 3, text: "Neon lights and synthetic beat" },
      { time: 6, text: "Lost in the rhythm of the night" },
      { time: 9, text: "Everything is feeling right" }
    ]
  },
  {
    id: "2",
    title: "Late Night Studies",
    artist: "ChillHop Beats",
    coverUrl: lofiImg,
    audioUrl: "",
    mood: "Study",
    likes: 45200,
    comments: 1205,
    saves: 5600,
    isFollowingArtist: true,
    features: {
      tempo: 'slow',
      energy: 'low',
      genre: ['Lofi', 'Hip Hop', 'Chill'],
      mood: ['Study', 'Relax', 'Sad', 'Cozy'],
      popularity: 92
    },
    lyrics: [
      { time: 0, text: "Rain tapping on the glass" },
      { time: 3, text: "Watching the hours pass" },
      { time: 6, text: "Coffee cold but mind awake" },
      { time: 9, text: "For another memory to make" }
    ]
  },
  {
    id: "3",
    title: "Heavy Thoughts",
    artist: "The Rain",
    coverUrl: sadImg,
    audioUrl: "",
    mood: "Sad",
    likes: 8900,
    comments: 89,
    saves: 430,
    isFollowingArtist: false,
    features: {
      tempo: 'slow',
      energy: 'low',
      genre: ['Ambient', 'Cinematic', 'Acoustic'],
      mood: ['Sad', 'Melancholy', 'Reflective'],
      popularity: 65
    },
    lyrics: [
      { time: 0, text: "I can't seem to find the words" },
      { time: 3, text: "In this quiet, lonely world" },
      { time: 6, text: "Shadows dancing on the wall" },
      { time: 9, text: "Waiting for the rain to fall" }
    ]
  },
  {
    id: "4",
    title: "IRON WILL",
    artist: "PRXJECT",
    coverUrl: gymImg,
    audioUrl: "",
    mood: "Gym",
    likes: 67300,
    comments: 2100,
    saves: 12400,
    isFollowingArtist: false,
    features: {
      tempo: 'fast',
      energy: 'high',
      genre: ['Phonk', 'Electronic', 'Bass'],
      mood: ['Gym', 'Hype', 'Aggressive', 'Focus'],
      popularity: 95
    },
    lyrics: [
      { time: 0, text: "Push it to the absolute limit" },
      { time: 3, text: "No excuses, gotta get in it" },
      { time: 6, text: "Feel the burn, feel the fire" },
      { time: 9, text: "Taking it higher and higher" }
    ]
  }
];

export const dummyAnalytics = {
  totalPlays: "1.2M",
  completionRate: "68%",
  skipRate: "12%",
  topTime: "10:00 PM - 2:00 AM",
  topLocations: ["Los Angeles, CA", "London, UK", "Tokyo, JP"],
  recentUploads: [
    { title: "Electric Horizon", plays: 45000, date: "2 days ago" },
    { title: "Neon Dreams", plays: 120000, date: "1 week ago" }
  ]
};

export type Moment = {
  id: string;
  user: { name: string; avatarUrl: string };
  song: Song;
  lyricLine: string;
  mood: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
};

export const dummyMoments: Moment[] = [
  {
    id: "m1",
    user: { name: "Alex Vibes", avatarUrl: "https://i.pravatar.cc/150?u=alex" },
    song: dummySongs[2], // Heavy Thoughts
    lyricLine: "Shadows dancing on the wall",
    mood: "Sad",
    caption: "Exactly how I feel tonight. This track hits different when it's raining outside. 🌧️",
    likes: 452,
    comments: 24,
    timestamp: "2 hours ago"
  },
  {
    id: "m2",
    user: { name: "Sarah Code", avatarUrl: "https://i.pravatar.cc/150?u=sarah" },
    song: dummySongs[1], // Late Night Studies
    lyricLine: "Coffee cold but mind awake",
    mood: "Focus",
    caption: "Grinding through this codebase at 3 AM. ChillHop always pulls me through. ☕💻",
    likes: 1205,
    comments: 89,
    timestamp: "5 hours ago"
  },
  {
    id: "m3",
    user: { name: "Jake Fitness", avatarUrl: "https://i.pravatar.cc/150?u=jake" },
    song: dummySongs[3], // IRON WILL
    lyricLine: "No excuses, gotta get in it",
    mood: "Gym",
    caption: "PR day! Let's goooo! 💪🔥",
    likes: 3400,
    comments: 112,
    timestamp: "1 day ago"
  }
];
