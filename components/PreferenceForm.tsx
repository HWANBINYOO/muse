import React, { useState } from 'react';
import { UserPreferences, Mood, Genre } from '../types';
import { Music, Activity, Clock, User, Sparkles, CheckCircle2 } from 'lucide-react';

// Mapping for Korean display
const MoodMap: Record<Mood, string> = {
  [Mood.Happy]: "행복함",
  [Mood.Melancholic]: "우울함",
  [Mood.Energetic]: "신남/에너지",
  [Mood.Relaxed]: "편안함",
  [Mood.Focus]: "집중",
  [Mood.Romantic]: "로맨틱",
  [Mood.Dark]: "어두움",
  [Mood.Euphoric]: "황홀함",
  [Mood.Nostalgic]: "그리움/추억",
  [Mood.Aggressive]: "강렬함"
};

const GenreMap: Record<Genre, string> = {
  [Genre.Pop]: "팝",
  [Genre.Rock]: "록/밴드",
  [Genre.HipHop]: "힙합",
  [Genre.Jazz]: "재즈",
  [Genre.Classical]: "클래식",
  [Genre.Electronic]: "일렉트로니카",
  [Genre.RnB]: "R&B",
  [Genre.Indie]: "인디",
  [Genre.Metal]: "메탈",
  [Genre.KPop]: "K-Pop",
  [Genre.Folk]: "포크/어쿠스틱",
  [Genre.Experimental]: "실험적 음악"
};

interface PreferenceFormProps {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({ onSubmit, isLoading }) => {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activity, setActivity] = useState('');
  const [era, setEra] = useState('');
  const [similarArtists, setSimilarArtists] = useState('');
  const [specificDetails, setSpecificDetails] = useState('');
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  const toggleMood = (mood: Mood) => {
    setMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
  };

  const toggleGenre = (genre: Genre) => {
    setGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const handleSpotifyConnect = () => {
    // Simulate Spotify Connection
    setIsSpotifyConnected(true);
    // Simulate pre-filling data based on "Spotify Analysis"
    if (genres.length === 0) setGenres([Genre.RnB, Genre.Indie, Genre.Pop]);
    if (!similarArtists) setSimilarArtists("NewJeans, Frank Ocean, The Weeknd");
    if (!era) setEra("2020s, 90s R&B");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      moods,
      genres,
      activity,
      era,
      similarArtists,
      specificDetails,
      isSpotifyConnected
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
          나만의 음악 큐레이터
        </h2>
        <p className="text-slate-500 font-medium keep-all">
          원하는 분위기와 상황을 알려주세요. AI가 당신을 위한 완벽한 플레이리스트를 찾아드립니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Mood Section */}
        <div>
          <label className="block text-slate-900 font-bold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 fill-current" /> 현재 기분 (다중 선택 가능)
          </label>
          <div className="flex flex-wrap gap-3">
            {Object.values(Mood).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMood(m)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                  moods.includes(m)
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform -translate-y-0.5'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {MoodMap[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Section */}
        <div>
          <label className="block text-slate-900 font-bold text-lg mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-500 fill-current" /> 선호 장르
          </label>
          <div className="flex flex-wrap gap-3">
            {Object.values(Genre).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                  genres.includes(g)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {GenreMap[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Activity */}
          <div>
            <label className="block text-slate-900 font-bold text-lg mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" /> 현재 활동 / 상황
            </label>
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="예: 새벽 코딩, 헬스장"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-400 transition-all font-medium"
            />
          </div>

          {/* Era */}
          <div>
            <label className="block text-slate-900 font-bold text-lg mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> 선호하는 시대
            </label>
            <input
              type="text"
              value={era}
              onChange={(e) => setEra(e.target.value)}
              placeholder="예: 80년대 시티팝, 최신 유행"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-400 transition-all font-medium"
            />
          </div>
        </div>

        {/* Artists */}
        <div>
          <label className="block text-slate-900 font-bold text-lg mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" /> 좋아하는 아티스트 / 레퍼런스
          </label>
          <input
            type="text"
            value={similarArtists}
            onChange={(e) => setSimilarArtists(e.target.value)}
            placeholder="평소 즐겨듣는 가수나 밴드를 입력하세요"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-400 transition-all font-medium"
          />
          {isSpotifyConnected && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium animate-in slide-in-from-top-1">
              <CheckCircle2 className="w-3 h-3" /> Spotify 데이터가 반영되었습니다.
            </p>
          )}
        </div>

        {/* Specific Details */}
        <div>
          <label className="block text-slate-900 font-bold text-lg mb-3">
            구체적인 요청사항 / 바이브
          </label>
          <textarea
            value={specificDetails}
            onChange={(e) => setSpecificDetails(e.target.value)}
            placeholder="예: 베이스가 둥둥거리는 몽환적인 느낌, 여자 보컬의 R&B 등 구체적으로 적어주세요."
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-400 resize-none transition-all font-medium"
          />
        </div>

        <div className="space-y-4">
            {/* Submit Button */}
            <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl shadow-xl transform transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg"
            >
            {isLoading ? (
                <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>음악 분석 중...</span>
                </>
            ) : (
                <>
                <Sparkles className="w-5 h-5 fill-current" />
                <span>플레이리스트 생성하기</span>
                </>
            )}
            </button>

            {/* Subtle Spotify Link */}
            <div className="text-center pt-2">
                {!isSpotifyConnected ? (
                <button 
                    type="button"
                    onClick={handleSpotifyConnect}
                    className="text-xs text-slate-400 hover:text-[#1DB954] font-semibold transition-colors flex items-center justify-center gap-1.5 mx-auto"
                >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>Spotify 연동하여 더 정확한 추천받기</span>
                </button>
                ) : (
                <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Spotify 계정 연결됨
                </span>
                )}
            </div>
        </div>

      </form>
    </div>
  );
};

export default PreferenceForm;