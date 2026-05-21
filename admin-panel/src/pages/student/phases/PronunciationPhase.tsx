import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Mic, Square, RefreshCw, ChevronRight, Trophy, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { scorePronunciation } from '../../../services/api';

export default function PronunciationPhase({ data }: { data: any }) {
  const sentences = data?.sentences || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Results for the current sentence
  const [result, setResult] = useState<{
    transcript: string;
    accuracy_score: number;
    feedback: string;
  } | null>(null);
  
  // Keep track of all scores to show at the end
  const [scores, setScores] = useState<number[]>([]);
  const [showFinished, setShowFinished] = useState(false);
  
  // Recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const currentSentence = sentences[currentIndex];

  useEffect(() => {
    // Reset result when moving to a new sentence
    setResult(null);
    setError(null);
  }, [currentIndex]);

  if (sentences.length === 0) {
    return <div className="p-8 text-center text-slate-400 font-bold">No sentences provided for pronunciation practice.</div>;
  }

  // Speak the sentence using native browser TTS
  const handleListen = () => {
    if (!('speechSynthesis' in window)) {
      setError("Text-to-speech is not supported in this browser.");
      return;
    }
    
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(currentSentence);
    utterance.lang = 'en-US';
    
    // Apply speed settings if provided by backend (slow/normal/fast)
    if (data?.speed === 'slow') {
      utterance.rate = 0.75;
    } else if (data?.speed === 'fast') {
      utterance.rate = 1.25;
    } else {
      utterance.rate = 1.0;
    }
    
    utterance.onstart = () => setIsPlayingTTS(true);
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Start recording audio
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for browsers that don't support audio/webm (like Safari)
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        // Stop all audio tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        await evaluateAudio(audioBlob);
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access failed", err);
      setError("Microphone access denied. Please allow microphone permissions to practice pronunciation.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send audio to backend for scoring
  const evaluateAudio = async (audioBlob: Blob) => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await scorePronunciation(audioBlob, currentSentence);
      setResult({
        transcript: response.transcript,
        accuracy_score: response.accuracy_score,
        feedback: response.feedback
      });
      
      // Save score for final summary
      const updatedScores = [...scores];
      updatedScores[currentIndex] = response.accuracy_score;
      setScores(updatedScores);
    } catch (err: any) {
      console.error("Scoring failed", err);
      setError("Failed to analyze pronunciation. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowFinished(true);
    }
  };

  // Score styling color mapping
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-500 border-emerald-500 bg-emerald-50';
    if (score >= 70) return 'text-amber-500 border-amber-500 bg-amber-50';
    if (score >= 50) return 'text-orange-500 border-orange-500 bg-orange-50';
    return 'text-rose-500 border-rose-500 bg-rose-50';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 90) return 'from-emerald-400 to-teal-500 shadow-emerald-500/20';
    if (score >= 70) return 'from-amber-400 to-orange-500 shadow-amber-500/20';
    if (score >= 50) return 'from-orange-400 to-rose-400 shadow-orange-500/20';
    return 'from-rose-400 to-red-600 shadow-rose-500/20';
  };

  if (showFinished) {
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / sentences.length);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl mx-auto bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 text-center shadow-xl shadow-slate-100/50"
      >
        <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/30">
          <Trophy className="w-12 h-12 text-white fill-white/20 animate-pulse" />
        </div>
        <h4 className="text-3xl font-black text-slate-900 mb-2">Pronunciation Mastered!</h4>
        <p className="text-slate-500 font-bold mb-8">You have completed all speaking sentences in this lesson.</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Average Score</p>
            <p className={`text-3xl font-black ${averageScore >= 70 ? 'text-emerald-600' : 'text-orange-500'}`}>{averageScore}%</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">XP Reward</p>
            <p className="text-3xl font-black text-blue-600">+15 XP</p>
          </div>
        </div>

        <div className="text-left space-y-4 mb-8">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Sentence Results</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {sentences.map((sent: string, index: number) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-bold text-slate-700 flex-1 truncate">"{sent}"</p>
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${getScoreColorClass(scores[index] || 0)}`}>
                  {Math.round(scores[index] || 0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-400 font-bold text-sm">Click the blue <span className="text-blue-600 font-black">Continue</span> button below to move to the next phase.</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      {/* Phase Info */}
      <div className="flex justify-between items-center text-sm font-bold px-2">
        <span className="text-slate-400">Sentence {currentIndex + 1} of {sentences.length}</span>
        <span className="text-blue-500">Speaking Practice</span>
      </div>

      {/* Target Sentence Card */}
      <div className="relative p-10 bg-slate-50 rounded-[3rem] border border-slate-150 flex flex-col items-center justify-center min-h-[16rem] group transition-all duration-300 hover:border-blue-100 hover:bg-slate-50/50">
        <p className="text-2xl font-black text-slate-900 text-center leading-relaxed max-w-md">
          "{currentSentence}"
        </p>

        {/* TTS Pronunciation Helper */}
        <button 
          onClick={handleListen}
          disabled={isPlayingTTS}
          className={`mt-6 flex items-center gap-2 px-6 py-2.5 rounded-full border font-black text-sm transition-all shadow-sm ${
            isPlayingTTS 
              ? 'bg-blue-500 border-blue-500 text-white' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${isPlayingTTS ? 'animate-bounce' : ''}`} />
          {isPlayingTTS ? "Playing..." : "Listen to Pronunciation"}
        </button>
      </div>

      {/* Speech Interaction Controls */}
      <div className="flex flex-col items-center justify-center space-y-6">
        <AnimatePresence mode="wait">
          {!isChecking && !result && (
            <motion.div 
              key="record-controls"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              {isRecording ? (
                <div className="flex flex-col items-center space-y-4">
                  {/* Dynamic wave visualizer */}
                  <div className="flex items-end justify-center gap-1.5 h-12 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div 
                        key={bar}
                        className="w-1.5 bg-rose-500 rounded-full animate-wave"
                        style={{ 
                          height: '20%', 
                          animationDelay: `${bar * 0.15}s`,
                          // CSS variables for animation height variation
                          WebkitAnimationPlayState: 'running'
                        }}
                      />
                    ))}
                  </div>
                  
                  <button 
                    onClick={stopRecording}
                    className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-600/35 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Square className="w-8 h-8 fill-white" />
                  </button>
                  <p className="text-rose-500 font-black uppercase tracking-widest text-xs animate-pulse">Tap to Stop & Score</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <button 
                    onClick={startRecording}
                    className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all group"
                  >
                    <Mic className="w-9 h-9 transition-transform group-hover:rotate-12" />
                  </button>
                  <p className="text-blue-600 font-black uppercase tracking-widest text-xs">Tap to Record & Repeat</p>
                </div>
              )}
            </motion.div>
          )}

          {isChecking && (
            <motion.div 
              key="loading-controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center p-6 space-y-4"
            >
              {/* Premium analytical loader */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
                </div>
              </div>
              <p className="text-slate-500 font-bold text-center text-sm">Evaluating voice phonetics...</p>
            </motion.div>
          )}

          {result && (
            <motion.div 
              key="result-controls"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full bg-white border border-slate-150 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center space-y-6"
            >
              {/* Score Arc */}
              <div className="relative flex items-center justify-center w-28 h-28">
                {/* SVG circular progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="48" 
                    stroke={`url(#scoreGradient-${currentIndex})`} 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * result.accuracy_score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id={`scoreGradient-${currentIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={result.accuracy_score >= 70 ? "#34d399" : "#fb7185"} />
                      <stop offset="100%" stopColor={result.accuracy_score >= 70 ? "#059669" : "#e11d48"} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{Math.round(result.accuracy_score)}%</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                </div>
              </div>

              {/* Feedback text */}
              <div className="text-center space-y-2">
                <span className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getScoreColorClass(result.accuracy_score)}`}>
                  {result.accuracy_score >= 90 ? "Excellent" : result.accuracy_score >= 70 ? "Good Job" : result.accuracy_score >= 50 ? "Satisfactory" : "Try Again"}
                </span>
                <p className="text-slate-700 font-bold max-w-sm px-4">"{result.feedback}"</p>
              </div>

              {/* Transcribed audio comparison */}
              <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-5 text-left space-y-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">You Said</p>
                  <p className="text-slate-800 font-bold">
                    {result.transcript ? `"${result.transcript}"` : <span className="text-slate-400 italic">No speech recognized</span>}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full">
                <button 
                  onClick={startRecording}
                  className="flex-1 border-2 border-slate-200 text-slate-600 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
                <button 
                  onClick={handleNext}
                  className="flex-1 bg-blue-600 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 transition-all"
                >
                  {currentIndex < sentences.length - 1 ? "Next Sentence" : "Finish Practice"}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Error Banner */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-sm max-w-sm"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Embedded Waveform Animation styles */}
      <style>{`
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .animate-wave {
          animation: wave 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
