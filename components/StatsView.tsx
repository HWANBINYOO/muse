import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { 
  BarChart2, TrendingUp, Zap, Disc, Music, User, Clock, 
  Sun, Moon, Calendar, Heart, Radio, Mic2, Smile, Sparkles, PieChart,
  Globe, BookOpen, Layers, Hash, ChevronDown, Wand2, Piano, Mic, Music4,
  Play, Pause, Volume2, Sliders, Activity, Download
} from './Icons';
import { generateSongConcept } from '../services/geminiService';
import { SongConcept } from '../types';

type TimeRange = '1M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';

// --- Music Theory & Constants ---
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = {
  Major: [0, 2, 4, 5, 7, 9, 11], // Major Scale Intervals
  Minor: [0, 2, 3, 5, 7, 8, 10]  // Natural Minor Intervals
};

const getScaleNotes = (root: string, isMinor: boolean): string[] => {
  const noteMatch = root.match(/([A-G]#?)(\d+)/);
  if (!noteMatch) return [];
  const pitch = noteMatch[1].toUpperCase();
  const octave = parseInt(noteMatch[2]);
  
  let rootIdx = NOTES.indexOf(pitch);
  const intervals = isMinor ? SCALES.Minor : SCALES.Major;
  
  // Generate 2 octaves of scale notes
  const scaleNotes = [];
  for (let oct = 0; oct < 2; oct++) {
    for (let i = 0; i < intervals.length; i++) {
      const noteIdx = (rootIdx + intervals[i]) % 12;
      const octaveShift = Math.floor((rootIdx + intervals[i]) / 12) + oct;
      scaleNotes.push(`${NOTES[noteIdx]}${octave + octaveShift}`);
    }
  }
  return scaleNotes;
};

const StatsView: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);
  const [songTheme, setSongTheme] = useState('');
  const [generatedSong, setGeneratedSong] = useState<SongConcept | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('Ready');
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'lyrics' | 'tracks'>('tracks');

  // Audio & Visualizer Refs
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);

  const handleGenerateSong = async () => {
    if (!songTheme.trim()) return;
    
    setIsGeneratingSong(true);
    setGeneratedSong(null);
    if (isPlaying) {
      stopAudio();
    }

    try {
      const concept = await generateSongConcept(songTheme);
      setGeneratedSong(concept);
    } catch (error) {
      console.error("Failed to generate song concept:", error);
    } finally {
      setIsGeneratingSong(false);
    }
  };

  const handleDownload = async () => {
    if (!recorderRef.current) return;
    if (recorderRef.current.state === 'started') {
        const recording = await recorderRef.current.stop();
        const url = URL.createObjectURL(recording);
        const anchor = document.createElement("a");
        anchor.download = `${generatedSong?.title || "SonicMuse_Demo"}.webm`;
        anchor.href = url;
        anchor.click();
        setIsRecording(false);
    }
  };

  // --- Cinematic Audio Engine (Tone.js) ---
  const playDemo = async (concept: SongConcept) => {
    if (isPlaying) {
        stopAudio();
        return;
    }

    await Tone.start();
    setIsPlaying(true);
    setIsRecording(true);
    Tone.Transport.cancel();
    Tone.Transport.stop();
    setPlaybackProgress(0);

    // 0. Setup Processing
    if (!analyserRef.current) analyserRef.current = new Tone.Analyser("fft", 256);
    if (!recorderRef.current) recorderRef.current = new Tone.Recorder();
    
    const masterGain = new Tone.Gain(0.9).toDestination();
    const compressor = new Tone.Compressor({ threshold: -20, ratio: 3 }).connect(masterGain);
    const limiter = new Tone.Limiter(-1).connect(compressor);
    
    limiter.connect(analyserRef.current);
    limiter.connect(recorderRef.current);
    recorderRef.current.start();

    // 1. Effects
    const reverb = new Tone.Reverb({ decay: 3.5, preDelay: 0.2, wet: 0.3 }).connect(limiter);
    await reverb.generate();
    const delay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.25, wet: 0.2 }).connect(limiter);
    const chorusEffect = new Tone.Chorus(4, 2.5, 0.5).connect(reverb); // For pads

    // 2. Instrument Design (Higher Quality)
    
    // Pad: Wide, detuned saws
    const padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 30 },
      envelope: { attack: 1, decay: 0.5, sustain: 0.8, release: 2 }
    }).connect(chorusEffect);
    padSynth.volume.value = -14;

    // Bass: FM for grit + Sub
    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: "fmsawtooth" }, // Complex wave
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.5 },
      filterEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.2, baseFrequency: 60, octaves: 3 }
    }).connect(limiter);
    bassSynth.volume.value = -6;

    // Lead: Singing tone with portamento
    const leadSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 1 },
      portamento: 0.02
    }).connect(delay);
    const leadVibrato = new Tone.Vibrato(5, 0.1).connect(delay);
    leadSynth.disconnect();
    leadSynth.connect(leadVibrato);
    leadSynth.volume.value = -6;

    // Arp: Plucky
    const arpSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
    }).connect(delay);
    arpSynth.volume.value = -16;

    // Drums
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05 }).connect(limiter);
    kick.volume.value = -2;
    const snare = new Tone.NoiseSynth({ 
        noise: { type: "white" }, 
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 } 
    }).connect(reverb);
    snare.volume.value = -8;
    const hat = new Tone.MetalSynth({ 
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, 
        envelope: { attack: 0.001, decay: 0.05, release: 0.01 } 
    }).connect(reverb);
    hat.volume.value = -20;

    // 3. Composition Data Setup
    const bpmMatch = concept.tempo.match(/\d+/);
    const bpm = bpmMatch ? parseInt(bpmMatch[0]) : 110;
    Tone.Transport.bpm.value = bpm;

    const keyMatch = concept.key.match(/([A-G]#?)\s*(Major|Minor|m)?/i);
    const rootKey = keyMatch ? keyMatch[1] : "C";
    const isMinor = concept.key.toLowerCase().includes("minor") || concept.key.endsWith("m");
    
    // Scale & Melody Generation
    const scaleNotes = getScaleNotes(`${rootKey}3`, isMinor); // 3rd octave for chords
    const melodyScale = getScaleNotes(`${rootKey}4`, isMinor); // 4th octave for lead

    // Progression Logic (Scale Degrees: 0-based index)
    // Verse: i - vi - III - VII (Minor) / I - vi - IV - V (Major)
    const verseDegrees = isMinor ? [0, 5, 2, 6] : [0, 5, 3, 4]; 
    // Chorus: VI - VII - i - III (Minor) / IV - V - I - vi (Major) - More energy
    const chorusDegrees = isMinor ? [5, 6, 0, 2] : [3, 4, 0, 5];

    // Helper to build chords (Root, 3rd, 5th)
    const getChord = (degree: number) => {
        const root = scaleNotes[degree];
        const third = scaleNotes[(degree + 2) % 7];
        const fifth = scaleNotes[(degree + 4) % 7];
        return [root, third, fifth];
    };
    // Helper for bass note
    const getBass = (degree: number) => {
        const note = scaleNotes[degree];
        // Drop 2 octaves
        return note.replace(/\d+/, (d) => (parseInt(d) - 2).toString());
    };

    // Melody Motif Generation (Procedural)
    // Create a 4-note motif to repeat/vary
    const motifIndices = [0, 2, 4, 1]; // Scale degrees relative to chord root? No, absolute scale degrees.
    const motif = motifIndices.map(i => melodyScale[i]);

    // 4. Sequencing (The Arrangement)
    // Structure: Intro (4 bars) -> Verse (8 bars) -> Chorus (8 bars) -> Outro (4 bars) = 24 bars
    
    const measureTime = Tone.Time("1m").toSeconds();
    const totalDuration = measureTime * 24;

    // --- LOOP FUNCTIONS ---

    // A. Chords & Bass Loop
    const harmonicLoop = new Tone.Loop((time) => {
        // Calculate current bar
        const bar = Math.floor(Tone.Transport.position.toString().split(':')[0] as any);
        const beat = Math.floor(Tone.Transport.position.toString().split(':')[1] as any);

        let progression = verseDegrees;
        let intensity = 0; // 0: Low, 1: High

        if (bar < 4) { setCurrentSection("Intro"); intensity = 0.2; }
        else if (bar < 12) { setCurrentSection("Verse"); progression = verseDegrees; intensity = 0.5; }
        else if (bar < 20) { setCurrentSection("Chorus"); progression = chorusDegrees; intensity = 1.0; }
        else { setCurrentSection("Outro"); intensity = 0.3; }

        // Chord Change every bar
        const chordIdx = bar % 4;
        const degree = progression[chordIdx];
        const chord = getChord(degree);
        const bassNote = getBass(degree);

        // Play Pad (Always)
        padSynth.triggerAttackRelease(chord, "1m", time, intensity * 0.8 + 0.2);

        // Play Bass
        if (intensity > 0.3) {
            // Verse Bass: Root on 1, Octave on 3?
            if (intensity < 0.8) {
                bassSynth.triggerAttackRelease(bassNote, "4n", time);
                bassSynth.triggerAttackRelease(bassNote, "8n", time + Tone.Time("2n").toSeconds());
            } else {
                // Chorus Bass: Driving 8th notes
                for (let i = 0; i < 8; i++) {
                    bassSynth.triggerAttackRelease(bassNote, "8n", time + Tone.Time("8n").toSeconds() * i, 0.8);
                }
            }
        }

        // Play Arp (Chorus Only)
        if (intensity > 0.8) {
            const arpPattern = [...chord, chord[1]]; // Up down-ish
            arpPattern.forEach((n, i) => {
                arpSynth.triggerAttackRelease(n, "16n", time + Tone.Time("4n").toSeconds() * i);
                arpSynth.triggerAttackRelease(n, "16n", time + Tone.Time("4n").toSeconds() * i + Tone.Time("8n").toSeconds());
            });
        }

    }, "1m").start(0);

    // B. Lead Melody Loop
    const melodyLoop = new Tone.Loop((time) => {
        const bar = Math.floor(Tone.Transport.position.toString().split(':')[0] as any);
        
        // No melody in Intro
        if (bar < 4 || bar >= 20) return;

        const isChorus = bar >= 12;
        // Use motif but transpose based on current chord? Or scale?
        // Let's stick to scale for simplicity but vary rhythm.
        
        if (isChorus) {
            // Active Chorus Melody (Higher, syncopated)
            // Note: Use melodyScale (higher octave)
            leadSynth.triggerAttackRelease(melodyScale[4], "4n.", time);
            leadSynth.triggerAttackRelease(melodyScale[3], "8n", time + Tone.Time("4n.").toSeconds());
            leadSynth.triggerAttackRelease(melodyScale[5], "8n", time + Tone.Time("2n").toSeconds());
            leadSynth.triggerAttackRelease(melodyScale[2], "4n", time + Tone.Time("2n").toSeconds() + Tone.Time("8n").toSeconds());
        } else {
            // Calm Verse Melody (Slower, lower)
            // Use lower part of melodyScale
            if (bar % 2 === 0) { // Call
                leadSynth.triggerAttackRelease(melodyScale[0], "2n", time);
                leadSynth.triggerAttackRelease(melodyScale[1], "4n", time + Tone.Time("2n").toSeconds());
            } else { // Response
                leadSynth.triggerAttackRelease(melodyScale[2], "2n.", time);
            }
        }

    }, "1m").start(0);

    // C. Drum Loop
    const drumLoop = new Tone.Loop((time) => {
        const bar = Math.floor(Tone.Transport.position.toString().split(':')[0] as any);
        if (bar < 4 && bar > 0) {
            // Intro buildup (light hats)
             hat.triggerAttackRelease("32n", time, 0.5);
        }
        
        const isChorus = bar >= 12 && bar < 20;
        const isVerse = bar >= 4 && bar < 12;
        const isOutro = bar >= 20;

        if (isVerse || isChorus) {
            const t = time;
            
            // Kick
            kick.triggerAttackRelease("C1", "8n", t); // Beat 1
            if (isChorus) {
                kick.triggerAttackRelease("C1", "8n", t + Tone.Time("4n").toSeconds()); // 4-on-floor
                kick.triggerAttackRelease("C1", "8n", t + Tone.Time("2n").toSeconds());
                kick.triggerAttackRelease("C1", "8n", t + Tone.Time("2n").toSeconds() + Tone.Time("4n").toSeconds());
            } else {
                 kick.triggerAttackRelease("C1", "8n", t + Tone.Time("2n").toSeconds()); // Half time feel
            }

            // Snare / Clap
            if (isChorus) {
                 snare.triggerAttackRelease("16n", t + Tone.Time("4n").toSeconds());
                 snare.triggerAttackRelease("16n", t + Tone.Time("2n").toSeconds() + Tone.Time("4n").toSeconds());
            } else {
                 // Rimshot style (quieter snare) on 4?
                 snare.triggerAttackRelease("32n", t + Tone.Time("4n").toSeconds(), 0.5);
                 snare.triggerAttackRelease("32n", t + Tone.Time("2n").toSeconds() + Tone.Time("4n").toSeconds(), 0.5);
            }

            // Hats
            for (let i = 0; i < 4; i++) {
                const eighth = t + Tone.Time("4n").toSeconds() * i;
                hat.triggerAttackRelease("32n", eighth, 0.3);
                if (isChorus) {
                     hat.triggerAttackRelease("32n", eighth + Tone.Time("8n").toSeconds(), 0.2); // 8th notes
                }
            }
        }
    }, "1m").start(0);


    // Start Audio
    Tone.Transport.start();
    drawVisualizer();

    // Progress Tracker
    playbackIntervalRef.current = window.setInterval(() => {
        const pos = Tone.Transport.seconds;
        const progress = Math.min(100, (pos / totalDuration) * 100);
        setPlaybackProgress(progress);
        
        if (pos >= totalDuration) {
            stopAudio();
        }
    }, 100);
  };

  const stopAudio = async () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
    setCurrentSection("Ready");
    setPlaybackProgress(0);
    
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    // Stop recording but let user click download if they want
    // Note: In this simple flow, stopping effectively finishes the "take". 
    // If they press play again, it overwrites.
    if (recorderRef.current && recorderRef.current.state === 'started') {
       // Just stop, don't auto download. User must use the button if they want to save *during* play,
       // or we need to change logic to allow post-play download. 
       // For now, let's keep the "Download" button active only during play/record for simplicity,
       // or make the download button stop and save.
       // Refined logic: The download button in UI calls handleDownload which stops and saves.
       // If song ends naturally, we just stop recording and discard (or could save to buffer).
       // Let's auto-stop recorder here.
       recorderRef.current.stop(); 
       setIsRecording(false);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.size;
    const values = analyserRef.current.getValue();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2; 
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const val = values[i] as number; 
        const normalized = (val + 140) / 140; // Range adjust
        const barHeight = Math.max(2, normalized * canvas.height * 1.5);

        // Dynamic Color based on Section
        let startColor = '#d97706'; // Intro/Outro Amber
        let endColor = '#fef3c7';
        
        if (currentSection === 'Verse') { startColor = '#3b82f6'; endColor = '#dbeafe'; } // Blue
        if (currentSection === 'Chorus') { startColor = '#ef4444'; endColor = '#fee2e2'; } // Red

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, 4);
        ctx.fill();

        x += barWidth;
    }

    animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  useEffect(() => {
    return () => {
        if (isPlaying) stopAudio();
    };
  }, []);

  // ... (Existing useMemo for statsData remains identical) ...
  const statsData = useMemo(() => {
    // Logic to handle Custom Range Display
    let rangeLabel = "6 Months";
    if (timeRange === 'CUSTOM') {
        rangeLabel = customStartDate && customEndDate ? `${customStartDate} ~ ${customEndDate}` : "Custom Period";
    }

    switch (timeRange) {
      case '1M':
        return {
          topArtists: [
            { name: 'NewJeans', count: 320, genre: 'K-Pop' },
            { name: 'PinkPantheress', count: 280, genre: 'UK Garage' },
            { name: 'Dominic Fike', count: 210, genre: 'Alternative' },
            { name: 'beabadoobee', count: 190, genre: 'Indie Rock' },
            { name: 'Peggy Gou', count: 150, genre: 'House' },
          ],
          topGenres: [
            { name: 'Drum & Bass', percent: 35 },
            { name: 'Bedroom Pop', percent: 28 },
            { name: 'UK Garage', percent: 20 },
            { name: 'K-Pop', percent: 17 },
          ],
          totalTime: '6.2k',
          tracks: '1.8k',
          diversity: 92,
          persona: "Trendy Digger",
          personaDesc: "최신 트렌드를 가장 빠르게 흡수하고 있습니다. 특히 숏폼에서 유행하는 빠른 템포의 음악에 푹 빠져있군요.",
          keywords: [{ word: "속도", size: "text-2xl" }, { word: "지금", size: "text-xl" }, { word: "Dance", size: "text-3xl" }]
        };
      case 'CUSTOM':
         return {
            topArtists: [
              { name: 'Custom Selection A', count: 540, genre: 'Mix' },
              { name: 'Custom Selection B', count: 420, genre: 'Jazz' },
              { name: 'Custom Selection C', count: 310, genre: 'Pop' },
              { name: 'Custom Selection D', count: 200, genre: 'Rock' },
              { name: 'Custom Selection E', count: 150, genre: 'Indie' },
            ],
            topGenres: [
              { name: 'Jazz', percent: 40 },
              { name: 'Lo-fi', percent: 30 },
              { name: 'Pop', percent: 30 },
            ],
            totalTime: '??k',
            tracks: 'Custom',
            diversity: 80,
            persona: "Time Traveler",
            personaDesc: "선택하신 특정 기간 동안의 음악 여행 기록입니다. 이 시기에는 특정 장르에 깊이 몰입하셨군요.",
            keywords: [{ word: "Memory", size: "text-3xl" }, { word: "Time", size: "text-2xl" }]
         };
      case '6M':
      default:
        return {
          topArtists: [
            { name: 'NewJeans', count: 1240, genre: 'K-Pop' },
            { name: 'The Weeknd', count: 980, genre: 'R&B' },
            { name: 'Hyukoh', count: 850, genre: 'K-Indie' },
            { name: 'Frank Ocean', count: 720, genre: 'Neo Soul' },
            { name: 'SZA', count: 690, genre: 'R&B' },
          ],
          topGenres: [
            { name: 'Alternative R&B', percent: 32 },
            { name: 'K-Indie', percent: 24 },
            { name: 'Neo Soul', percent: 18 },
            { name: 'Lo-fi Hip Hop', percent: 14 },
          ],
          totalTime: '42k',
          tracks: '12.5k',
          diversity: 84,
          persona: "Melancholic Explorer",
          personaDesc: "당신은 깊이 있는 가사와 몽환적인 사운드스케이프를 찾아 헤매는 탐험가입니다. 대중적인 히트곡보다는 숨겨진 명곡을 발굴할 때 더 큰 희열을 느낍니다.",
          keywords: [{ word: "새벽", size: "text-2xl" }, { word: "기억", size: "text-xl" }, { word: "우리", size: "text-3xl" }]
        };
    }
  }, [timeRange, customStartDate, customEndDate]);

  const audioFeatures = [
    { label: '리듬감', value: 72, icon: <Disc className="w-4 h-4" />, desc: "규칙적인 비트와 그루브를 중요시합니다." },
    { label: '에너지', value: 45, icon: <Zap className="w-4 h-4" />, desc: "차분하고 정적인 분위기를 더 선호합니다." },
    { label: '어쿠스틱', value: 68, icon: <Music className="w-4 h-4" />, desc: "아날로그 악기의 따뜻한 질감을 좋아합니다." },
    { label: '감성', value: 55, icon: <Smile className="w-4 h-4" />, desc: "담백하고 중립적인 감정선을 즐깁니다." },
    { label: '보컬 비중', value: 88, icon: <Mic2 className="w-4 h-4" />, desc: "목소리가 곡의 중심이 되는 것을 선호합니다." },
  ];

  const globalMap = [
    { region: "South Korea", percent: 45 },
    { region: "United States", percent: 30 },
    { region: "United Kingdom", percent: 15 },
    { region: "Japan", percent: 10 }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-12">
      
      {/* 0. Time Range Selector */}
      <div className="flex flex-col items-end gap-4">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
          {(['1M', '6M', '1Y', 'ALL', 'CUSTOM'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                timeRange === range 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {range === '1M' ? '1개월' : range === '6M' ? '6개월' : range === '1Y' ? '1년' : range === 'ALL' ? '전체' : '날짜 선택'}
            </button>
          ))}
        </div>
        {timeRange === 'CUSTOM' && (
             <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">From</span>
                    <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
                <div className="w-4 h-px bg-slate-300"></div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">To</span>
                    <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
             </div>
        )}
      </div>

      {/* 1. Header Summary Card (Persona) */}
      <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-slate-100 p-1.5 rounded-lg">
                <User className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Listener Persona</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">{statsData.persona}</h2>
          <p className="text-sm text-slate-600 max-w-lg leading-relaxed font-medium">
            {statsData.personaDesc}
          </p>
        </div>
        <div className="w-full md:w-auto flex flex-row gap-0 md:gap-0 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden divide-x divide-slate-200">
          <div className="px-6 py-4 text-center min-w-[100px]">
            <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Total Time</p>
            <p className="text-2xl font-black text-slate-800">{statsData.totalTime}<span className="text-sm font-semibold text-slate-400 ml-1">min</span></p>
          </div>
          <div className="px-6 py-4 text-center min-w-[100px]">
            <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Tracks</p>
            <p className="text-2xl font-black text-slate-800">{statsData.tracks}</p>
          </div>
          <div className="px-6 py-4 text-center min-w-[100px]">
            <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Diversity</p>
            <p className="text-2xl font-black text-slate-800">{statsData.diversity}</p>
          </div>
        </div>
      </div>

      {/* 2 & 3. Artists and Genres */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-current" /> Top Artists
            </h3>
          </div>
          <div className="space-y-2">
            {statsData.topArtists.map((artist, i) => (
              <div key={artist.name} className="flex items-center group p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                <span className="w-8 text-center text-slate-300 font-black text-2xl italic font-serif group-hover:text-slate-900 transition-colors">
                    {i + 1}
                </span>
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center ml-4 mr-5 group-hover:bg-slate-200 transition-colors shrink-0">
                    <Music className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                      <p className="text-slate-900 font-bold text-lg truncate">{artist.name}</p>
                      <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-full">{artist.genre}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden max-w-[300px]">
                    <div className="bg-slate-800 h-full rounded-full transition-all duration-500" style={{ width: `${(artist.count / (statsData.topArtists[0].count * 1.1)) * 100}%` }}></div>
                  </div>
                </div>
                <div className="text-right pl-4">
                    <span className="text-sm font-bold text-slate-700 block">{artist.count.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-400" /> Genre Spectrum
          </h3>
          <div className="space-y-6 flex-1">
            {statsData.topGenres.map((genre) => (
              <div key={genre.name} className="group">
                <div className="flex justify-between text-sm mb-2 font-medium">
                  <span className="text-slate-700">{genre.name}</span>
                  <span className="text-slate-400">{genre.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full bg-slate-800 rounded-full group-hover:bg-black transition-colors duration-300"
                    style={{ width: `${genre.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 & 5. Audio Features & Lyric Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
           <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-current" /> Audio Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {audioFeatures.map((f) => (
              <div key={f.label} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group">
                 <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                        <span className="p-1.5 bg-white rounded-lg shadow-sm text-slate-900">{f.icon}</span> 
                        {f.label}
                    </div>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded-md text-slate-600 shadow-sm">{f.value}/100</span>
                 </div>
                 <p className="text-xs text-slate-500 leading-tight min-h-[2.5em] font-medium">{f.desc}</p>
                 <div className="w-full bg-slate-200 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div className="bg-slate-800 h-full rounded-full" style={{ width: `${f.value}%` }}></div>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-slate-400" /> Top Lyrics
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 content-start min-h-[160px]">
                    {statsData.keywords.map((k) => (
                        <span key={k.word} className={`${k.size} text-slate-400 hover:text-slate-900 transition-colors cursor-default font-serif italic`}>
                            {k.word}
                        </span>
                    ))}
                </div>
            </div>
             <p className="text-xs text-center text-slate-500 border-t border-slate-100 pt-5 mt-4 font-medium">
                가사에 감성적인 단어들의 출현 빈도가 평균보다 <strong className="text-slate-900">2.4배</strong> 높습니다.
             </p>
        </div>

        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col justify-between">
             <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" /> Origin Map
                </h3>
                <div className="space-y-5">
                    {globalMap.map((region) => (
                        <div key={region.region} className="flex items-center justify-between group">
                            <span className="text-sm text-slate-600 font-medium">{region.region}</span>
                            <div className="flex items-center gap-3 w-1/2">
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-slate-800 h-full rounded-full" style={{ width: `${region.percent}%`}}></div>
                                </div>
                                <span className="text-xs text-slate-400 font-mono w-6 text-right font-bold">{region.percent}</span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
            <div className="mt-6 bg-slate-50 p-4 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100 font-medium">
                <Hash className="w-3 h-3 inline mr-1 text-slate-400" />
                주로 <strong className="text-slate-900">동아시아</strong>와 <strong className="text-slate-900">북미</strong> 지역 음악 소비.
            </div>
        </div>
      </div>

      {/* 6. AI Song Generator (Enhanced DAW Style) */}
      <div className="bg-[#121212] text-white p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative mt-12">
        {/* Decorative Glow */}
        <div className="absolute top-[-50%] left-[50%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg border border-amber-500/30">
                <Wand2 className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">SonicMuse Studio™</h2>
                    <p className="text-xs text-zinc-500 font-mono">AI-POWERED DEMO GENERATOR</p>
                </div>
             </div>
             
             {/* Playback Controls */}
             {generatedSong && (
                 <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                    <div className="px-4 text-center border-r border-zinc-700">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">BPM</div>
                        <div className="text-lg font-mono font-bold text-amber-500">{generatedSong.tempo.replace(/[^0-9]/g, '') || 120}</div>
                    </div>
                    <div className="px-4 text-center border-r border-zinc-700">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Key</div>
                        <div className="text-lg font-mono font-bold text-zinc-300">{generatedSong.key || "Cm"}</div>
                    </div>
                    
                    {/* Play/Stop Button */}
                    <button 
                        onClick={() => playDemo(generatedSong)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isPlaying ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25' : 'bg-white text-black'}`}
                     >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                     </button>

                    {/* Download Button */}
                    <button 
                        onClick={handleDownload}
                        disabled={!isPlaying} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${isPlaying ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:scale-105' : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                        title="Download Demo (Rec)"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                 </div>
             )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Panel: Input & Visualizer */}
            <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Input Area */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Project Theme</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={songTheme}
                            onChange={(e) => setSongTheme(e.target.value)}
                            placeholder="예: 비 오는 서울의 밤거리 (Lo-fi)"
                            className="flex-1 bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-all font-medium"
                        />
                        <button 
                            onClick={handleGenerateSong}
                            disabled={isGeneratingSong || !songTheme}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-lg border border-zinc-700 transition-all disabled:opacity-50"
                        >
                            {isGeneratingSong ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Wand2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Visualizer Area */}
                <div className="flex-1 bg-black rounded-2xl border border-zinc-800 relative overflow-hidden min-h-[200px] flex items-center justify-center group">
                    <canvas ref={canvasRef} width={400} height={200} className="w-full h-full absolute inset-0 opacity-80" />
                    
                    {!generatedSong && !isGeneratingSong && (
                        <div className="text-center relative z-10 opacity-50">
                            <Activity className="w-12 h-12 mx-auto mb-2 text-zinc-600" />
                            <p className="text-sm text-zinc-500">Waiting for input...</p>
                        </div>
                    )}
                    
                    {isGeneratingSong && (
                        <div className="text-center relative z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mx-auto mb-4"></div>
                            <p className="text-sm text-amber-500 font-mono animate-pulse">GENERATING AUDIO ASSETS...</p>
                        </div>
                    )}

                    {generatedSong && (
                         <div className="absolute top-4 left-4 z-10 w-[calc(100%-2rem)]">
                            <div className="flex justify-between items-start">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-red-900'}`}></span>
                                    {isPlaying ? (isRecording ? `REC • ${currentSection}` : 'PLAYING') : 'STANDBY'}
                                </span>
                                {isPlaying && (
                                    <span className="text-[10px] font-mono text-zinc-500">{Math.round(playbackProgress)}%</span>
                                )}
                            </div>
                         </div>
                    )}
                    {isPlaying && (
                         <div className="absolute bottom-0 left-0 h-1 bg-amber-500/50 transition-all duration-100 ease-linear" style={{ width: `${playbackProgress}%` }}></div>
                    )}
                </div>
            </div>

            {/* Right Panel: Track Details & Info */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
                {!generatedSong ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-10 min-h-[300px]">
                        <Sliders className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm">Configure parameters and generate to view tracks.</p>
                    </div>
                ) : (
                    <>
                        {/* Tab Header */}
                        <div className="flex border-b border-zinc-800">
                            <button onClick={() => setActiveTab('tracks')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'tracks' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Tracks</button>
                            <button onClick={() => setActiveTab('lyrics')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'lyrics' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Lyrics</button>
                            <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'info' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Notes</button>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 overflow-y-auto max-h-[300px] custom-scrollbar">
                            {activeTab === 'tracks' && (
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        {generatedSong.title} 
                                        <span className="text-xs font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{generatedSong.style}</span>
                                    </h3>
                                    
                                    {/* Lead Melody Track */}
                                    <div className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-zinc-700/50 group hover:border-zinc-500 transition-all shadow-sm">
                                            <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-500 font-mono text-xs">
                                                L
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-amber-500 group-hover:text-amber-400 transition-colors">Lead (Melody)</div>
                                                <div className="h-1 w-full bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                                    <div className={`h-full bg-amber-500 rounded-full transition-all duration-75 ${isPlaying && currentSection !== 'Intro' ? 'w-[75%] animate-pulse' : 'w-0'}`}></div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-zinc-600 font-mono">
                                                Main
                                            </div>
                                    </div>

                                    {/* Existing Tracks */}
                                    {generatedSong.instruments.map((inst, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-zinc-800/50 group hover:border-zinc-700 transition-all">
                                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 font-mono text-xs">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{inst}</div>
                                                <div className="h-1 w-full bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                                    <div className={`h-full bg-amber-500/80 rounded-full transition-all duration-75 ${isPlaying ? 'w-[60%] animate-pulse' : 'w-0'}`}></div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-zinc-600 font-mono">
                                                {['L', 'R', 'C'][idx % 3]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'lyrics' && (
                                <div className="text-center py-4">
                                    <Mic className="w-6 h-6 text-zinc-600 mx-auto mb-4" />
                                    <p className="text-lg font-serif italic text-zinc-200 leading-8 whitespace-pre-line">
                                        "{generatedSong.lyrics}"
                                    </p>
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <div>
                                    <h4 className="text-xs font-bold text-amber-500 uppercase mb-3 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Composition Analysis
                                    </h4>
                                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                                        {generatedSong.compositionNotes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatsView;