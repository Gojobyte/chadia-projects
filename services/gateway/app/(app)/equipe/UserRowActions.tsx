"use client";

import { useState, useRef, useEffect, useTransition } from "react";

type Role = "ADMIN" | "DIRECTEUR" | "FINANCIER" | "MEMBRE";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: Role;
  isActive: boolean;
  /** Le rôle de l'utilisateur courant (pour cacher les actions interdites) */
  currentUserRole: Role;
  isSelf: boolean;
  patchAction: (id: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  deleteAction: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

const ROLE_LABEL: Record<Role, string> = {
  DIRECTEUR: "Directeur",
  ADMIN: "Admin",
  FINANCIER: "Financier",
  MEMBRE: "Membre",
};

export function UserRowActions({
  userId,
  userName,
  userEmail,
  currentRole,
  isActive,
  currentUserRole,
  isSelf,
  patchAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Seuls ADMIN et DIRECTEUR ont accès aux actions
  const canManage = currentUserRole === "ADMIN" || currentUserRole === "DIRECTEUR";
  // Seul DIRECTEUR peut désactiver/supprimer
  const canDelete = currentUserRole === "DIRECTEUR" && !isSelf;

  if (!canManage) {
    return (
      <span style={{ fontSize: 11, color: "var(--color-stone)" }}>
        {isSelf ? "vous" : "—"}
      </span>
    );
  }

  function changeRole(newRole: Role) {
    setError(null);
    const fd = new FormData();
    fd.set("role", newRole);
    startTransition(async () => {
      const res = await patchAction(userId, fd);
      if (res.ok) {
        setShowRoleModal(false);
        setOpen(false);
      } else {
        setError(res.error || "Erreur");
      }
    });
  }

  function toggleActive() {
    setError(null);
    const fd = new FormData();
    fd.set("isActive", isActive ? "false" : "true");
    startTransition(async () => {
      const res = await patchAction(userId, fd);
      if (res.ok) setOpen(false);
      else setError(res.error || "Erreur");
    });
  }

  function doDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteAction(userId);
      if (res.ok) {
        setConfirmDelete(false);
        setOpen(false);
      } else {
        setError(res.error || "Erreur");
      }
    });
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--color-stone)",
          cursor: "pointer",
          padding: 4,
          fontSize: 16,
        }}
        title="Actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <i className="ph ph-dots-three" aria-hidden="true"></i>
      </button>

      {open ? (
        <div className="row-menu">
          <button type="button" onClick={() => setShowRoleModal(true)} disabled={pending}>
            <i className="ph ph-shield-check" aria-hidden="true"></i> Changer le rôle…
          </button>
          {!isSelf ? (
            <button type="button" onClick={toggleActive} disabled={pending}>
              <i className={`ph ${isActive ? "ph-pause-circle" : "ph-play-circle"}`} aria-hidden="true"></i>
              {isActive ? "Désactiver le compte" : "Réactiver le compte"}
            </button>
          ) : null}
          {canDelete ? (
            <>
              <div className="row-menu-sep"></div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                style={{ color: "var(--color-danger)" }}
              >
                <i className="ph ph-trash" aria-hidden="true"></i> Supprimer le membre
              </button>
            </>
          ) : null}
          {error ? <div className="row-menu-error">{error}</div> : null}
        </div>
      ) : null}

      {/* Modal : changer le rôle */}
      {showRoleModal ? (
        <div className="row-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowRoleModal(false); }}>
          <div className="row-modal-frame">
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, margin: "0 0 6px" }}>
              Changer le rôle de <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>{userName}</em>
            </h4>
            <p style={{ fontSize: 12, color: "var(--color-stone)", margin: "0 0 14px" }}>
              {userEmail} · rôle actuel : {ROLE_LABEL[currentRole]}
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {(["DIRECTEUR", "ADMIN", "FINANCIER", "MEMBRE"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRole(r)}
                  disabled={pending || r === currentRole}
                  className={`role-opt ${r === currentRole ? "current" : ""}`}
                >
                  <span style={{ fontWeight: 500, color: "var(--color-ink)" }}>{ROLE_LABEL[r]}</span>
                  <span style={{ fontSize: 11, color: "var(--color-stone)", marginLeft: "auto" }}>
                    {r === currentRole ? "Rôle actuel" : null}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, gap: 8 }}>
              <button type="button" onClick={() => setShowRoleModal(false)} className="btn btn--ghost btn--sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal : confirmation de suppression */}
      {confirmDelete ? (
        <div className="row-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="row-modal-frame">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <i className="ph-fill ph-warning-octagon" style={{ color: "var(--color-danger)", fontSize: 28 }} aria-hidden="true"></i>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, margin: 0 }}>
                Supprimer ce <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>membre</em> ?
              </h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-shale)", lineHeight: 1.5, margin: "0 0 14px" }}>
              La suppression est un <strong>soft-delete</strong> : le compte est désactivé et l&apos;utilisateur ne peut plus se connecter, mais ses contributions (candidatures, documents) restent visibles.
              <br />
              Membre concerné : <strong>{userName}</strong> ({userEmail})
            </p>
            {error ? <div className="row-menu-error">{error}</div> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn--ghost btn--sm" disabled={pending}>
                Annuler
              </button>
              <button type="button" onClick={doDelete} disabled={pending} className="btn btn--danger btn--sm">
                {pending ? "Suppression…" : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .row-menu {
          position: absolute;
          right: 0;
          top: 28px;
          min-width: 220px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 8px;
          box-shadow: 0 8px 24px -10px rgba(26, 22, 18, 0.18);
          padding: 6px;
          z-index: 30;
          display: flex; flex-direction: column;
          font-size: 12.5px;
        }
        .row-menu button {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          font-family: inherit;
          background: transparent;
          border: 0;
          text-align: left;
          color: var(--color-sepia);
          border-radius: 4px;
          cursor: pointer;
        }
        .row-menu button:hover { background: var(--color-canvas); color: var(--color-ink); }
        .row-menu button:disabled { opacity: 0.5; cursor: not-allowed; }
        .row-menu-sep { height: 1px; background: var(--color-line); margin: 4px 0; }
        .row-menu-error {
          margin-top: 8px;
          padding: 6px 10px;
          background: var(--color-danger-soft);
          color: var(--color-danger);
          border-radius: 4px;
          font-size: 11px;
        }

        .row-modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(26, 22, 18, 0.55);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: grid; place-items: center;
          padding: 24px;
        }
        .row-modal-frame {
          background: var(--color-surface);
          border-radius: 12px;
          width: 100%;
          max-width: 420px;
          padding: 20px;
          box-shadow: 0 24px 60px -20px rgba(26, 22, 18, 0.4);
        }
        .role-opt {
          display: flex; align-items: center;
          padding: 10px 12px;
          background: var(--color-canvas);
          border: 1px solid var(--color-line);
          border-radius: 6px;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
        }
        .role-opt:hover:not(:disabled) {
          background: var(--color-terracotta-soft);
          border-color: var(--color-terracotta-line);
        }
        .role-opt.current { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
