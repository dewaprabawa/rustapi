import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Check, RefreshCw, AlertCircle, ArrowRight, Trophy } from 'lucide-react';

export default function FlashcardPhase({ data }: { data: any }) {
  const words = data?.words || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedWords, setReviewedWords] = useState<Record<string, 'mastered' | 'review'>>({});
  const [showFinished, setShowFinished] = useState(false);

  if (words.length === 0) {
    return <div className="p-8 text-center text-slate-400 font-bold">No flashcards found.</div>;
  }

  const currentWord = words[currentIndex];

  const handleSpeech = (word: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't flip the card when clicking speak
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMark = (status: 'mastered' | 'review') => {
    setReviewedWords(prev => ({ ...prev, [currentWord.word]: status }));
    setIsFlipped(false);
    
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setShowFinished(true);
      }
    }, 200);
  };

  if (showFinished) {
    const masteredCount = Object.values(reviewedWords).filter(v => v === 'mastered').length;
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 text-center shadow-xl shadow-slate-100"
      >
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-yellow-500 fill-yellow-500 animate-bounce" />
        </div>
        <h4 className="text-2xl font-black text-slate-900 mb-2">Flashcards Complete!</h4>
        <p className="text-slate-500 font-bold mb-6">You have reviewed all {words.length} vocabulary terms.</p>

        <div className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-3">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">Mastered Words</span>
            <span className="text-green-600 font-black">{masteredCount}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">Needs Review</span>
            <span className="text-amber-500 font-black">{words.length - masteredCount}</span>
          </div>
          <div className="h-[2px] bg-slate-100 my-2" />
          <div className="flex justify-between items-center text-sm font-black text-blue-600">
            <span>Gamification Reward</span>
            <span>+15 XP Earned!</span>
          </div>
        </div>

        <button 
          onClick={() => {
            setCurrentIndex(0);
            setIsFlipped(false);
            setReviewedWords({});
            setShowFinished(false);
          }}
          className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 py-4 rounded-2xl font-black transition-colors"
        >
          Review Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Progress & Stat */}
      <div className="flex justify-between items-center text-sm font-black text-slate-400 tracking-wider">
        <span>WORD {currentIndex + 1} OF {words.length}</span>
        <span className="text-blue-500">{Object.keys(reviewedWords).length} Reviewed</span>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-80 relative cursor-pointer select-none group"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Front Side */}
          <div 
            className={`absolute inset-0 bg-white border-2 border-slate-100 group-hover:border-blue-300 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-lg shadow-slate-100/50 transition-colors`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex justify-between items-start">
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                English
              </span>
              <button 
                onClick={(e) => handleSpeech(currentWord.word, e)}
                className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center my-auto">
              <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
                {currentWord.word}
              </p>
              <p className="text-sm font-bold text-blue-500 tracking-wide">
                /{currentWord.pronunciation}/
              </p>
            </div>

            <div className="flex justify-center items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-wider">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              Tap to see translation
            </div>
          </div>

          {/* Card Back Side */}
          <div 
            className={`absolute inset-0 bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-lg shadow-slate-100/50`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex justify-between items-start">
              <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                Indonesian
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                Translation
              </span>
            </div>

            <div className="my-auto space-y-4">
              <p className="text-3xl font-black text-slate-900 text-center tracking-tight leading-none">
                {currentWord.translation}
              </p>

              {(currentWord.example_en || currentWord.example_id) && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-1.5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Example Usage</p>
                  {currentWord.example_en && (
                    <p className="text-xs text-slate-700 italic font-semibold leading-relaxed">
                      "{currentWord.example_en}"
                    </p>
                  )}
                  {currentWord.example_id && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      {currentWord.example_id}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handleMark('review'); }}
                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200/50 py-3 rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4" />
                Review
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleMark('mastered'); }}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/50 py-3 rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Mastered
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="text-center text-xs text-slate-400 font-bold">
        Flip the card to mark it as mastered or needs review!
      </div>
    </div>
  );
}
