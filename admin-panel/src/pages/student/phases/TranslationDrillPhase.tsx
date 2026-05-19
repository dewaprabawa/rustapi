import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, Trophy, Heart, Volume2, Keyboard } from 'lucide-react';

export default function TranslationDrillPhase({ data }: { data: any }) {
  const words = data?.words || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [showFinished, setShowFinished] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentWord = words[currentIndex];

  useEffect(() => {
    setInputValue('');
    setIsAnswered(false);
    setIsCorrect(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [currentIndex]);

  if (words.length === 0) {
    return <div className="p-8 text-center text-slate-400 font-bold">No vocabulary words available for translation.</div>;
  }

  const handleSpeech = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const checkAnswer = () => {
    if (isAnswered || !inputValue.trim()) return;
    
    // Normalize both strings for a fair comparison
    const answer = inputValue.trim().toLowerCase();
    const correct = currentWord.translation.trim().toLowerCase();
    
    // Allow matching direct substrings or exact matches to make it forgiving but precise
    const match = answer === correct || 
                  correct.split(',').map((s: string) => s.trim()).includes(answer);
                  
    setIsCorrect(match);
    setIsAnswered(true);
    
    if (match) {
      setScore(prev => prev + 1);
    } else {
      setLives(prev => Math.max(0, prev - 1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isAnswered) {
        handleNext();
      } else {
        checkAnswer();
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
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
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-blue-600 fill-blue-600 animate-bounce" />
        </div>
        <h4 className="text-2xl font-black text-slate-900 mb-2">Muscle Memory Completed!</h4>
        <p className="text-slate-500 font-bold mb-6">Excellent job! You successfully completed the Writing Translation Drill.</p>

        <div className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-3">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">Words Translated</span>
            <span className="text-green-600 font-black">{score} / {words.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">Lives Saved</span>
            <span className="text-rose-500 font-black flex items-center gap-1">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> {lives}
            </span>
          </div>
          <div className="h-[2px] bg-slate-100 my-2" />
          <div className="flex justify-between items-center text-sm font-black text-blue-600">
            <span>XP Reward</span>
            <span>+{score * 10} XP Earned!</span>
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
          Practice Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Header Info */}
      <div className="flex justify-between items-center text-xs font-black text-slate-400 tracking-wider">
        <span>WRITING DRILL {currentIndex + 1} OF {words.length}</span>
        <span className="flex items-center gap-1 text-rose-500 font-bold">
          <Heart className="w-4 h-4 fill-rose-500" /> {lives}
        </span>
      </div>

      <div className="space-y-6">
        <p className="text-slate-500 font-semibold text-center flex items-center justify-center gap-2">
          <Keyboard className="w-4 h-4 text-blue-500" />
          Write the Indonesian translation:
        </p>

        {/* English Term Card */}
        <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider mb-1">Translate this word</p>
            <p className="text-4xl font-black tracking-tight leading-none">{currentWord.word}</p>
            <p className="text-xs text-blue-200 font-bold mt-2">/{currentWord.pronunciation}/</p>
          </div>
          <button 
            onClick={(e) => handleSpeech(currentWord.word, e)}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* Input area */}
        <div className="space-y-4">
          <div className="relative">
            <input 
              ref={inputRef}
              type="text"
              value={inputValue}
              disabled={isAnswered}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik bahasa Indonesia..."
              className={`w-full px-6 py-5 bg-white border-2 rounded-[2rem] font-bold text-lg text-slate-800 placeholder-slate-400 focus:outline-none transition-all ${
                isAnswered
                  ? isCorrect
                    ? "border-green-500 bg-green-50/20 text-green-700"
                    : "border-rose-500 bg-rose-50/20 text-rose-700"
                  : "border-slate-200 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/5"
              }`}
            />
            {isAnswered && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                {isCorrect ? (
                  <div className="p-1.5 bg-green-500 rounded-full text-white">
                    <Check className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-rose-500 rounded-full text-white">
                    <X className="w-5 h-5" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          {!isAnswered ? (
            <button 
              disabled={!inputValue.trim()}
              onClick={checkAnswer}
              className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-xl transition-all ${
                inputValue.trim()
                  ? "bg-blue-600 text-white shadow-blue-600/20 hover:scale-102 active:scale-98"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              Check Answer
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-[2rem] border-2 flex items-center justify-between gap-4 ${
                isCorrect
                  ? "bg-green-50/50 border-green-100 text-green-800"
                  : "bg-rose-50/50 border-rose-100 text-rose-800"
              }`}
            >
              <div>
                <p className="font-black text-sm">
                  {isCorrect ? "Perfect! Correct!" : "Review needed!"}
                </p>
                <p className="text-xs font-semibold opacity-85 mt-0.5">
                  {isCorrect 
                    ? "Great muscle memory. You earn +10 XP!" 
                    : `Correct translation: ${currentWord.translation}`}
                </p>
              </div>
              
              <button 
                onClick={handleNext}
                className={`p-4 rounded-full text-white font-bold flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
                  isCorrect ? "bg-green-500" : "bg-rose-500"
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
