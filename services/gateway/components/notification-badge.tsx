"use client";

import { useState, useEffect } from "react";

export function NotificationBadge() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: string; titre: string; message: string; lien: string | null; lu: boolean; createdAt: string }[]>([]);

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  async function loadNotifs() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setCount(data.nonLues);
      setNotifs(data.notifications);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT" });
    setCount(0);
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
  }

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open && count > 0) markAllRead(); }}
        className="relative p-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
        <svg className="w-5 h-5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: "#dc2626" }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-[#e2e8f0] rounded-lg shadow-lg z-50">
          <div className="px-4 py-2 border-b border-[#e2e8f0]">
            <p className="text-[12px] font-bold text-[#1a365d]">Notifications</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="p-4 text-center text-[12px] text-[#94a3b8]">Aucune notification</p>
            ) : (
              notifs.map(n => (
                <a key={n.id} href={n.lien ?? "#"}
                  className={`block px-4 py-2.5 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors ${!n.lu ? "bg-[#e8f4fc]" : ""}`}>
                  <p className="text-[12px] font-semibold text-[#1e293b]">{n.titre}</p>
                  <p className="text-[11px] text-[#64748b] mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">
                    {new Date(n.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
