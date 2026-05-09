export default function ResultatsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Résultats des marchés publics</div>
          <div className="page-subtitle">En cours de migration vers le service tender</div>
        </div>
      </div>
      <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
        Cette page (publique) sera recâblée vers <code>TenderAPI</code> (HTTP).
      </div>
    </>
  );
}
