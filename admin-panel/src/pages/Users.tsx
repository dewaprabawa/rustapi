import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, ChevronLeft, ChevronRight, Users as UsersIcon, Shield, TrendingUp, UserCheck } from "lucide-react"
import { getUsers, deleteUser, updateUser } from "../services/api"
import UserTableRow from "../components/users/UserTableRow"
import UserDetailModal from "../components/users/UserDetailModal"
import UserEditModal from "../components/users/UserEditModal"

export default function Users() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  
  const limit = 15

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, limit],
    queryFn: () => getUsers(page, limit),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setDeleteConfirm(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditingUser(null)
    },
  })

  const users = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  const filtered = search
    ? users.filter((u: any) =>
      (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(search.toLowerCase())
    )
    : users

  const statsSummary = [
    { label: "Total Students", value: total, icon: UsersIcon, color: "blue" },
    { label: "Verified Users", value: users.filter((u: any) => u.is_verified).length, icon: UserCheck, color: "emerald" },
    { label: "Top Level", value: Math.max(0, ...users.map((u: any) => u.level || 0)), icon: Shield, color: "indigo" },
    { label: "Total Activity", value: users.reduce((acc: number, u: any) => acc + (u.xp || 0), 0), icon: TrendingUp, color: "amber" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Student Management</h2>
            <p className="text-slate-500 font-medium mt-1">Monitor progress and manage user accounts.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsSummary.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-xl font-black text-slate-800">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin mb-4" />
            <p className="text-sm font-bold tracking-wide">Fetching students…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <UsersIcon className="h-10 w-10 text-slate-200" />
            </div>
            <p className="text-lg font-bold text-slate-800">No students found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Contact Info</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Learning Level</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Progress (XP)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Registered</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user: any) => (
                  <UserTableRow
                    key={user._id?.$oid || user._id || user.id}
                    user={user}
                    onView={(u) => setSelectedUser(u)}
                    onEdit={(u) => setEditingUser(u)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    deleteConfirm={deleteConfirm}
                    setDeleteConfirm={setDeleteConfirm}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
            <p className="text-xs font-bold text-slate-400">
              SHOWING PAGE <span className="text-slate-800">{page}</span> OF <span className="text-slate-800">{totalPages}</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedUser && (
        <UserDetailModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
      
      {editingUser && (
        <UserEditModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={(id, data) => updateMutation.mutate({ id, data })}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  )
}
