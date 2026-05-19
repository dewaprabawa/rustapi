import { Volume2 } from 'lucide-react';

export default function ReadPhase({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-slate-900">Read & Listen</h3>
      
      {data?.video_url ? (
        <div className="w-full aspect-video rounded-[2rem] overflow-hidden bg-slate-900 shadow-lg border-4 border-slate-100">
          <video 
            src={data.video_url} 
            controls 
            className="w-full h-full object-contain"
            preload="metadata"
          />
        </div>
      ) : data?.image_url ? (
        <div className="w-full aspect-video rounded-[2rem] overflow-hidden bg-slate-100 shadow-lg border-4 border-slate-100 flex items-center justify-center">
          <img 
            src={data.image_url} 
            alt="Lesson intro" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : null}

      {data?.audio_url && (
        <div className="w-full bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Volume2 className="w-5 h-5 text-indigo-500" />
            <span>Listen to the lesson</span>
          </div>
          <audio 
            src={data.audio_url} 
            controls 
            className="w-full max-w-md"
            preload="metadata"
          />
        </div>
      )}

      <div className="p-8 bg-slate-50 rounded-[2rem] text-left border border-slate-100">
        <p className="text-xl text-slate-700 leading-relaxed font-medium whitespace-pre-line">
          {data?.content}
        </p>
      </div>
    </div>
  );
}
