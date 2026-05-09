"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";

/* ─── Types ─── */
interface Projet {
  id: string;
  titre: string;
  budget: number | null;
  devise: string;
  bailleur: { nom: string; sigle: string };
}

interface LigneBudget {
  libelle: string;
  qte: number;
  pu: number;
}

interface CategorieBudget {
  nom: string;
  lignes: LigneBudget[];
}

/* ─── Placeholder data ─── */
const PLACEHOLDER_BUDGET: CategorieBudget[] = [
  {
    nom: "Ressources humaines",
    lignes: [
      { libelle: "Chef de projet (12 mois)", qte: 12, pu: 850_000 },
      { libelle: "Coordinateur terrain", qte: 12, pu: 550_000 },
      { libelle: "Agent communautaire", qte: 6, pu: 250_000 },
      { libelle: "Comptable projet", qte: 12, pu: 450_000 },
    ],
  },
  {
    nom: "Équipements",
    lignes: [
      { libelle: "Ordinateurs portables", qte: 3, pu: 450_000 },
      { libelle: "Imprimante multifonction", qte: 1, pu: 380_000 },
      { libelle: "Motos (déplacement terrain)", qte: 2, pu: 1_200_000 },
    ],
  },
  {
    nom: "Activités terrain",
    lignes: [
      { libelle: "Ateliers de formation", qte: 8, pu: 375_000 },
      { libelle: "Sensibilisation communautaire", qte: 12, pu: 150_000 },
      { libelle: "Enquêtes de base et finale", qte: 2, pu: 600_000 },
      { libelle: "Suivi-évaluation terrain", qte: 4, pu: 200_000 },
    ],
  },
  {
    nom: "Fonctionnement",
    lignes: [
      { libelle: "Loyer bureau projet", qte: 12, pu: 200_000 },
      { libelle: "Fournitures de bureau", qte: 12, pu: 45_000 },
      { libelle: "Carburant et entretien", qte: 12, pu: 120_000 },
      { libelle: "Communication (internet, téléphone)", qte: 12, pu: 65_000 },
    ],
  },
];

const FRAIS_GESTION_PCT = 0.07;

/* ─── Helpers ─── */
const fmt = new Intl.NumberFormat("fr-FR");
function money(n: number): string {
  return fmt.format(n);
}

function totalCategorie(cat: CategorieBudget): number {
  return cat.lignes.reduce((s, l) => s + l.qte * l.pu, 0);
}

