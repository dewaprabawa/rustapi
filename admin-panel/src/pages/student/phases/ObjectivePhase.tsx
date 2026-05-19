import { Trophy } from 'lucide-react';

export default function ObjectivePhase({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20">
        <Trophy className="w-12 h-12 text-emerald-500" />
      </div>
      <h3 className="text-3xl font-black text-slate-900">Your Goal Today</h3>
      <div className="p-8 bg-emerald-50 rounded-[2rem] text-center border-2 border-emerald-100 shadow-sm">
        <p className="text-2xl text-emerald-900 leading-relaxed font-black">
          {data?.objective || "Complete this lesson successfully."}
        </p>
      </div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-8">Are you ready?</p>
    </div>
  );
}
