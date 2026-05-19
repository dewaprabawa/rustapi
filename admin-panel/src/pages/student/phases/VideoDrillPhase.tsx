import { Play } from 'lucide-react';

export default function VideoDrillPhase({ data }: { data: any }) {
  return (
    <div className="space-y-8 w-full max-w-2xl">
      <h3 className="text-3xl font-black text-slate-900">Video Drill</h3>
      <p className="text-slate-500 font-medium">Watch and interact with the video.</p>
      
      <div className="p-12 bg-slate-50 rounded-[2rem] border border-slate-200 flex flex-col items-center text-center">
         <Play className="w-16 h-16 text-blue-500 mb-4" />
         <p className="text-xl font-black text-slate-900 mb-2">{data.drills?.[0]?.title || "Loading Video..."}</p>
         <p className="text-slate-500 font-bold mb-4">{data.drills?.[0]?.step_count || 0} Interactive Steps</p>
         <p className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border">
            Web player coming soon. Please use the mobile app.
         </p>
      </div>
    </div>
  );
}
