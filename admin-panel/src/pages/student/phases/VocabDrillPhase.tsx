import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, Trophy, Heart, Volume2 } from 'lucide-react';

export default function VocabDrillPhase({ data }: { data: any }) {
  const drills = data?.drills || [];
  const currentDrill = drills[0]; // Take the first matching drill

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<any[]>([]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(-1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [showFinished, setShowFinished] = useState(false);

  const items = currentDrill?.items || [];
  const currentItem = items[currentIndex];

  useEffect(() => {
    if (currentItem && items.length > 0) {
      // Shuffling definitions
      const options = items.map((item: any) => ({
        match: item.match,
        isCorrect: item.word === currentItem.word
      }));
      
      // Shuffle array
      const shuffled = [...options].sort(() => Math.random() - 0.5);
      setShuffledOptions(shuffled);
      
      // Find the correct index in shuffled
      const correctIdx = shuffled.findIndex(opt => opt.isCorrect);
      setCorrectOptionIndex(correctIdx);
      
      // Reset answer state
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [currentIndex, currentItem, items]);

  if (items.length === 0) {
    return <div className="p-8 text-center text-slate-400 font-bold">No vocabulary matching drills found.</div>;
  }

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    
    setSelectedOption(idx);
    setIsAnswered(true);
    
    const isCorrect = shuffledOptions[idx].isCorrect;
    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      setLives(prev => Math.max(0, prev - 1));
    }
  };

  const handleSpeech = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowFinished(true);
    }
  };

  if (showFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 text-center shadow-xl shadow-slate-100"
      >
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-emerald-500 fill-emerald-500 animate-bounce" />
        </div>
        <h4 className="text-2xl font-black text-slate-900 mb-2">Drill Complete!</h4>
        <p className="text-slate-500 font-bold mb-6">You've successfully completed the Vocabulary Matching Drill.</p>

        <div className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-3">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">Correct Answers</span>
            <span className="text-green-600 font-black">{score} / {items.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">Lives Left</span>
            <span className="text-rose-500 font-black flex items-center gap-1">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> {lives}
            </span>
          </div>
          <div className="h-[2px] bg-slate-100 my-2" />
          <div className="flex justify-between items-center text-sm font-black text-blue-600">
            <span>Gamification Reward</span>
            <span>+{score * 5} XP Earned!</span>
          </div>
        </div>

        <button 
          onClick={() => {
            setCurrentIndex(0);
            setScore(0);
            setLives(5);
            setShowFinished(false);
          }}
          className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 py-4 rounded-2xl font-black transition-colors"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Top Bar info */}
      <div className="flex justify-between items-center text-xs font-black text-slate-400 tracking-wider">
        <span>QUESTION {currentIndex + 1} OF {items.length}</span>
        <span className="flex items-center gap-1 text-rose-500 font-bold">
          <Heart className="w-4 h-4 fill-rose-500" /> {lives}
        </span>
      </div>

      <div className="space-y-6">
        <p className="text-slate-500 font-semibold text-center">Select the correct translation/definition for:</p>
        
        {/* Word Display Panel */}
        <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider mb-1">Target Term</p>
            <p className="text-4xl font-black tracking-tight leading-none">{currentItem.word}</p>
          </div>
          <button 
            onClick={(e) => handleSpeech(currentItem.word, e)}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors self-center"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 w-full">
          {shuffledOptions.map((opt: any, i: number) => {
            const isCorrectOption = opt.isCorrect;
            const isSelected = selectedOption === i;
            
            let btnClass = "border-slate-200 bg-white hover:border-slate-300 text-slate-700 active:bg-slate-50";
            if (isAnswered) {
              if (isCorrectOption) {
                btnClass = "border-green-500 bg-green-50 text-green-700 shadow-md shadow-green-500/10";
              } else if (isSelected) {
                btnClass = "border-rose-500 bg-rose-50 text-rose-700 shadow-md shadow-rose-500/10";
              } else {
                btnClass = "border-slate-100 bg-white text-slate-400 opacity-60";
              }
            }

            return (
              <button 
                key={i}
                disabled={isAnswered}
                onClick={() => handleSelect(i)}
                className={`p-5 border-2 rounded-2xl text-left font-bold text-sm transition-all flex items-center justify-between ${btnClass}`}
              >
                <div className="flex items-center flex-1 pr-4">
                  <span className={`inline-block w-7 h-7 rounded-lg text-xs text-center leading-7 mr-4 font-black ${
                    isAnswered && isCorrectOption 
                      ? "bg-green-500 text-white"
                      : isAnswered && isSelected
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="leading-snug">{opt.match}</span>
                </div>
                
                {isAnswered && isCorrectOption && (
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                )}
                {isAnswered && isSelected && !isCorrectOption && (
                  <X className="w-5 h-5 text-rose-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Answer feedback message and Action button */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-[2rem] border-2 flex items-center justify-between gap-4 ${
              shuffledOptions[selectedOption!].isCorrect
                ? "bg-green-50/50 border-green-100 text-green-800"
                : "bg-rose-50/50 border-rose-100 text-rose-800"
            }`}
          >
            <div>
              <p className="font-black text-sm">
                {shuffledOptions[selectedOption!].isCorrect ? "Brilliant! You are correct!" : "Oops! Keep learning!"}
              </p>
              <p className="text-xs font-semibold opacity-85 mt-0.5">
                {shuffledOptions[selectedOption!].isCorrect 
                  ? "Great vocabulary recall. You earn +5 XP!" 
                  : `Correct answer was: ${currentItem.match}`}
              </p>
            </div>
            
            <button 
              onClick={handleNext}
              className={`p-4 rounded-full text-white font-bold flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
                shuffledOptions[selectedOption!].isCorrect ? "bg-green-500" : "bg-rose-500"
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
