"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  joinedAt: Date;
}

export interface RolePermissions {
  [role: string]: {
    label: string;
    color: string;
    permissions: {
      [key: string]: boolean;
    };
  };
}

const PERMISSION_CATEGORIES = {
  "Projet": ["projet.view", "projet.edit", "projet.delete", "projet.manage_members"],
  "Documents": ["documents.view", "documents.create", "documents.edit", "documents.delete", "documents.validate"],
  "Budget": ["budget.view", "budget.edit", "budget.export"],
  "Tâches": ["taches.view", "taches.create", "taches.edit", "taches.assign"],
  "Administration": ["admin.users", "admin.settings", "admin.billing"],
};

const PERMISSION_LABELS: Record<string, string> = {
  "projet.view": "Voir le projet",
  "projet.edit": "Modifier le projet",
  "projet.delete": "Supprimer le projet",
  "projet.manage_members": "Gérer les membres",
  "documents.view": "Voir les documents",
  "documents.create": "Créer des documents",
  "documents.edit": "Modifier les documents",
  "documents.delete": "Supprimer les documents",
  "documents.validate": "Valider les documents",
  "budget.view": "Voir le budget",
  "budget.edit": "Modifier le budget",
  "budget.export": "Exporter le budget",
  "taches.view": "Voir les tâches",
  "taches.create": "Créer des tâches",
  "taches.edit": "Modifier les tâches",
  "taches.assign": "Assigner des tâches",
  "admin.users": "Gérer les utilisateurs",
  "admin.settings": "Paramètres",
  "admin.billing": "Facturation",
};

const DEFAULT_ROLES: RolePermissions = {
  ADMIN: {
    label: "Administrateur",
    color: "#ef4444",
    permissions: {
      "projet.view": true, "projet.edit": true, "projet.delete": true, "projet.manage_members": true,
      "documents.view": true, "documents.create": true, "documents.edit": true, "documents.delete": true, "documents.validate": true,
      "budget.view": true, "budget.edit": true, "budget.export": true,
      "taches.view": true, "taches.create": true, "taches.edit": true, "taches.assign": true,
      "admin.users": true, "admin.settings": true, "admin.billing": true,
    },
  },
  DIRECTEUR: {
    label: "Directeur",
    color: "#3b82f6",
    permissions: {
      "projet.view": true, "projet.edit": true, "projet.delete": false, "projet.manage_members": true,
      "documents.view": true, "documents.create": true, "documents.edit": true, "documents.delete": false, "documents.validate": true,
      "budget.view": true, "budget.edit": true, "budget.export": true,
      "taches.view": true, "taches.create": true, "taches.edit": true, "taches.assign": true,
      "admin.users": false, "admin.settings": false, "admin.billing": false,
    },
  },
  REDACTEUR: {
    label: "Rédacteur",
    color: "#8b5cf6",
    permissions: {
      "projet.view": true, "projet.edit": false, "projet.delete": false, "projet.manage_members": false,
      "documents.view": true, "documents.create": true, "documents.edit": true, "documents.delete": false, "documents.validate": false,
      "budget.view": true, "budget.edit": false, "budget.export": false,
      "taches.view": true, "taches.create": true, "taches.edit": true, "taches.assign": false,
      "admin.users": false, "admin.settings": false, "admin.billing": false,
    },
  },
  RELECTEUR: {
    label: "Relecteur",
    color: "#f59e0b",
    permissions: {
      "projet.view": true, "projet.edit": false, "projet.delete": false, "projet.manage_members": false,
      "documents.view": true, "documents.create": false, "documents.edit": false, "documents.delete": false, "documents.validate": true,
      "budget.view": true, "budget.edit": false, "budget.export": false,
      "taches.view": true, "taches.create": false, "taches.edit": false, "taches.assign": false,
      "admin.users": false, "admin.settings": false, "admin.billing": false,
    },
  },
  FINANCIER: {
    label: "Financier",
    color: "#10b981",
    permissions: {
      "projet.view": true, "projet.edit": false, "projet.delete": false, "projet.manage_members": false,
      "documents.view": false, "documents.create": false, "documents.edit": false, "documents.delete": false, "documents.validate": false,
      "budget.view": true, "budget.edit": true, "budget.export": true,
      "taches.view": true, "taches.create": false, "taches.edit": false, "taches.assign": false,
      "admin.users": false, "admin.settings": false, "admin.billing": false,
    },
  },
  MEMBRE: {
    label: "Membre",
    color: "#6b7280",
    permissions: {
      "projet.view": true, "projet.edit": false, "projet.delete": false, "projet.manage_members": false,
      "documents.view": true, "documents.create": false, "documents.edit": false, "documents.delete": false, "documents.validate": false,
      "budget.view": false, "budget.edit": false, "budget.export": false,
      "taches.view": true, "taches.create": false, "taches.edit": false, "taches.assign": false,
      "admin.users": false, "admin.settings": false, "admin.billing": false,
    },
  },
};

interface TeamManagerProps {
  members?: Member[];
  roles?: RolePermissions;
  onUpdateMemberRole?: (memberId: string, role: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onInvite?: (email: string, role: string) => void;
}

export function TeamManager({
  members = [],
  roles = DEFAULT_ROLES,
  onUpdateMemberRole,
  onRemoveMember,
  onInvite,
}: TeamManagerProps) {
  const [activeTab, setActiveTab] = useState<"members" | "permissions">("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBRE");

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = inviteEmail.trim();
    if (trimmedEmail) {
      onInvite?.(trimmedEmail, inviteRole);
      setInviteEmail("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          👥 Membres ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "permissions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          🔒 Permissions
        </button>
      </div>

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Invite form */}
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email du collaborateur..."
              className="flex-1 px-3 py-2 text-sm rounded-md border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(roles).map(([key, role]) => (
                <option key={key} value={key}>
                  {role.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Inviter
            </button>
          </form>

          {/* Members list */}
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucun membre</p>
              <p className="text-xs mt-1">Invitez des collaborateurs pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const role = roles[member.role];
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white"
                        style={{ backgroundColor: role?.color || "#6b7280" }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => onUpdateMemberRole?.(member.id, e.target.value)}
                        className="px-2 py-1 text-xs rounded border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Object.entries(roles).map(([key, r]) => (
                          <option key={key} value={key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => onRemoveMember?.(member.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive/50 hover:text-destructive text-xs transition-colors"
                        title="Retirer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Permissions matrix tab */}
      {activeTab === "permissions" && (
        <div className="space-y-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left p-2 font-medium sticky left-0 bg-muted/30 min-w-[150px]">
                  Permission
                </th>
                {Object.entries(roles).map(([key, role]) => (
                  <th key={key} className="p-2 font-medium text-center min-w-[80px]">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: role.color }}
                    />
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                <Fragment key={category}>
                  <tr className="bg-muted/10">
                    <td
                      colSpan={Object.keys(roles).length + 1}
                      className="p-2 font-semibold text-muted-foreground"
                    >
                      {category}
                    </td>
                  </tr>
                  {perms.map((perm) => (
                    <tr key={perm} className="border-t">
                      <td className="p-2 sticky left-0 bg-card">
                        {PERMISSION_LABELS[perm]}
                      </td>
                      {Object.entries(roles).map(([roleKey, role]) => (
                        <td key={roleKey} className="p-2 text-center">
                          {role.permissions[perm] ? (
                            <span className="text-green-500">✓</span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
