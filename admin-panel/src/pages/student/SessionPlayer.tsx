import React, { useState, useEffect, lazy, Suspense } from 'react';
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

const ObjectivePhase = lazy(() => import('./phases/ObjectivePhase'));
const ReadPhase = lazy(() => import('./phases/ReadPhase'));
const FlashcardPhase = lazy(() => import('./phases/FlashcardPhase'));
const VocabDrillPhase = lazy(() => import('./phases/VocabDrillPhase'));
const PronunciationPhase = lazy(() => import('./phases/PronunciationPhase'));
const GamePhase = lazy(() => import('./phases/GamePhase'));
const VideoDrillPhase = lazy(() => import('./phases/VideoDrillPhase'));

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
               <PhaseDispatcher phase={currentPhase} />
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

function PhaseDispatcher({ phase }: { phase: any }) {
  if (!phase) return null;
  const data = phase.data;

  return (
    <Suspense fallback={
      <div className="p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-bold">Loading phase...</p>
      </div>
    }>
      {(() => {
        switch (phase.type) {
          case 'objective': return <ObjectivePhase data={data} />;
          case 'read': return <ReadPhase data={data} />;
          case 'flashcard': return <FlashcardPhase data={data} />;
          case 'vocab_drill': return <VocabDrillPhase data={data} />;
          case 'pronunciation': return <PronunciationPhase data={data} />;
          case 'game': return <GamePhase data={data} />;
          case 'video_drill': return <VideoDrillPhase data={data} />;
          default: return <div className="p-12 text-center text-slate-400 font-bold">Phase type {phase.type} coming soon!</div>;
        }
      })()}
    </Suspense>
  );
}
