import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCoursePath } from '../../services/api';
import { Lock, Star, Play, CheckCircle2, Crown, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface LearningPathProps {
  courseId: string;
}

export function LearningPath({ courseId }: LearningPathProps) {
  const navigate = useNavigate();
  const { data: pathData, isLoading } = useQuery({
    queryKey: ['coursePath', courseId],
    queryFn: () => getCoursePath(courseId),
    enabled: !!courseId,
  });

  // Mock progress state for preview purposes
  const [currentActiveLesson, setCurrentActiveLesson] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Path...</div>;
  if (!pathData) return null;

  // Find the first lesson to make it active if none is set
  const firstLessonId = pathData.modules[0]?.lessons[0]?._id?.$oid || pathData.modules[0]?.lessons[0]?.id;
  const activeLessonId = currentActiveLesson || firstLessonId;

  let hasPassedActive = false;

  const handleLessonClick = (lessonId: string, isLocked: boolean) => {
    // Allow clicking and playing any lesson for easy testing of custom configurations
    navigate(`/portal/learn/${lessonId}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 relative">
      {/* Absolute vertical line extending down the whole path */}
      <div className="absolute left-1/2 top-10 bottom-10 w-3 bg-slate-200 -translate-x-1/2 rounded-full z-0 overflow-hidden">
         {/* We could animate a progress fill here */}
         <div className="absolute top-0 left-0 right-0 bg-green-500 rounded-full" style={{ height: '30%' }}></div>
      </div>

      <div className="relative z-10 space-y-16">
        {pathData.modules.map((moduleData: any, mIdx: number) => {
          const module = moduleData.module || moduleData;
          const lessons = moduleData.lessons || [];
          
          return (
            <div key={module._id?.$oid || module.id} className="relative">
              {/* Module Header (Chapter) */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl p-5 mb-8 relative z-20">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-black text-slate-800">Unit {mIdx + 1}: {module.title}</h2>
                  <span className="text-sm font-bold text-slate-400">0 / {lessons.length}</span>
                </div>
                {module.description && <p className="text-sm text-slate-500">{module.description}</p>}
                {/* Module Progress Bar */}
                <div className="h-3 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              {/* Lessons Nodes */}
              <div className="flex flex-col items-center space-y-8 py-4">
                {lessons.map((lesson: any, lIdx: number) => {
                  const lessonId = lesson._id?.$oid || lesson.id;
                  const isActive = lessonId === activeLessonId;
                  
                  if (isActive) hasPassedActive = true;
                  const isLocked = !isActive && hasPassedActive;
                  const isCompleted = !isActive && !hasPassedActive;

                  // Determine node style based on category/skill (Mocking some variety)
                  const isRichCard = lesson.category === 'interview' || lesson.category === 'speaking';
                  const isBoss = lIdx === lessons.length - 1;

                  return (
                    <div 
                      key={lessonId} 
                      className={cn(
                        "relative flex flex-col items-center transition-all duration-300",
                        isActive ? "scale-110 z-30" : "z-20",
                        // Create a slight zig-zag pattern
                        lIdx % 2 === 0 ? "translate-x-0" : "translate-x-8"
                      )}
                    >
                      {/* Node Connection Line to next node (handled by the background line mostly, but we can add SVG paths here for curves) */}

                      {isRichCard ? (
                        /* Rich Action Card Node (Like "Speaking Practice") */
                        <button 
                          onClick={() => handleLessonClick(lessonId, isLocked)}
                          className={cn(
                            "relative w-64 p-4 rounded-2xl shadow-xl flex items-center gap-4 text-left group overflow-hidden border-2",
                            isActive ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white" 
                            : isCompleted ? "bg-white border-green-500 text-slate-800"
                            : "bg-slate-100 border-slate-200 text-slate-400 grayscale"
                          )}
                        >
                          {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                            isActive ? "bg-white/20 text-white" : isCompleted ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400"
                          )}>
                            <MessageCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <span className={cn("block text-xs font-bold uppercase tracking-wider mb-1", isActive ? "text-indigo-200" : isCompleted ? "text-green-600" : "text-slate-400")}>
                              {lesson.category}
                            </span>
                            <span className="block font-black text-[15px] leading-tight">{lesson.title}</span>
                          </div>
                        </button>
                      ) : (
                        /* Standard Circular Node */
                        <div className="relative group">
                          {/* Crown for last lesson of module */}
                          {isBoss && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400">
                              <Crown className="w-8 h-8 fill-amber-400 drop-shadow-md" />
                            </div>
                          )}

                          <button
                            onClick={() => handleLessonClick(lessonId, isLocked)}
                            className={cn(
                              "w-20 h-20 rounded-full border-[6px] flex items-center justify-center shadow-lg transition-all relative overflow-hidden",
                              isActive ? "bg-green-500 border-green-400 text-white shadow-green-500/40 ring-4 ring-green-100 ring-offset-2" 
                              : isCompleted ? "bg-green-500 border-green-600 text-white"
                              : "bg-slate-200 border-slate-300 text-slate-400 shadow-inner"
                            )}
                          >
                            {/* Inner gradient/highlight for active */}
                            {isActive && <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>}

                            {isActive ? (
                              <Star className="w-8 h-8 fill-white drop-shadow-sm" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-8 h-8" />
                            ) : (
                              <Lock className="w-8 h-8" />
                            )}
                          </button>

                          {/* Floating Title Tooltip */}
                          <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 px-4 py-2 bg-white rounded-xl shadow-lg border border-slate-100 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40",
                            // Position tooltip on opposite side of zigzag
                            lIdx % 2 === 0 ? "left-full ml-4" : "right-full mr-4"
                          )}>
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-slate-100 rotate-45 border-l border-b" 
                                 style={lIdx % 2 === 0 ? { left: '-6px' } : { right: '-6px', transform: 'translateY(-50%) rotate(-135deg)' }}></div>
                            {lesson.title}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
