import { useState } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';

export default function ObjectivePhase({ data }: { data: any }) {
  const [showToast, setShowToast] = useState(false);

  const handleTranslateTap = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20">
        <Trophy className="w-12 h-12 text-emerald-500" />
      </div>
      <h3 className="text-3xl font-black text-slate-900">Your Goal Today</h3>
      <div className="p-8 bg-emerald-50 rounded-[2rem] text-center border-2 border-emerald-100 shadow-sm relative">
        {data?.objective_id && (
          <button 
            onClick={handleTranslateTap}
            className="absolute -top-3 -right-3 bg-white text-emerald-600 rounded-full p-1.5 shadow-md border border-emerald-200 hover:bg-emerald-50 transition-colors"
            title="Translate to Indonesia"
          >
            <AlertCircle className="w-6 h-6" />
          </button>
        )}
        <p className="text-2xl text-emerald-900 leading-relaxed font-black">
          {data?.objective || "Complete this lesson successfully."}
        </p>
      </div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-8">Are you ready?</p>

      {/* Toast Notification */}
      {showToast && data?.objective_id && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-w-[90vw] text-center w-[300px]">
          <span className="text-xs font-bold block mb-1 text-slate-400 uppercase tracking-widest">Terjemahan</span>
          <span className="text-base font-bold">{data.objective_id}</span>
        </div>
      )}
    </div>
  );
}
