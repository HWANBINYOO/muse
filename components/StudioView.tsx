import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { 
  Wand2, Play, Pause, Download, Activity, Sliders, 
  Volume2, Music4, Disc, Settings2, RefreshCw
} from './Icons';
import { generateSongConcept } from '../services/geminiService';
import { SongConcept } from '../types';

// --- Types & Constants ---
type SongSection = 'Intro' | 'Verse' | 'Chorus' | 'Outro';
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = { Major: [0,2,4,5,7,9,11], Minor: [0,2,3,5,7,8,10] };

const StudioView: React.FC = () => {
  // --- UI State ---
  const [prompt, setPrompt] = useState('');
  const [customBpm, setCustomBpm] = useState(120);
  const [customKey, setCustomKey] = useState('C');
  const [customScale, setCustomScale] = useState<'Major' | 'Minor'>('Minor');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('Standby');
  const [progress, setProgress] = useState(0); // 0-100%
  const [currentTimeStr, setCurrentTimeStr] = useState("0:00");
  const [totalTimeStr, setTotalTimeStr] = useState("0:00");
  const [generatedSong, setGeneratedSong] = useState<SongConcept | null>(null);

  // Mixer State (Volumes in dB)
  const [volDrums, setVolDrums] = useState(-5);
  const [volBass, setVolBass] = useState(-6);
  const [volChords, setVolChords] = useState(-12);
  const [volLead, setVolLead] = useState(-6);

  // --- Audio Refs ---
  const transportRef = useRef(Tone.Transport);
  const synthsRef = useRef<any>({});
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const progressInterval = useRef<number | null>(null);

  // --- Audio Engine Initialization ---
  const initAudioEngine = async () => {
    await Tone.start();
    
    if (!analyserRef.current) analyserRef.current = new Tone.Analyser("fft", 256);
    if (!recorderRef.current) recorderRef.current = new Tone.Recorder();

    // Master Chain: Limiter -> Recorder -> Analyser -> Destination
    const limiter = new Tone.Limiter(-1).toDestination();
    limiter.connect(analyserRef.current);
    limiter.connect(recorderRef.current);

    // Instrument Buses (connected to Limiter)
    // We create Vol nodes for mixer control
    const busDrums = new Tone.Volume(volDrums).connect(limiter);
    const busBass = new Tone.Volume(volBass).connect(limiter);
    const busChords = new Tone.Volume(volChords).connect(limiter);
    const busLead = new Tone.Volume(volLead).connect(limiter);

    // Save Buses to Ref to update volume later
    synthsRef.current.buses = { busDrums, busBass, busChords, busLead };

    // --- Instruments ---
    
    // 1. High-End Drums (Membrane + Noise + Metal)
    const kick = new Tone.MembraneSynth({
       pitchDecay: 0.05, octaves: 6, oscillator: { type: "sine" },
       envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).connect(busDrums);
    
    // Snare with Reverb
    const snareVerb = new Tone.Reverb({ decay: 1.5, wet: 0.4 }).connect(busDrums);
    const snare = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).connect(snareVerb);

    const hat = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).connect(busDrums);

    // 2. Fat Bass (FM Synthesis for Grit)
    const bass = new Tone.MonoSynth({
        oscillator: { type: "fmsawtooth" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.5 },
        filterEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.2, baseFrequency: 80, octaves: 3 }
    }).connect(busBass);

    // 3. Wide Chords (Chorus + Spread)
    const chordVerb = new Tone.Reverb({ decay: 4, wet: 0.4 }).connect(busChords);
    const chordChorus = new Tone.Chorus(4, 2.5, 0.5).connect(chordVerb);
    const chords = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 25 },
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.8, release: 1.5 }
    }).connect(chordChorus);

    // 4. Singing Lead (Delay + Vibrato)
    const leadDelay = new Tone.PingPongDelay("8n.", 0.2).connect(busLead);
    const leadVibrato = new Tone.Vibrato(5, 0.1).connect(leadDelay);
    const lead = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 1 },
        portamento: 0.05
    }).connect(leadVibrato);

    synthsRef.current.inst = { kick, snare, hat, bass, chords, lead };
  };

  // --- Volume Updates ---
  useEffect(() => {
    if (synthsRef.current?.buses) {
      synthsRef.current.buses.busDrums.volume.rampTo(volDrums, 0.1);
      synthsRef.current.buses.busBass.volume.rampTo(volBass, 0.1);
      synthsRef.current.buses.busChords.volume.rampTo(volChords, 0.1);
      synthsRef.current.buses.busLead.volume.rampTo(volLead, 0.1);
    }
  }, [volDrums, volBass, volChords, volLead]);

  // --- Generation Logic ---
  const handleGenerate = async () => {
    if (isPlaying) stopPlayback();
    setIsGenerating(true);
    try {
        // Construct prompt with custom overrides
        const vibe = prompt || "Modern Pop with Electronic elements";
        const theme = `${vibe}. Preferred Tempo: ${customBpm} BPM. Key: ${customKey} ${customScale}.`;
        
        const concept = await generateSongConcept(theme);
        
        // Override with user controls if they differ significantly (optional, but ensures UI sync)
        concept.tempo = `${customBpm} BPM`;
        concept.key = `${customKey} ${customScale}`;
        
        setGeneratedSong(concept);
        startPlayback(concept);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- Sequencer / Playback Logic ---
  const startPlayback = async (concept: SongConcept) => {
    await initAudioEngine();
    Tone.Transport.cancel();
    Tone.Transport.stop();
    
    // Set Tempo
    const bpm = parseInt(concept.tempo.replace(/\D/g,'')) || customBpm;
    Tone.Transport.bpm.value = bpm;

    // Set Key/Scale
    const rootKey = concept.key.match(/([A-G]#?)/)?.[1] || customKey;
    const isMinor = concept.key.toLowerCase().includes('minor') || customScale === 'Minor';
    
    // Helpers
    const getScaleNotes = (octave: number) => {
        const rootIdx = KEYS.indexOf(rootKey);
        const intervals = isMinor ? SCALES.Minor : SCALES.Major;
        return intervals.map(i => {
            const idx = (rootIdx + i) % 12;
            const octShift = Math.floor((rootIdx + i) / 12);
            return `${KEYS[idx]}${octave + octShift}`;
        });
    };
    const scale3 = getScaleNotes(3); // Bass/Chords
    const scale4 = getScaleNotes(4); // Melody

    // Progressions (Indices of scale)
    const verseProg = isMinor ? [0, 5, 2, 6] : [0, 4, 5, 3]; // i-VI-III-VII or I-V-vi-IV
    const chorusProg = isMinor ? [5, 6, 0, 2] : [3, 4, 0, 4]; // VI-VII-i-III or IV-V-I-V

    const { kick, snare, hat, bass, chords, lead } = synthsRef.current.inst;

    // Loop Construction
    // Total Length: 32 Bars (Intro 4, Verse 8, Chorus 8, Verse 8, Outro 4)
    const totalBars = 32;
    Tone.Transport.setLoopPoints(0, `${totalBars}m`);
    Tone.Transport.loop = false; // Stop at end

    // 1. Chords & Bass Loop
    const harmoLoop = new Tone.Loop((time) => {
        const pos = Tone.Transport.position.toString().split(':');
        const bar = parseInt(pos[0]);
        
        let section: SongSection = 'Intro';
        let prog = verseProg;
        let density = 0.5;

        if (bar < 4) { section = 'Intro'; density = 0.2; }
        else if (bar < 12) { section = 'Verse'; prog = verseProg; density = 0.6; }
        else if (bar < 20) { section = 'Chorus'; prog = chorusProg; density = 1.0; }
        else if (bar < 28) { section = 'Verse'; prog = verseProg; density = 0.7; }
        else { section = 'Outro'; density = 0.3; }
        
        setCurrentSection(section);

        // Current Chord
        const chordIdx = bar % 4;
        const degree = prog[chordIdx];
        const root = scale3[degree];
        const third = scale3[(degree + 2) % 7];
        const fifth = scale3[(degree + 4) % 7];
        
        // Play Chords (Pad style)
        chords.triggerAttackRelease([root, third, fifth], "1m", time, 0.6);

        // Play Bass
        const bassNote = root.replace('3', '1'); // Drop 2 octaves
        if (section === 'Chorus') {
            // Driving 8ths
            for(let i=0; i<8; i++){
                 bass.triggerAttackRelease(bassNote, "8n", time + Tone.Time("8n").toSeconds()*i, 0.7);
            }
        } else if (section === 'Verse') {
            // Root - Fifth
            const fifthNote = scale3[(degree + 4) % 7].replace('3', '1');
            bass.triggerAttackRelease(bassNote, "4n", time);
            bass.triggerAttackRelease(fifthNote, "4n", time + Tone.Time("2n").toSeconds());
        } else {
             bass.triggerAttackRelease(bassNote, "1m", time);
        }

    }, "1m").start(0);

    // 2. Drums Loop
    const drumLoop = new Tone.Loop((time) => {
        const bar = parseInt(Tone.Transport.position.toString().split(':')[0]);
        if (bar >= totalBars) return;
        const isChorus = (bar >= 12 && bar < 20);
        const isIntro = bar < 4;
        
        if (isIntro) {
            // Simple Hat
            hat.triggerAttackRelease("16n", time);
        } else {
            // Kick (4 on floor)
            kick.triggerAttackRelease("C1", "8n", time);
            kick.triggerAttackRelease("C1", "8n", time + Tone.Time("4n").toSeconds());
            kick.triggerAttackRelease("C1", "8n", time + Tone.Time("2n").toSeconds());
            kick.triggerAttackRelease("C1", "8n", time + Tone.Time("2n").toSeconds() + Tone.Time("4n").toSeconds());

            // Snare (2 & 4)
            snare.triggerAttackRelease("16n", time + Tone.Time("4n").toSeconds());
            snare.triggerAttackRelease("16n", time + Tone.Time("2n").toSeconds() + Tone.Time("4n").toSeconds());

            // Hats (16ths)
            for(let i=0; i<16; i++){
                // Humanize velocity
                const vel = (i%4===0 ? 0.8 : 0.3) + (Math.random()*0.1);
                hat.triggerAttackRelease("32n", time + Tone.Time("16n").toSeconds()*i, vel);
            }
        }
    }, "1m").start(0);

    // 3. Lead Melody
    const melodyLoop = new Tone.Loop((time) => {
        const bar = parseInt(Tone.Transport.position.toString().split(':')[0]);
        if (bar < 4 || bar >= 28) return; // No lead in Intro/Outro
        const isChorus = (bar >= 12 && bar < 20);

        // Procedural Pattern
        if (isChorus) {
            // High Energy Arp/Melody
            const notes = [scale4[0], scale4[2], scale4[4], scale4[7] || scale4[6]]; // Root, 3rd, 5th, 8th
            lead.triggerAttackRelease(notes[0], "8n", time);
            lead.triggerAttackRelease(notes[1], "8n", time + Tone.Time("8n").toSeconds());
            lead.triggerAttackRelease(notes[2], "8n", time + Tone.Time("4n").toSeconds());
            lead.triggerAttackRelease(notes[3], "4n", time + Tone.Time("2n").toSeconds());
        } else {
            // Slower, expressive
            if (bar % 2 === 0) {
                lead.triggerAttackRelease(scale4[2], "2n", time);
                lead.triggerAttackRelease(scale4[1], "4n", time + Tone.Time("2n").toSeconds());
            } else {
                lead.triggerAttackRelease(scale4[0], "1n", time);
            }
        }
    }, "1m").start(0);

    // Start
    recorderRef.current?.start();
    Tone.Transport.start();
    setIsPlaying(true);
    drawVisualizer();
  };

  const stopPlayback = async () => {
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear scheduled events
    setIsPlaying(false);
    setCurrentSection('Stopped');
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (recorderRef.current?.state === 'started') {
        await recorderRef.current.stop(); // Discard or keep logic
    }
  };

  // --- Scrubber / Progress Logic ---
  useEffect(() => {
    if (isPlaying) {
        progressInterval.current = window.setInterval(() => {
            const pos = Tone.Transport.seconds;
            // Assuming 32 bars * 4 beats / bpm * 60 = seconds
            const total = (32 * 4 * 60) / Tone.Transport.bpm.value;
            
            // Format Times
            const format = (s: number) => {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m}:${sec.toString().padStart(2, '0')}`;
            };
            setCurrentTimeStr(format(pos));
            setTotalTimeStr(format(total));

            const pct = Math.min(100, (pos / total) * 100);
            setProgress(pct);

            if (pos >= total) {
                stopPlayback();
            }
        }, 100);
    } else {
        if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPct = parseFloat(e.target.value);
      setProgress(newPct);
      const total = (32 * 4 * 60) / Tone.Transport.bpm.value;
      const newTime = (newPct / 100) * total;
      Tone.Transport.seconds = newTime;
  };

  const handleDownload = async () => {
    if (recorderRef.current && recorderRef.current.state === 'started') {
        const blob = await recorderRef.current.stop();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${generatedSong?.title || 'Studio_Session'}.webm`;
        a.click();
        // Restart recorder for next pass? or just stop.
        setIsPlaying(false);
    }
  };

  // --- Visualizer ---
  const drawVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const buffer = analyserRef.current.getValue(); // FFT array
      
      ctx.clearRect(0,0,width,height);
      
      // Draw grid lines
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
      ctx.stroke();

      const barWidth = (width / buffer.length) * 2.5;
      let x = 0;

      for(let i=0; i<buffer.length; i++) {
          const val = buffer[i] as number; // -100 to 0 dB
          const h = Tone.dbToGain(val) * height * 2; // scale up
          
          // Color based on freq
          const hue = (i / buffer.length) * 240 + 200; // Blue/Purple spectrum
          ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
          
          ctx.fillRect(x, height - h, barWidth, h);
          x += barWidth + 1;
      }
      animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      
      {/* LEFT: Controls Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-y-auto">
         <div className="mb-2">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Settings2 className="w-6 h-6" /> Studio
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">AI Music Generator Control</p>
         </div>

         {/* Parameters */}
         <div className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vibe / Prompt</label>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the song (e.g., Cyberpunk chase, Chill Sunday morning)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none resize-none h-24"
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                    <span>Tempo (BPM)</span>
                    <span className="text-slate-900">{customBpm}</span>
                </label>
                <input 
                    type="range" min="60" max="180" step="1"
                    value={customBpm} onChange={(e) => setCustomBpm(Number(e.target.value))}
                    className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Key</label>
                    <select 
                        value={customKey} onChange={(e) => setCustomKey(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none"
                    >
                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Scale</label>
                    <select 
                        value={customScale} onChange={(e) => setCustomScale(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none"
                    >
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                    </select>
                </div>
            </div>
         </div>

         {/* Generate Button */}
         <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-auto w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-70"
         >
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {isGenerating ? "Composing..." : "Generate Track"}
         </button>
      </div>


      {/* RIGHT: Visualizer & Mixer */}
      <div className="flex-1 flex flex-col gap-6">
         
         {/* Top: Visualizer & Transport */}
         <div className="flex-1 bg-black rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col group">
             {/* Canvas Layer */}
             <canvas ref={canvasRef} width={800} height={300} className="w-full h-full absolute inset-0 opacity-60" />
             
             {/* Overlay Info */}
             <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                 <div>
                    <h3 className="text-white font-bold text-xl tracking-tight">
                        {generatedSong ? generatedSong.title : "New Project"}
                    </h3>
                    <p className="text-zinc-400 text-sm font-mono flex items-center gap-2">
                        {customKey} {customScale} • {customBpm} BPM • <span className="text-amber-500">{currentSection}</span>
                    </p>
                 </div>
                 <div className="flex items-center gap-3">
                     <button 
                        onClick={() => isPlaying ? stopPlayback() : (generatedSong && startPlayback(generatedSong))}
                        disabled={!generatedSong}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform text-black disabled:opacity-50"
                     >
                         {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                     </button>
                 </div>
             </div>

             {/* Scrubber / Progress (Bottom) */}
             <div className="mt-auto z-10 p-6 bg-gradient-to-t from-black/90 to-transparent">
                 <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                     <span>{currentTimeStr}</span>
                     <span>{totalTimeStr}</span>
                 </div>
                 <input 
                    type="range" min="0" max="100" step="0.1"
                    value={progress}
                    onChange={handleSeek}
                    disabled={!isPlaying}
                    className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                 />
             </div>

             {/* Center Placeholder */}
             {!generatedSong && !isGenerating && (
                 <div className="absolute inset-0 flex items-center justify-center text-zinc-700 pointer-events-none">
                     <div className="text-center">
                         <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                         <p className="text-lg font-bold">Ready to Compose</p>
                     </div>
                 </div>
             )}
         </div>

         {/* Bottom: Mixer Console */}
         <div className="h-48 bg-zinc-900 rounded-3xl border border-zinc-800 p-6 flex gap-4 overflow-x-auto">
             {/* Master Fader (Fake visual for now or link to limiter?) -> Let's do Track Faders */}
             {[
                 { label: "Drums", val: volDrums, set: setVolDrums, color: "bg-blue-500" },
                 { label: "Bass", val: volBass, set: setVolBass, color: "bg-red-500" },
                 { label: "Chords", val: volChords, set: setVolChords, color: "bg-amber-500" },
                 { label: "Lead", val: volLead, set: setVolLead, color: "bg-emerald-500" },
             ].map((track) => (
                 <div key={track.label} className="flex-1 min-w-[80px] bg-zinc-950 rounded-xl p-3 flex flex-col items-center border border-zinc-800">
                     <span className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">{track.label}</span>
                     <div className="flex-1 w-full relative flex justify-center">
                         {/* Vertical Range Input Trick */}
                         <input 
                            type="range" min="-40" max="0" step="1"
                            value={track.val}
                            onChange={(e) => track.set(Number(e.target.value))}
                            className="h-full w-2 appearance-none bg-zinc-800 rounded-full cursor-pointer vertical-slider accent-white"
                            style={{ WebkitAppearance: 'slider-vertical' } as any} 
                         />
                     </div>
                     <span className="text-[10px] font-mono text-zinc-500 mt-2">{track.val}dB</span>
                     <div className={`w-full h-1 mt-2 rounded-full ${track.color} shadow-[0_0_10px_currentColor] opacity-60`}></div>
                 </div>
             ))}

             {/* Master / Download Section */}
             <div className="flex-1 min-w-[120px] bg-zinc-950/50 rounded-xl p-3 flex flex-col items-center justify-center border border-dashed border-zinc-800 gap-3">
                 <div className="text-center">
                     <p className="text-xs font-bold text-zinc-500 uppercase">Export</p>
                     <p className="text-[10px] text-zinc-600">.WEBM Format</p>
                 </div>
                 <button 
                    onClick={handleDownload}
                    disabled={!isPlaying && !generatedSong}
                    className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors border border-zinc-700 disabled:opacity-50"
                 >
                     <Download className="w-5 h-5" />
                 </button>
             </div>
         </div>

      </div>
    </div>
  );
};

export default StudioView;