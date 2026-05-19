export default function FlashcardPhase({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-slate-900">Flashcards</h3>
      <p className="text-slate-500 font-medium">Review the key terms for this lesson.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.words?.map((v: any) => (
          <div key={v.id} className="p-6 bg-white border-2 border-slate-100 rounded-3xl text-left hover:border-blue-500 transition-colors cursor-pointer group flex flex-col justify-between">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{v.pronunciation}</p>
              <p className="text-xl font-black text-slate-900 group-hover:text-blue-600">{v.word}</p>
              <p className="text-sm text-slate-500 mt-2">{v.translation}</p>
            </div>
            {(v.example_en || v.example_id) && (
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-1">
                {v.example_en && (
                  <p className="text-xs text-slate-600 italic font-medium">"{v.example_en}"</p>
                )}
                {v.example_id && (
                  <p className="text-[11px] text-slate-500">{v.example_id}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
