import { Play } from 'lucide-react';

export default function GamePhase({ data }: { data: any }) {
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
}
