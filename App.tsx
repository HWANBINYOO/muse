import React, { useState } from 'react';
import PreferenceForm from './components/PreferenceForm';
import SongCard from './components/SongCard';
import StatsView from './components/StatsView';
import StudioView from './components/StudioView';
import { UserPreferences, SongRecommendation } from './types';
import { getMusicRecommendations } from './services/geminiService';
import { Headphones, ArrowLeft, Loader2, BarChart2, Music, Mic2 } from './components/Icons';

type ViewState = 'home' | 'stats' | 'studio';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [recommendations, setRecommendations] = useState<SongRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handlePreferenceSubmit = async (prefs: UserPreferences) => {
    setIsLoading(true);
    setError(null);
    setRecommendations([]);
    
    try {
      const results = await getMusicRecommendations(prefs);
      setRecommendations(results);
      setHasSearched(true);
    } catch (err) {
      setError("음악 매트릭스에 연결하는 중 문제가 발생했습니다. 다시 시도해 주세요.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSearch = () => {
    setHasSearched(false);
    setRecommendations([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-black selection:text-white font-sans flex flex-col">
      
      {/* Header - Light Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky-header">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => {
                setCurrentView('home');
                if (hasSearched) resetSearch();
            }}
          >
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">
              Sonic<span className="text-slate-500">Muse</span>
            </h1>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
             <button 
                onClick={() => setCurrentView('home')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${currentView === 'home' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
             >
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">추천받기</span>
             </button>
             <button 
                onClick={() => setCurrentView('stats')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${currentView === 'stats' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
             >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">내 통계</span>
             </button>
             <button 
                onClick={() => setCurrentView('studio')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${currentView === 'studio' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
             >
                <Mic2 className="w-4 h-4" />
                <span className="hidden sm:inline">Studio</span>
             </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto w-full flex-1">
        
        {currentView === 'home' && (
            <>
                {/* Back Button for Search Results */}
                {hasSearched && (
                    <div className="mb-6 animate-in slide-in-from-left-4 duration-500">
                        <button 
                        onClick={resetSearch}
                        className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white hover:shadow-sm transition-all w-fit border border-transparent hover:border-slate-200"
                        >
                        <ArrowLeft className="w-4 h-4" /> 처음으로 돌아가기
                        </button>
                    </div>
                )}

                {!hasSearched && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <PreferenceForm onSubmit={handlePreferenceSubmit} isLoading={isLoading} />
                </div>
                )}

                {hasSearched && recommendations.length > 0 && (
                <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">당신만을 위한 추천곡</h2>
                    <p className="text-slate-500 font-medium">AI가 분석한 고유한 취향 프로필을 기반으로 엄선했습니다.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations.map((song, index) => (
                        <SongCard key={index} song={song} index={index} />
                    ))}
                    </div>

                    <div className="flex justify-center mt-12 pb-8">
                    <button 
                        onClick={resetSearch}
                        className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> 다른 분위기로 추천받기
                    </button>
                    </div>
                </div>
                )}

                {isLoading && hasSearched && recommendations.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Music className="w-6 h-6 text-slate-900" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl text-slate-900 font-bold">음악 아카이브를 탐색하는 중입니다...</p>
                        <p className="text-slate-500">당신의 취향을 분석하고 있습니다.</p>
                    </div>
                </div>
                )}

                {error && (
                <div className="max-w-md mx-auto mt-8 bg-white border border-red-100 rounded-2xl p-6 text-center shadow-lg shadow-red-500/5">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <p className="text-slate-800 font-semibold mb-2">{error}</p>
                    <button 
                    onClick={resetSearch} 
                    className="text-sm text-red-600 hover:text-red-700 font-bold mt-2 hover:underline"
                    >
                    다시 시도하기
                    </button>
                </div>
                )}
            </>
        )}
        
        {currentView === 'stats' && <StatsView />}
        {currentView === 'studio' && <StudioView />}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm font-medium">
          <p>© {new Date().getFullYear()} SonicMuse AI. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;