export default function VocabDrillPhase({ data }: { data: any }) {
  const drill = data?.drills?.[0]; // Just show first drill for now
  
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-slate-900">Vocab Mastery</h3>
      {drill?.drill_type === 'matching' ? (
        <>
          <p className="text-slate-500 font-medium">Select the correct definition for:</p>
          <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-lg">
             <p className="text-4xl font-black">{drill.items[0]?.word}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 w-full">
            {drill.items.map((item: any, i: number) => (
              <button key={i} className="p-5 bg-white border-2 border-slate-200 rounded-2xl text-left font-bold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all">
                <span className="inline-block w-8 h-8 rounded-lg bg-slate-100 text-slate-400 text-center leading-8 mr-4">{i + 1}</span>
                {item.match}
              </button>
            ))}
          </div>
        </>
      ) : (
         <div className="p-12 text-slate-400">Drill type {drill?.drill_type} coming soon</div>
      )}
    </div>
  );
}
