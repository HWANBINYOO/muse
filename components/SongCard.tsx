import React from 'react';
import { SongRecommendation } from '../types';
import { Play, Search, Info, Disc, Activity, Zap, Heart } from './Icons';

interface SongCardProps {
  song: SongRecommendation;
  index: number;
}

const SongCard: React.FC<SongCardProps> = ({ song, index }) => {
  // Generate a distinct gradient based on the index for visual variety
  const gradients = [
    "from-slate-900 to-slate-700",
    "from-indigo-900 to-slate-800",
    "from-zinc-800 to-stone-800",
    "from-neutral-900 to-neutral-700",
    "from-blue-950 to-slate-900",
    "from-gray-900 to-gray-800",
  ];
  const bgGradient = gradients[index % gradients.length];

  return (
    <div className="group flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-slate-400 transition-all duration-300 hover:shadow-2xl shadow-sm hover:-translate-y-1">
      
      {/* Header: Abstract Gradient + Tags on Top */}
      <div className={`h-40 bg-gradient-to-br ${bgGradient} p-5 relative flex flex-col justify-between overflow-hidden`}>
         
         {/* Background Decoration */}
         <div className="absolute right-[-30px] top-[-30px] opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-45">
            <Disc className="w-48 h-48 text-white" />
         </div>

         {/* Tags Row - Now on Top for Visibility */}
         <div className="relative z-10 flex flex-wrap gap-2 content-start">
            {song.moodTags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-sm">
                #{tag}
                </span>
            ))}
         </div>
         
         {/* Year & Genre Badges */}
         <div className="relative z-10 flex justify-between items-end mt-auto">
             <div className="flex flex-col text-white">
                <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Released</span>
                <span className="text-xl font-black">{song.year}</span>
             </div>
             <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-bold shadow-lg">
               {song.genre}
            </span>
         </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6 flex-1 flex flex-col -mt-4 bg-white rounded-t-3xl relative z-20">
        
        {/* Title & Artist */}
        <div className="mb-6 text-center">
            <h3 className="text-xl font-black text-slate-900 leading-tight mb-1 line-clamp-1">{song.title}</h3>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wide">
                {song.artist}
            </p>
        </div>

        {/* Numeric Indicators */}
        <div className="grid grid-cols-3 gap-2 mb-6 border-b border-slate-100 pb-6">
            <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1 text-slate-400">
                    <Activity className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">BPM</span>
                </div>
                <span className="text-lg font-black text-slate-800">{song.tempo || 100}</span>
            </div>
            <div className="text-center border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 mb-1 text-slate-400">
                    <Zap className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Energy</span>
                </div>
                <span className="text-lg font-black text-amber-500">{song.energyLevel || 50}</span>
            </div>
            <div className="text-center border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 mb-1 text-slate-400">
                    <Heart className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Emotion</span>
                </div>
                <span className="text-lg font-black text-rose-500">{song.emotionDepth || 50}</span>
            </div>
        </div>

        {/* Curator's Note - Clean & Concise */}
        <div className="mb-4 flex-1">
          <p className="text-slate-700 text-sm leading-6 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            "{song.reasoning}"
          </p>
        </div>

        {/* Technical Analysis - Small Footnote */}
        <p className="text-[11px] text-slate-400 text-center mb-5 font-medium px-2 truncate">
           Sound ID: {song.musicalAnalysis}
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <a 
            href={`https://open.spotify.com/search/${encodeURIComponent(song.artist + " " + song.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-white py-3.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg shadow-green-500/20 active:scale-95 group/btn"
          >
            <Play className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" /> 재생
          </a>
          <a 
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + " " + song.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3.5 rounded-xl text-sm font-bold transition-all hover:border-slate-300 active:scale-95"
          >
            <Search className="w-4 h-4" /> 검색
          </a>
        </div>
      </div>
    </div>
  );
};

export default SongCard;