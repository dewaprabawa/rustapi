import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Mic, Square, Send, Volume2, Sparkles, AlertCircle, Play, User, Bot, Award } from 'lucide-react';
import { sendConversationTextChat, sendConversationVoiceChat } from '../../../services/api';
import type { ConversationChatMessage } from '../../../services/api';

interface ChatBubble {
  role: 'user' | 'assistant';
  content: string;
  audioBase64?: string;
  isAudioPlaying?: boolean;
}

export default function ConversationPhase({ data }: { data: any }) {
  const scenarioContext = data?.scenario_context || "English conversation practice.";
  const maxTurns = data?.turn_count || 3;
  
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  // Initialize/Start the roleplay conversation
  const startConversation = async () => {
    setIsSending(true);
    setError(null);
    try {
      // Warm up prompt: Tell the AI to start the roleplay based on the scenario
      const initialPrompt = "Hello! Let's start our roleplay conversation. You begin the roleplay naturally based on the current hospitality scenario context. Keep it welcoming and natural.";
      
      const response = await sendConversationTextChat({
        message: initialPrompt,
        history: [],
        context: scenarioContext
      });

      setMessages([
        {
          role: 'assistant',
          content: response.reply_text,
          audioBase64: response.audio_base64
        }
      ]);
      
      setIsStarted(true);
      
      if (response.audio_base64) {
        playBase64Audio(response.audio_base64, 0);
      }
    } catch (err: any) {
      console.error("Failed to start roleplay", err);
      // Safe fallback if API keys are missing or server fails
      setMessages([
        {
          role: 'assistant',
          content: "Hello! Welcome back to our hotel. How can I help you today? (Note: AI generation degraded gracefully, please respond below)"
        }
      ]);
      setIsStarted(true);
    } finally {
      setIsSending(false);
    }
  };

  // Play audio from base64 string
  const playBase64Audio = (base64String: string, messageIndex: number) => {
    // Stop any currently playing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    try {
      const audioUrl = `data:audio/mpeg;base64,${base64String}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      
      // Update playing state
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, isAudioPlaying: true } : { ...msg, isAudioPlaying: false }
      ));

      audio.onended = () => {
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex ? { ...msg, isAudioPlaying: false } : msg
        ));
      };

      audio.onerror = () => {
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex ? { ...msg, isAudioPlaying: false } : msg
        ));
      };

      audio.play();
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  // Send a text message response
  const handleSendText = async () => {
    if (!inputValue.trim() || isSending) return;
    
    const userText = inputValue.trim();
    setInputValue('');
    setError(null);
    setIsSending(true);

    // 1. Add user message locally
    const updatedMessages = [...messages, { role: 'user' as const, content: userText }];
    setMessages(updatedMessages);
    
    const nextTurn = currentTurn + 1;
    setCurrentTurn(nextTurn);

    try {
      // Map messaging history for the backend
      const history: ConversationChatMessage[] = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      // 2. Call backend text-chat endpoint
      const response = await sendConversationTextChat({
        message: userText,
        history: history,
        context: scenarioContext
      });

      // 3. Add AI message locally
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply_text,
          audioBase64: response.audio_base64
        }
      ]);

      // Play audio response automatically
      if (response.audio_base64) {
        // Wait a small moment to ensure state resolves
        setTimeout(() => {
          playBase64Audio(response.audio_base64, updatedMessages.length);
        }, 100);
      }

      // Check if roleplay limits reached
      if (nextTurn >= maxTurns) {
        setTimeout(() => {
          setShowSummary(true);
        }, 1500);
      }

    } catch (err: any) {
      console.error("AI response failed", err);
      // Soft graceful degradation
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I understand. Let's proceed with the next step of our check-in. What guest services can we offer you?"
        }
      ]);
      
      if (nextTurn >= maxTurns) {
        setTimeout(() => {
          setShowSummary(true);
        }, 1500);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Start voice recording
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
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        await handleSendVoice(audioBlob);
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access failed", err);
      setError("Microphone access denied. Please allow microphone permissions or type your message instead.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process voice/audio input and send to backend
  const handleSendVoice = async (audioBlob: Blob) => {
    setError(null);
    setIsSending(true);

    try {
      // 1. Send speech audio to voice-chat endpoint (handles STT + LLM + TTS in backend)
      const response = await sendConversationVoiceChat(audioBlob, scenarioContext);
      
      // Update turns count
      const nextTurn = currentTurn + 1;
      setCurrentTurn(nextTurn);

      // 2. Add parsed user transcript & AI response to chat
      const currentMessagesCount = messages.length;
      setMessages(prev => [
        ...prev,
        { role: 'user', content: response.transcript },
        { 
          role: 'assistant', 
          content: response.reply_text,
          audioBase64: response.audio_base64
        }
      ]);

      // Play synthesized audio response automatically
      if (response.audio_base64) {
        setTimeout(() => {
          playBase64Audio(response.audio_base64, currentMessagesCount + 1);
        }, 100);
      }

      // Check if completed
      if (nextTurn >= maxTurns) {
        setTimeout(() => {
          setShowSummary(true);
        }, 2000);
      }

    } catch (err: any) {
      console.error("Voice chat failed", err);
      setError("Failed to process speaking audio. Please try typing your response.");
    } finally {
      setIsSending(false);
    }
  };

  if (showSummary) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl mx-auto bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 text-center shadow-xl shadow-slate-100/50"
      >
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
          <Award className="w-12 h-12 text-white animate-pulse" />
        </div>
        <h4 className="text-3xl font-black text-slate-900 mb-2">Roleplay Completed!</h4>
        <p className="text-slate-500 font-bold mb-8">Excellent job! You successfully maintained conversational fluency.</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Conversational Turns</p>
            <p className="text-3xl font-black text-slate-900">{currentTurn} / {maxTurns}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">XP Reward</p>
            <p className="text-3xl font-black text-blue-600">+25 XP</p>
          </div>
        </div>

        <div className="text-left space-y-4 mb-8 bg-slate-50 p-6 border border-slate-100 rounded-3xl">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Conversation Tutor Summary</p>
          <p className="text-sm font-bold text-slate-600 leading-relaxed">
            You successfully completed a check-in simulation roleplay. You demonstrated strong communication skills, natural conversational phrasing, and hospitality-focused English. Keep up the great work!
          </p>
        </div>

        <p className="text-slate-400 font-bold text-sm">Click the blue <span className="text-blue-600 font-black">Continue</span> button below to finish this lesson.</p>
      </motion.div>
    );
  }

  if (!isStarted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl mx-auto bg-gradient-to-tr from-slate-50 to-white border border-slate-150 rounded-[3rem] p-10 text-center shadow-lg hover:border-blue-100 transition-all duration-300"
      >
        <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-10 h-10 text-blue-600" />
        </div>
        <h4 className="text-2xl font-black text-slate-900 mb-3">AI Roleplay Conversation</h4>
        <p className="text-slate-500 font-bold mb-8 leading-relaxed max-w-sm mx-auto">
          Practice interactive speaking with our AI hospitality tutor based on the following scenario.
        </p>

        {/* Scenario context banner */}
        <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-6 text-left mb-8 max-w-md mx-auto">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Scenario Context</span>
          <p className="text-slate-700 font-bold mt-1.5 leading-relaxed text-sm">
            {scenarioContext}
          </p>
        </div>

        <button 
          onClick={startConversation}
          disabled={isSending}
          className="w-full max-w-xs bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </span>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              Start Roleplay
            </>
          )}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-[32rem] bg-white border border-slate-150 rounded-[2.5rem] overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">AI Tutor</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Active Roleplay</p>
          </div>
        </div>
        
        {/* Turns Indicator */}
        <span className="bg-slate-200/60 text-slate-600 px-3 py-1 rounded-full text-xs font-black">
          Turn {currentTurn} / {maxTurns}
        </span>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-slate-50/30">
        {messages.map((msg, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2.5 max-w-[85%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar icons */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble contents */}
            <div className={`p-4 rounded-3xl leading-relaxed text-sm font-semibold relative ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-150 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              <p>{msg.content}</p>

              {/* TTS play voice back button for AI responses */}
              {msg.role === 'assistant' && msg.audioBase64 && (
                <button 
                  onClick={() => playBase64Audio(msg.audioBase64!, index)}
                  className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-black transition-all ${
                    msg.isAudioPlaying 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${msg.isAudioPlaying ? 'animate-bounce text-blue-500' : ''}`} />
                  {msg.isAudioPlaying ? "Playing" : "Listen"}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {isSending && (
          <div className="flex items-center gap-2 p-4 bg-white border border-slate-150 rounded-3xl rounded-tl-none mr-auto max-w-[40%] shadow-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel with Text and Voice options */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          {/* Voice recording button */}
          {isRecording ? (
            <button 
              onClick={stopRecording}
              className="p-4 bg-rose-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-rose-500/25 flex-shrink-0 animate-pulse"
            >
              <Square className="w-5 h-5 fill-white" />
            </button>
          ) : (
            <button 
              onClick={startRecording}
              disabled={isSending}
              className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50"
              title="Voice Speech Input"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {/* Text input box */}
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder={isRecording ? "Recording speech audio..." : "Type response to AI tutor..."}
            disabled={isSending || isRecording}
            className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-75"
          />

          {/* Send text button */}
          <button 
            onClick={handleSendText}
            disabled={!inputValue.trim() || isSending || isRecording}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50 disabled:hover:scale-100 shadow-md shadow-blue-500/10"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 font-bold text-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <p className="leading-snug">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
