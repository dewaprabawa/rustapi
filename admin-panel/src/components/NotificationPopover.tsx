import { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, normalizeDate, getId } from "../lib/utils";
import { getAdminNotifications, markAdminNotificationRead } from "../services/api";

interface Notification {
  _id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const response = await getAdminNotifications(1, 5);
      setNotifications(response.data);
      const unread = response.data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markAdminNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = normalizeDate(dateStr);
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all relative",
          isOpen && "bg-slate-100 text-slate-600"
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in duration-300">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-200/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center">
              <Bell className="h-4 w-4 mr-2 text-blue-600" />
              Recent Activity
            </h3>
            <Link 
              to="/notifications" 
              onClick={() => setIsOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              View all
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div 
                    key={getId(notif._id)}
                    className={cn(
                      "p-4 hover:bg-slate-50/80 transition-colors group relative",
                      !notif.is_read && "bg-blue-50/30"
                    )}
                  >
                    {!notif.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-slate-900 text-sm leading-tight pr-6">
                        {notif.title}
                      </h4>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          className="text-slate-300 hover:text-blue-500 p-1 rounded-md hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100 absolute right-2 top-2"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center text-[10px] text-slate-400 font-medium">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(notif.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Bell className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500">No recent notifications</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
            <button className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
