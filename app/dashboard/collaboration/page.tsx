"use client";

import { useState } from "react";
import { BudgetGrid, BudgetCategory } from "@/components/budget/BudgetGrid";
import { TeamManager, Member, RolePermissions } from "@/components/team/TeamManager";
import { CommentSection, Comment } from "@/components/comments/CommentSection";

type Tab = "budget" | "team" | "comments";

const sampleMembers: Member[] = [
  { id: "1", name: "Adoum Salah", email: "adoum@chadia.org", role: "ADMIN", joinedAt: new Date(2026, 0, 15) },
  { id: "2", name: "Tidjani Salah", email: "tidjani@chadia.org", role: "DIRECTEUR", joinedAt: new Date(2026, 1, 1) },
  { id: "3", name: "Aminatou Moussa", email: "aminatou@chadia.org", role: "REDACTEUR", joinedAt: new Date(2026, 2, 10) },
  { id: "4", name: "Mahamat Idriss", email: "mahamat@chadia.org", role: "RELECTEUR", joinedAt: new Date(2026, 3, 5) },
  { id: "5", name: "Fatime Abakar", email: "fatime@chadia.org", role: "FINANCIER", joinedAt: new Date(2026, 3, 20) },
];

const sampleComments: Comment[] = [
  {
    id: "1",
    contenu: "La section méthodologie doit être renforcée. Il faut ajouter plus de détails sur l'approche terrain.",
    userId: "2",
    userName: "Tidjani Salah",
    createdAt: new Date(2026, 4, 5, 14, 30),
    replies: [
      {
        id: "1-1",
        contenu: "D'accord, je vais réviser cette section.",
        userId: "3",
        userName: "Aminatou Moussa",
        createdAt: new Date(2026, 4, 5, 15, 10),
      },
    ],
  },
  {
    id: "2",
    contenu: "Le budget prévisionnel semble correct. J'ai vérifié les prix du marché.",
    userId: "5",
    userName: "Fatime Abakar",
    createdAt: new Date(2026, 4, 6, 9, 15),
  },
  {
    id: "3",
    contenu: "N'oubliez pas d'inclure les coûts de formation dans le budget équipements.",
    userId: "4",
    userName: "Mahamat Idriss",
    createdAt: new Date(2026, 4, 6, 11, 45),
  },
];

const sampleBudget: BudgetCategory[] = [
  {
    id: "rh",
    nom: "Ressources Humaines",
    couleur: "#3b82f6",
    lignes: [
      { id: "rh-1", categorie: "RH", description: "Chef de projet (6 mois)", quantite: 6, prixUnitaire: 800000, unite: "mois", tva: 0 },
      { id: "rh-2", categorie: "RH", description: "Consultant technique (4 mois)", quantite: 4, prixUnitaire: 600000, unite: "mois", tva: 0 },
      { id: "rh-3", categorie: "RH", description: "Assistant administratif (6 mois)", quantite: 6, prixUnitaire: 300000, unite: "mois", tva: 0 },
    ],
  },
  {
    id: "equipement",
    nom: "Équipements",
    couleur: "#8b5cf6",
    lignes: [
      { id: "eq-1", categorie: "Équipement", description: "Ordinateurs portables", quantite: 5, prixUnitaire: 750000, unite: "unité", tva: 19.25 },
      { id: "eq-2", categorie: "Équipement", description: "Serveur local", quantite: 1, prixUnitaire: 2500000, unite: "unité", tva: 19.25 },
      { id: "eq-3", categorie: "Équipement", description: "Imprimante multifonction", quantite: 2, prixUnitaire: 350000, unite: "unité", tva: 19.25 },
    ],
  },
  {
    id: "deplacement",
    nom: "Déplacements",
    couleur: "#f59e0b",
    lignes: [
      { id: "dep-1", categorie: "Déplacement", description: "Missions terrain (10 déplacements)", quantite: 10, prixUnitaire: 150000, unite: "voyage", tva: 0 },
      { id: "dep-2", categorie: "Déplacement", description: "Hébergement missions", quantite: 30, prixUnitaire: 50000, unite: "nuit", tva: 0 },
    ],
  },
  {
    id: "fonctionnement",
    nom: "Fonctionnement",
    couleur: "#10b981",
    lignes: [
      { id: "fonc-1", categorie: "Fonctionnement", description: "Fournitures bureau (6 mois)", quantite: 6, prixUnitaire: 100000, unite: "mois", tva: 19.25 },
      { id: "fonc-2", categorie: "Fonctionnement", description: "Communication (6 mois)", quantite: 6, prixUnitaire: 75000, unite: "mois", tva: 19.25 },
      { id: "fonc-3", categorie: "Fonctionnement", description: "Formation équipe", quantite: 3, prixUnitaire: 500000, unite: "session", tva: 0 },
    ],
  },
];

export default function CollaborationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("budget");
  const [budget, setBudget] = useState<BudgetCategory[]>(sampleBudget);
  const [devise, setDevise] = useState<"FCFA" | "EUR" | "USD">("FCFA");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "budget", label: "Budget", icon: "💰" },
    { id: "team", label: "Équipe", icon: "👥" },
    { id: "comments", label: "Commentaires", icon: "💬" },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Collaboration & Budget</h1>
        <p className="text-muted-foreground text-sm">
          Gestion d&apos;équipe, permissions, budget et communication
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "budget" && (
          <BudgetGrid
            categories={budget}
            onChange={setBudget}
            devise={devise}
            onDeviseChange={setDevise}
          />
        )}

        {activeTab === "team" && (
          <TeamManager
            members={sampleMembers}
            onUpdateMemberRole={(id, role) => {
              // TODO: Implement API call to update member role
            }}
            onRemoveMember={(id) => {
              // TODO: Implement API call to remove member
            }}
            onInvite={(email, role) => {
              // TODO: Implement API call to invite member
            }}
          />
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Commentaires récents</h2>
              <span className="text-xs text-muted-foreground">
                {sampleComments.length} commentaire{sampleComments.length > 1 ? "s" : ""}
              </span>
            </div>
            <CommentSection
              projectId="projet-1"
              comments={sampleComments}
              onAddComment={(content) => console.log("New comment:", content)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