/* ─── Page ─── */
export default function BudgetPage() {
  const params = useParams();
  const id = params.id as string;
  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [devise, setDevise] = useState("XAF");

  const load = useCallback(async () => {
    const res = await fetch(`/api/projets/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProjet(data.projet);
      if (data.projet?.devise) setDevise(data.projet.devise);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32 }}>Chargement...</p>;
  if (!projet) return <p style={{ color: "var(--danger)", padding: 32 }}>Projet introuvable.</p>;

  /* ─── Calculs ─── */
  const categories = PLACEHOLDER_BUDGET;
  const subtotal = categories.reduce((s, c) => s + totalCategorie(c), 0);
  const fraisGestion = Math.round(subtotal * FRAIS_GESTION_PCT);
  const grandTotal = subtotal + fraisGestion;
  const plafond = projet.budget ?? 0;
  const marge = plafond - grandTotal;
  const margePositive = marge >= 0;

  return (
    <div style={{ maxWidth: "100%", padding: "20px 32px 48px" }}>

      {/* ─── Breadcrumbs ─── */}
      <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--text-3)", marginBottom: 8 }}>
        <Link href="/projets" style={{ cursor: "pointer", color: "var(--text-3)" }}>Projets</Link>
        <span>/</span>
        <Link href={`/projets/${id}`} style={{ cursor: "pointer", color: "var(--text-3)" }}>{projet.titre}</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>Budget</span>
      </div>

      {/* ─── Page header ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text)", marginBottom: 4 }}>
            Budget prévisionnel
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            {projet.titre} · {projet.bailleur.nom} ({projet.bailleur.sigle}) · Plafond {money(plafond)} {devise}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select
            value={devise}
            onChange={(e) => setDevise(e.target.value)}
            className="btn btn-secondary"
            style={{ fontSize: 13, cursor: "pointer", appearance: "auto" }}
          >
            <option value="XAF">XAF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
          <button className="btn btn-secondary">
            <Icons.Sparkles size={14} /> Suggérer ventilation
          </button>
          <button className="btn btn-secondary">
            <Icons.Download size={14} /> Excel
          </button>
        </div>
      </div>

      {/* ─── KPI strip ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {/* Total demandé */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            Total demandé
          </div>
          <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            {money(grandTotal)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{devise}</div>
        </div>

        {/* Plafond bailleur */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            Plafond bailleur
          </div>
          <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            {money(plafond)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{devise}</div>
        </div>

        {/* Marge restante */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            Marge restante
          </div>
          <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: margePositive ? "var(--success)" : "var(--danger)" }}>
            {margePositive ? "+" : ""}{money(marge)}
          </div>
          <div style={{ fontSize: 12, color: margePositive ? "var(--success)" : "var(--danger)", marginTop: 2 }}>
            {margePositive ? "Sous le plafond" : "Dépassement !"}
          </div>
        </div>

        {/* Frais de gestion */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            Frais de gestion (7%)
          </div>
          <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            {money(fraisGestion)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{devise}</div>
        </div>
      </div>

      {/* ─── Budget table ─── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="t" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Libellé</th>
              <th style={{ textAlign: "right" }}>Qté</th>
              <th style={{ textAlign: "right" }}>P.U. ({devise})</th>
              <th style={{ textAlign: "right" }}>Total ({devise})</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const catTotal = totalCategorie(cat);
              return (
                <CategoryBlock
                  key={cat.nom}
                  categorie={cat}
                  catTotal={catTotal}
                  devise={devise}
                />
              );
            })}

            {/* Subtotal */}
            <tr style={{ borderTop: "2px solid var(--border-strong)" }}>
              <td colSpan={3} style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                Sous-total
              </td>
              <td className="tnum" style={{ textAlign: "right", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                {money(subtotal)}
              </td>
              <td></td>
            </tr>

            {/* Frais de gestion */}
            <tr>
              <td colSpan={3} style={{ fontSize: 13, color: "var(--text-2)" }}>
                Frais de gestion (7%)
              </td>
              <td className="tnum" style={{ textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
                {money(fraisGestion)}
              </td>
              <td></td>
            </tr>

            {/* Grand total */}
            <tr style={{ background: "var(--primary-soft)" }}>
              <td colSpan={3} style={{ fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                TOTAL GÉNÉRAL
              </td>
              <td className="tnum" style={{ textAlign: "right", fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                {money(grandTotal)} {devise}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Category block (header + item rows) ─── */
function CategoryBlock({
  categorie,
  catTotal,
  devise,
}: {
  categorie: CategorieBudget;
  catTotal: number;
  devise: string;
}) {
  return (
    <>
      {/* Category header row */}
      <tr style={{ background: "var(--surface-2)" }}>
        <td
          colSpan={3}
          style={{
            fontWeight: 700,
            fontSize: 11.5,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--text-2)",
          }}
        >
          {categorie.nom}
        </td>
        <td
          className="tnum"
          style={{
            textAlign: "right",
            fontWeight: 700,
            fontSize: 12,
            color: "var(--text-2)",
          }}
        >
          {money(catTotal)} {devise}
        </td>
        <td></td>
      </tr>

      {/* Item rows */}
      {categorie.lignes.map((ligne, i) => {
        const total = ligne.qte * ligne.pu;
        return (
          <tr key={i}>
            <td style={{ paddingLeft: 32, fontSize: 13, color: "var(--text)" }}>
              {ligne.libelle}
            </td>
            <td className="tnum" style={{ textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
              {ligne.qte}
            </td>
            <td className="tnum" style={{ textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
              {money(ligne.pu)}
            </td>
            <td className="tnum" style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
              {money(total)}
            </td>
            <td style={{ textAlign: "center" }}>
              <Icons.More size={14} style={{ color: "var(--text-3)", cursor: "pointer" }} />
            </td>
          </tr>
        );
      })}
    </>
  );
}
