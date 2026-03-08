import synthwaveImg from '../assets/images/cover-synthwave.png';
import lofiImg from '../assets/images/cover-lofi.png';
import sadImg from '../assets/images/cover-sad.png';
import gymImg from '../assets/images/cover-gym.png';

export type Song = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string; // We'll just use a dummy or no audio for mockup
  mood: string;
  likes: number;
  comments: number;
  saves: number;
  lyrics: { time: number; text: string }[];
  isFollowingArtist: boolean;
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
