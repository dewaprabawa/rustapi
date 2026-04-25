import { useQuery } from "@tanstack/react-query"
import { Plus, BrainCircuit, Play, Settings2 } from "lucide-react"
import { getScenarios } from "../services/api"

export default function Scenarios() {
  const { data } = useQuery({
    queryKey: ['scenarios'],
    queryFn: getScenarios,
    initialData: {
      data: [
        { id: '1', title: 'Check-in with an Angry Guest', category: 'Hotel', difficulty: 'advanced', is_active: true },
        { id: '2', title: 'Taking a Room Service Order', category: 'Hotel', difficulty: 'beginner', is_active: true },
        { id: '3', title: 'Explaining the Menu', category: 'Restaurant', difficulty: 'intermediate', is_active: false },
        { id: '4', title: 'Handling Dietary Restrictions', category: 'Restaurant', difficulty: 'advanced', is_active: true },
      ]
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">AI Interview Scenarios</h2>
          <p className="text-slate-500 text-sm mt-1">Manage interactive roleplay scenarios and AI configurations.</p>
        </div>
        
        <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-indigo-600/20 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5">
          <Plus className="mr-2 h-4 w-4" />
          Create Scenario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data?.data?.map((item: any) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-full shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-start mb-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  item.difficulty === 'beginner' ? 'bg-emerald-50 text-emerald-700' : 
                  item.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-700' : 
                  'bg-rose-50 text-rose-700'
                }`}>
                  {item.difficulty}
                </span>
                <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                item.is_active ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400 border border-slate-200"
              }`}>
                {item.category}
              </span>
              
              <button className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
                <Play className="mr-1 h-3.5 w-3.5" />
                Test Agent
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
