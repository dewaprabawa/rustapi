import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLessonSession, submitLessonCompletion } from '../../services/api';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  MessageCircle, 
  CheckCircle2, 
  Trophy,
  Heart,
  Loader2,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function SessionPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [lives, setLives] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['lessonSession', lessonId],
    queryFn: () => getLessonSession(lessonId!),
    enabled: !!lessonId,
  });

  useEffect(() => {
    if (session?.lives) {
      setLives(session.lives);
    }
  }, [session]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold">Preparing your lesson...</p>
      </div>
    );
  }

  const phases = session?.phases || [];
  const currentPhase = phases[currentPhaseIndex];

  const handleNext = async () => {
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex(prev => prev + 1);
      setProgress(((currentPhaseIndex + 1) / phases.length) * 100);
    } else {
      setIsSaving(true);
      try {
        await submitLessonCompletion(lessonId!, 50); // Hardcoded 50 XP for now
        setIsFinished(true);
        setProgress(100);
      } catch (e) {
        console.error("Failed to save progress", e);
        // Still show finished screen but maybe with a warning
        setIsFinished(true);
      }
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (window.confirm("Are you sure you want to quit? Your progress won't be saved.")) {
      navigate('/portal');
    }
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-yellow-500/20">
            <Trophy className="w-16 h-16 text-yellow-500 fill-yellow-500" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Lesson Complete!</h2>
          <p className="text-slate-500 font-bold mb-12">You've earned 50 XP and mastered new skills.</p>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-12">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">XP Earned</p>
              <p className="text-2xl font-black text-blue-600">+50</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
              <p className="text-2xl font-black text-green-600">94%</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/portal')}
            className="w-full max-w-sm bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all"
          >
            Finish Lesson
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header / Progress Bar */}
      <header className="px-6 py-4 flex items-center gap-6">
        <button 
          onClick={handleClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-full border border-rose-100 text-rose-500 font-bold">
          <Heart className="w-4 h-4 fill-rose-500" />
          <span>{lives}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhaseIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="w-full max-w-2xl flex flex-col items-center text-center"
          >
            <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-8">
              Phase {currentPhaseIndex + 1}: {currentPhase?.type?.replace('_', ' ')}
            </span>

            {/* Phase Content Dispatcher */}
            <div className="w-full py-8">
               {renderPhaseContent(currentPhase)}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="px-6 py-8 border-t border-slate-100 bg-white flex justify-center">
        <div className="w-full max-w-2xl flex gap-4">
          <button 
            className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-[2rem] font-black text-lg cursor-not-allowed"
            disabled
          >
            Check Answer
          </button>
          <button 
            onClick={handleNext}
            disabled={isSaving}
            className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

function renderPhaseContent(phase: any) {
  if (!phase) return null;
  const data = phase.data;

  switch (phase.type) {
    case 'read':
      return (
        <div className="space-y-8">
          <h3 className="text-3xl font-black text-slate-900">Read & Listen</h3>
          <div className="p-8 bg-slate-50 rounded-[2rem] text-left border border-slate-100">
            <p className="text-xl text-slate-700 leading-relaxed font-medium">
              {data?.content}
            </p>
          </div>
          <button className="flex items-center gap-3 bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl mx-auto font-bold hover:bg-blue-100 transition-colors">
            <Volume2 className="w-5 h-5" />
            Play Audio
          </button>
        </div>
      );

    case 'flashcard':
      return (
        <div className="space-y-8">
          <h3 className="text-3xl font-black text-slate-900">Flashcards</h3>
          <p className="text-slate-500 font-medium">Review the key terms for this lesson.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.words?.map((v: any) => (
              <div key={v.id} className="p-6 bg-white border-2 border-slate-100 rounded-3xl text-left hover:border-blue-500 transition-colors cursor-pointer group">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{v.pronunciation}</p>
                <p className="text-xl font-black text-slate-900 group-hover:text-blue-600">{v.word}</p>
                <p className="text-sm text-slate-500 mt-2">{v.translation}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'vocab_drill':
      const drill = data?.drills?.[0]; // Just show first drill for now
      return (
        <div className="space-y-8">
          <h3 className="text-3xl font-black text-slate-900">Vocab Mastery</h3>
          {drill?.drill_type === 'matching' ? (
            <>
              <p className="text-slate-500 font-medium">Select the correct definition for:</p>
              <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-lg">
                 <p className="text-4xl font-black">{drill.items[0]?.word}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full">
                {drill.items.map((item: any, i: number) => (
                  <button key={i} className="p-5 bg-white border-2 border-slate-200 rounded-2xl text-left font-bold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <span className="inline-block w-8 h-8 rounded-lg bg-slate-100 text-slate-400 text-center leading-8 mr-4">{i + 1}</span>
                    {item.match}
                  </button>
                ))}
              </div>
            </>
          ) : (
             <div className="p-12 text-slate-400">Drill type {drill?.drill_type} coming soon</div>
          )}
        </div>
      );

    case 'pronunciation':
      return (
        <div className="space-y-8">
          <h3 className="text-3xl font-black text-slate-900">Perfect Pronunciation</h3>
          <p className="text-slate-500 font-medium">Listen and repeat carefully:</p>
          
          <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-200 flex flex-col items-center">
            <Volume2 className="w-12 h-12 text-blue-600 mb-6" />
            <p className="text-2xl font-black text-slate-900">"{data?.sentences?.[0]}"</p>
          </div>

          <button className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-500/30 animate-pulse">
            <MessageCircle className="w-10 h-10" />
          </button>
          <p className="text-rose-500 font-bold uppercase tracking-widest text-sm">Tap to Record</p>
        </div>
      );

    case 'game':
      return (
        <div className="space-y-8 w-full max-w-2xl">
          <h3 className="text-3xl font-black text-slate-900">Interactive Challenge</h3>
          
          {data?.video_url ? (
            <div className="w-full aspect-video rounded-[2rem] overflow-hidden bg-slate-900 shadow-2xl border-4 border-white">
              <video 
                src={data.video_url} 
                controls 
                className="w-full h-full object-cover"
                poster={data.games?.[0]?.asset_url}
              />
            </div>
          ) : (
            <div className="p-12 bg-slate-50 rounded-[2rem] border border-slate-200 flex flex-col items-center">
              <Play className="w-16 h-16 text-blue-500 mb-4 animate-pulse" />
              <p className="text-slate-500 font-bold">Game loading...</p>
            </div>
          )}

          <div className="space-y-4">
             <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl text-left">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Mission</p>
                <p className="text-xl font-black text-slate-900">{data.games?.[0]?.title || "Complete the challenge"}</p>
                <p className="text-sm text-slate-500 mt-2">{data.games?.[0]?.instructions || "Follow the instructions in the video to proceed."}</p>
             </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-12 text-center text-slate-400 font-bold">
          Phase type {phase.type} coming soon!
        </div>
      );
  }
}

