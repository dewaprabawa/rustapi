import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCoursePath, reorderModules, reorderLessons } from '../../services/api';
import { GripVertical, Plus, ChevronRight, ChevronDown, Video, Edit3, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CurriculumTreeBuilder({ courseId, openEditModal, openCreateModal }: any) {
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const { data: pathData, isLoading } = useQuery({
    queryKey: ['coursePath', courseId],
    queryFn: () => getCoursePath(courseId),
    enabled: !!courseId,
  });

  const reorderModulesMutation = useMutation({
    mutationFn: reorderModules,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coursePath', courseId] }),
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: reorderLessons,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coursePath', courseId] }),
  });

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    if (type === 'module') {
      const items = Array.from(pathData.modules);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      // Optimistic UI update could go here. For now, just mutate.
      const ids = items.map((m: any) => m._id?.$oid || m.id);
      reorderModulesMutation.mutate(ids);
    } else if (type === 'lesson') {
      // Find the source and destination modules
      const sourceModuleIndex = pathData.modules.findIndex((m: any) => m._id?.$oid === source.droppableId || m.id === source.droppableId);
      const destModuleIndex = pathData.modules.findIndex((m: any) => m._id?.$oid === destination.droppableId || m.id === destination.droppableId);

      if (sourceModuleIndex === -1 || destModuleIndex === -1) return;

      const sourceModule = pathData.modules[sourceModuleIndex];
      const destModule = pathData.modules[destModuleIndex];

      const sourceLessons = Array.from(sourceModule.lessons);
      const destLessons = source.droppableId === destination.droppableId ? sourceLessons : Array.from(destModule.lessons);

      const [reorderedItem] = sourceLessons.splice(source.index, 1);
      
      // If moving to a different module, we also need to update the backend to change the module_id of the lesson.
      // For now, let's assume we're only reordering WITHIN the same module for simplicity, as changing module_id requires a different endpoint.
      if (source.droppableId !== destination.droppableId) {
        alert("Moving lessons between modules is coming soon! For now, reorder within the same module.");
        return;
      }

      destLessons.splice(destination.index, 0, reorderedItem);
      
      const ids = destLessons.map((l: any) => l._id?.$oid || l.id);
      reorderLessonsMutation.mutate(ids);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading curriculum path...</div>;
  if (!pathData) return null;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-inner">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Curriculum Builder</h3>
          <p className="text-sm text-slate-500">Drag and drop to reorganize modules and lessons.</p>
        </div>
        <button 
          onClick={() => openCreateModal('modules')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Module
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="course" type="module">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-4"
            >
              {pathData.modules.map((moduleData: any, index: number) => {
                const module = moduleData.module || moduleData; // handle flatten
                const moduleId = module._id?.$oid || module.id;
                const isExpanded = expandedModules[moduleId] ?? true;
                const lessons = moduleData.lessons || [];

                return (
                  <Draggable key={moduleId} draggableId={moduleId} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                      >
                        {/* Module Header */}
                        <div className="flex items-center p-4 bg-white group border-b border-slate-100">
                          <div {...provided.dragHandleProps} className="mr-3 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          
                          <button 
                            onClick={() => toggleModule(moduleId)}
                            className="mr-3 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-slate-800">{module.title}</span>
                              {!module.is_published && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">Draft</span>
                              )}
                            </div>
                            {module.description && <p className="text-sm text-slate-500 truncate mt-0.5">{module.description}</p>}
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <button 
                              onClick={() => openEditModal(module, 'modules')}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openCreateModal('lessons', moduleId)}
                              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 font-medium rounded-lg flex items-center gap-1 border border-indigo-100"
                            >
                              <Plus className="w-3.5 h-3.5" /> Lesson
                            </button>
                          </div>
                        </div>

                        {/* Lessons List (Droppable) */}
                        {isExpanded && (
                          <div className="bg-slate-50/50 p-4 pl-14">
                            <Droppable droppableId={moduleId} type="lesson">
                              {(provided) => (
                                <div 
                                  {...provided.droppableProps} 
                                  ref={provided.innerRef}
                                  className="space-y-2 min-h-[50px]"
                                >
                                  {lessons.length === 0 ? (
                                    <div className="text-sm text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-lg">
                                      No lessons yet. Click "Lesson" to add one.
                                    </div>
                                  ) : (
                                    lessons.map((lesson: any, lessonIndex: number) => {
                                      const lessonId = lesson._id?.$oid || lesson.id;
                                      return (
                                        <Draggable key={lessonId} draggableId={lessonId} index={lessonIndex}>
                                          {(provided) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              className="flex items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-indigo-300 transition-colors"
                                            >
                                              <div {...provided.dragHandleProps} className="mr-3 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                                <GripVertical className="w-4 h-4" />
                                              </div>
                                              
                                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 text-xs font-bold border border-indigo-100">
                                                {lessonIndex + 1}
                                              </div>

                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-slate-700">{lesson.title}</span>
                                                  {lesson.video_url && <Video className="w-3.5 h-3.5 text-blue-500" />}
                                                </div>
                                              </div>

                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                <button 
                                                  onClick={() => openEditModal(lesson, 'lessons')}
                                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                  <Edit3 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      )
                                    })
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
