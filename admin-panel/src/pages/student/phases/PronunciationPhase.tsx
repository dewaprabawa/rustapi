import { Volume2, MessageCircle } from 'lucide-react';

export default function PronunciationPhase({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-slate-900">Perfect Pronunciation</h3>
      <p className="text-slate-500 font-medium">Listen and repeat carefully:</p>
      
      <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-200 flex flex-col items-center">
        <Volume2 className="w-12 h-12 text-blue-600 mb-6" />
        <p className="text-2xl font-black text-slate-900">"{data?.sentences?.[0]}"</p>
      </div>

      <button className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-500/30 animate-pulse mx-auto">
        <MessageCircle className="w-10 h-10" />
      </button>
      <p className="text-rose-500 font-bold uppercase tracking-widest text-sm text-center">Tap to Record</p>
    </div>
  );
}
