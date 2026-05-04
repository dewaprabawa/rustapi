import { Trash2, Eye, Shield, Mail, Edit2 } from "lucide-react"
import { normalizeDate } from "../../lib/utils"

interface UserTableRowProps {
  user: any
  onView: (user: any) => void
  onEdit: (user: any) => void
  onDelete: (id: string) => void
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void
  isDeleting: boolean
}

export default function UserTableRow({
  user,
  onView,
  onEdit,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
  isDeleting
}: UserTableRowProps) {
  const uid = user._id?.$oid || user._id || user.id

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm mr-3">
            {user.profile_image_url ? (
              <img 
                src={`${user.profile_image_url}${user.profile_image_url.includes('?') ? '&' : '?'}t=${normalizeDate(user.updated_at)?.getTime() || Date.now()}`} 
                alt="" 
                className="h-full w-full rounded-full object-cover" 
              />
            ) : (
              (user.name || user.email || "U")[0].toUpperCase()
            )}
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
          Lv. {user.level ?? user.persona?.level ?? 1}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium tabular-nums">
        {user.xp ?? user.progress?.total_practice ?? 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
        {(() => {
          const d = normalizeDate(user.created_at);
          return d ? d.toLocaleDateString() : "—";
        })()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onView(user)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onEdit(user)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
            title="Edit user"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          
          {deleteConfirm === uid ? (
            <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
              <button
                onClick={() => onDelete(uid)}
                disabled={isDeleting}
                className="px-2.5 py-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "..." : "Confirm"}
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
}
