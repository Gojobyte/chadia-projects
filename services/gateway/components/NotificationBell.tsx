"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien?: string | null;
  lu: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  "projet.created": "ph-folder-plus",
  "tender.created": "ph-megaphone",
  "tender.published": "ph-broadcast",
  "tender.attributed": "ph-medal",
  "submission.received": "ph-tray-arrow-down",
  "document.uploaded": "ph-upload",
  "deadline.reminder": "ph-clock-countdown",
  default: "ph-bell",
};

function iconFor(type: string): string {
  return TYPE_ICON[type] ?? TYPE_ICON.default;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} j`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Charge les notifications + polling toutes les 60 secondes
  async function load() {
    setLoading(true);
    try {
      const resp = await fetch("/api/me/notifications?limit=10", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        setNotifs(data.notifications ?? []);
      }
    } catch { /* silencieux */ }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  // Fermer le dropdown au clic en dehors
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  async function markAsRead(id: string) {
    await fetch(`/api/me/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    startTransition(() => router.refresh());
  }

  async function markAllAsRead() {
    await fetch("/api/me/notifications/read-all", {
      method: "PATCH",
      credentials: "include",
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, lu: true })));
    startTransition(() => router.refresh());
  }

  const unread = notifs.filter((n) => !n.lu).length;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        className="icon-btn"
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        <i className="ph ph-bell" aria-hidden="true" style={{ fontSize: 16 }}></i>
        {unread > 0 && (
          <span
            className="dot"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 8,
              background: "var(--color-terracotta)",
              color: "var(--color-page)",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 380,
            maxHeight: "70vh",
            overflow: "hidden",
            background: "var(--color-page)",
            border: "1px solid var(--color-line-strong)",
            borderRadius: 8,
            boxShadow: "var(--shadow-3)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--color-line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, margin: 0 }}>
                Notifications
              </h4>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-stone)", marginTop: 2 }}>
                {unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}
              </div>
            </div>
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-terracotta)",
                  cursor: "pointer",
                  fontSize: 12,
                  textDecoration: "underline",
                }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div style={{ overflow: "auto", flex: 1 }}>
            {loading && notifs.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-stone)", fontSize: 13 }}>
                <i className="ph ph-circle-notch" style={{ fontSize: 24 }}></i>
                <div style={{ marginTop: 8 }}>Chargement…</div>
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-stone)" }}>
                <i className="ph ph-bell-slash" style={{ fontSize: 32 }}></i>
                <div style={{ marginTop: 8, fontSize: 13 }}>Aucune notification</div>
              </div>
            )}
            {notifs.map((n) => {
              // Link exige un href obligatoire : on rend deux wrappers
              // explicites plutôt qu'un composant conditionnel non typable.
              const rowStyle: React.CSSProperties = {
                display: "flex",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-line)",
                cursor: "pointer",
                background: n.lu ? "transparent" : "var(--color-terracotta-soft)",
                textDecoration: "none",
                color: "var(--color-ink)",
              };
              const handleClick = () => {
                if (!n.lu) markAsRead(n.id);
                if (n.lien) setOpen(false);
              };
              const row = (
                <>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      background: n.lu ? "var(--color-canvas)" : "var(--color-terracotta-soft)",
                      color: "var(--color-terracotta)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      fontSize: 16,
                    }}
                  >
                    <i className={`ph ${iconFor(n.type)}`}></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontSize: 13, fontWeight: n.lu ? 500 : 600, lineHeight: 1.3 }}>{n.titre}</strong>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-stone)", flexShrink: 0 }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-sepia)", margin: "2px 0 0", lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                  </div>
                </>
              );
              return n.lien ? (
                <Link key={n.id} href={n.lien} onClick={handleClick} style={rowStyle}>
                  {row}
                </Link>
              ) : (
                <div key={n.id} onClick={handleClick} style={rowStyle}>
                  {row}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: 12, borderTop: "1px solid var(--color-line)", textAlign: "center" }}>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{ color: "var(--color-terracotta)", fontSize: 12, textDecoration: "none", fontWeight: 600 }}
            >
              Voir toutes les notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
