import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Send, Bell, AlertCircle, Loader2, Users as UsersIcon } from "lucide-react"
import { sendNotification, getUsers } from "../services/api"

export default function Notifications() {
  const [targetType, setTargetType] = useState<"broadcast" | "targeted">("broadcast")
  const [userId, setUserId] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // Fetch users for the dropdown (simplified for targeted notifications)
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: () => getUsers(1, 1000), // Get a large list for the dropdown
    enabled: targetType === "targeted",
  })

  const users = usersData?.data || []

  const sendMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      setSuccessMsg("Notification sent successfully!")
      setTitle("")
      setMessage("")
      if (targetType === "targeted") {
        setUserId("")
      }
      setTimeout(() => setSuccessMsg(""), 5000)
    },
    onError: (error: any) => {
      setErrorMsg(error?.response?.data?.message || error?.response?.data?.error || "Failed to send notification.")
      setTimeout(() => setErrorMsg(""), 5000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg("")
    setErrorMsg("")

    if (!title.trim() || !message.trim()) {
      setErrorMsg("Title and message are required.")
      return
    }

    if (targetType === "targeted" && !userId) {
      setErrorMsg("Please select a target user.")
      return
    }

    sendMutation.mutate({
      title,
      message,
      user_id: targetType === "targeted" ? userId : null,
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Send Notifications</h2>
          <p className="text-slate-500 text-sm mt-1">
            Send push notifications to all users or target specific individuals.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Target Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center">
              <UsersIcon className="h-4 w-4 mr-2 text-slate-400" />
              Target Audience
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                  targetType === "broadcast"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="targetType"
                    value="broadcast"
                    checked={targetType === "broadcast"}
                    onChange={() => setTargetType("broadcast")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="ml-3 font-medium text-slate-800">Broadcast to All</span>
                </div>
                <p className="mt-2 ml-7 text-sm text-slate-500">
                  Send this notification to every user with push notifications enabled.
                </p>
              </label>

              <label
                className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                  targetType === "targeted"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="targetType"
                    value="targeted"
                    checked={targetType === "targeted"}
                    onChange={() => setTargetType("targeted")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="ml-3 font-medium text-slate-800">Specific User</span>
                </div>
                <p className="mt-2 ml-7 text-sm text-slate-500">
                  Target a single user by selecting their account.
                </p>
              </label>
            </div>
          </div>

          {/* User Selection Dropdown (Only visible if targeted) */}
          {targetType === "targeted" && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label htmlFor="userId" className="block text-sm font-medium text-slate-700">
                Select User
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center text-sm text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading users...
                </div>
              ) : (
                <select
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
                >
                  <option value="">Select a user...</option>
                  {users.map((user: any) => {
                    const uid = user._id?.$oid || user._id || user.id
                    return (
                      <option key={uid} value={uid}>
                        {user.name || "Unknown"} ({user.email})
                      </option>
                    )
                  })}
                </select>
              )}
            </div>
          )}

          <hr className="border-slate-100" />

          {/* Notification Content */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center">
              <Bell className="h-4 w-4 mr-2 text-slate-400" />
              Message Content
            </h3>
            
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                Notification Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Course Available!"
                maxLength={60}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
              />
              <p className="text-xs text-slate-400 text-right">{title.length}/60</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-slate-700">
                Notification Body
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                rows={4}
                maxLength={200}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all min-h-[120px] resize-y"
              />
              <p className="text-xs text-slate-400 text-right">{message.length}/200</p>
            </div>
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm">
              <div className="h-5 w-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
