import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Trash2, Eye, ChevronLeft, ChevronRight, Users as UsersIcon, Shield, Mail } from "lucide-react"
import { getUsers, deleteUser } from "../services/api"
import { normalizeDate } from "../lib/utils"

export default function Users() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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

  const users = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  console.log("users Data", users);

  const filtered = search
    ? users.filter((u: any) =>
      (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(search.toLowerCase())
    )
    : users

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Users</h2>
          <p className="text-slate-500 text-sm mt-1">
            {total > 0 ? `${total} registered users` : "Manage platform users"}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin mb-4" />
            <p className="text-sm font-medium">Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <UsersIcon className="h-12 w-12 mb-4 text-slate-200" />
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs text-slate-400 mt-1">Users will appear here once they register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">XP</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user: any) => {
                  const uid = user._id?.$oid || user._id || user.id
                  return (
                    <tr key={uid} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm mr-3">
                            {(user.name || user.email || "U")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 text-sm">{user.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-600">
                          <Mail className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Lv. {user.level ?? 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium tabular-nums">
                        {user.xp ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {user.created_at ? normalizeDate(user.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View details">
                            <Eye className="h-4 w-4" />
                          </button>
                          {deleteConfirm === uid ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteMutation.mutate(uid)}
                                className="px-2.5 py-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(uid)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
            <p className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-700">{page}</span> of{" "}
              <span className="font-medium text-slate-700">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
