export enum Mood {
  Happy = "Happy",
  Melancholic = "Melancholic",
  Energetic = "Energetic",
  Relaxed = "Relaxed",
  Focus = "Focus",
  Romantic = "Romantic",
  Dark = "Dark",
  Euphoric = "Euphoric",
  Nostalgic = "Nostalgic",
  Aggressive = "Aggressive"
}

export enum Genre {
  Pop = "Pop",
  Rock = "Rock",
  HipHop = "Hip Hop",
  Jazz = "Jazz",
  Classical = "Classical",
  Electronic = "Electronic",
  RnB = "R&B",
  Indie = "Indie",
  Metal = "Metal",
  KPop = "K-Pop",
  Folk = "Folk",
  Experimental = "Experimental"
}

export interface UserPreferences {
  moods: Mood[];
  genres: Genre[];
  activity: string;
  era: string;
  similarArtists: string;
  specificDetails: string; 
  isSpotifyConnected: boolean; // New field to track connection status
}

export interface SongRecommendation {
  artist: string;
  title: string;
  album: string;
  year: string;
  genre: string;
  reasoning: string;
  musicalAnalysis: string;
  moodTags: string[];
  // New numeric fields
  tempo: number;       // BPM
  energyLevel: number; // 1-100
  emotionDepth: number; // 1-100
}

export interface SongConcept {
  title: string;
  style: string;
  tempo: string;
  key: string;
  instruments: string[];
  lyrics: string;
  compositionNotes: string;
}