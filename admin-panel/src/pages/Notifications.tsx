import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Send, Bell, AlertCircle, Loader2, Users as UsersIcon, Check, Clock, Inbox, Mail } from "lucide-react"
import { sendNotification, getUsers, getAdminNotifications, markAdminNotificationRead } from "../services/api"
import { cn, normalizeDate } from "../lib/utils"

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<"inbox" | "send">("inbox")
  const [targetType, setTargetType] = useState<"broadcast" | "targeted">("broadcast")
  const [userId, setUserId] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const queryClient = useQueryClient()

  // --- Inbox Logic ---
  const { data: notificationsData, isLoading: isLoadingInbox } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => getAdminNotifications(1, 50),
    enabled: activeTab === "inbox",
  })

  const markReadMutation = useMutation({
    mutationFn: markAdminNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] })
    }
  })

  // --- Send Logic ---
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: () => getUsers(1, 1000),
    enabled: activeTab === "send" && targetType === "targeted",
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

  const formatTime = (dateStr: string) => {
    const date = normalizeDate(dateStr)
    if (!date) return ""
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Notifications</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage administrative alerts and send push notifications to users.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("inbox")}
          className={cn(
            "flex items-center px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
            activeTab === "inbox" 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Inbox className="h-4 w-4 mr-2" />
          Activity Inbox
          {!isLoadingInbox && notificationsData?.data?.some((n: any) => !n.is_read) && (
            <span className="ml-2 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("send")}
          className={cn(
            "flex items-center px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
            activeTab === "send" 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Mail className="h-4 w-4 mr-2" />
          Send Notification
        </button>
      </div>

      {activeTab === "inbox" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          {isLoadingInbox ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading activity alerts...</p>
            </div>
          ) : notificationsData?.data?.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {notificationsData.data.map((notif: any) => (
                <div 
                  key={notif._id} 
                  className={cn(
                    "p-6 hover:bg-slate-50/50 transition-all group relative flex gap-4",
                    !notif.is_read && "bg-blue-50/30"
                  )}
                >
                  {!notif.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                  )}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm",
                    !notif.is_read ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className="font-semibold text-slate-900 leading-tight">
                        {notif.title}
                      </h4>
                      <div className="flex items-center text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(notif.created_at)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                      {notif.message}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      {!notif.is_read && (
                        <button
                          onClick={() => markReadMutation.mutate(notif._id)}
                          className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center shadow-sm"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <Inbox className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Inbox Empty</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">
                You're all caught up! Administrative alerts will appear here when users register or complete activities.
              </p>
            </div>
          )}
        </div>
      ) : (
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
                    Send to every user with push notifications enabled.
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={sendMutation.isPending}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
              >
                {sendMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Send Notification</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
