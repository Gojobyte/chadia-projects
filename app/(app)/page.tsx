import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon apres-midi";
  return "Bonsoir";
}
function daysUntil(date: Date): number { return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)); }
function fmtMoney(n: number, cur = "FCFA"): string { return n >= 1e6 ? `${(n/1e6).toFixed(1)}M ${cur}` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K ${cur}` : `${n} ${cur}`; }

const sPill: Record<string,string> = { BROUILLON:"pill-brouillon", EN_COURS:"pill-redaction", EN_REVISION:"pill-relecture", SOUMIS:"pill-soumis", ACCEPTE:"pill-accepte", REJETE:"pill-rejete" };
const sLabel: Record<string,string> = { BROUILLON:"Brouillon", EN_COURS:"En cours", EN_REVISION:"Revision", SOUMIS:"Soumis", ACCEPTE:"Accepte", REJETE:"Rejete" };

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [projets, deadlines, taches, activites, total] = await Promise.all([
    prisma.projet.findMany({ where:{statut:{in:["EN_COURS","BROUILLON","EN_REVISION"]}}, include:{bailleur:{select:{sigle:true}},documents:{select:{statut:true}}}, orderBy:{dateLimite:"asc"}, take:8 }),
    prisma.projet.findMany({ where:{dateLimite:{lte:new Date(Date.now()+7*864e5)},statut:{notIn:["SOUMIS","ACCEPTE","REJETE","ARCHIVE"]}}, include:{bailleur:{select:{sigle:true}}}, orderBy:{dateLimite:"asc"}, take:5 }),
    prisma.tache.findMany({ where:{assigneAId:session.user.id,statut:{not:"TERMINE"}}, include:{projet:{select:{titre:true}}}, orderBy:{dateLimite:"asc"}, take:5 }),
    prisma.activite.findMany({ include:{user:{select:{name:true}},projet:{select:{titre:true}}}, orderBy:{createdAt:"desc"}, take:6 }),
    prisma.projet.count(),
  ]);
  const budget = projets.reduce((s,p) => s+(p.budget??0), 0);

  return (<>
    <div className="page-header">
      <div>
        <div className="page-title">{getGreeting()} {session.user.name} 👋</div>
        <div className="page-subtitle">{projets.length} projets en cours · {deadlines.length} echeances cette semaine</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Link href="/projets/nouveau" className="btn btn-primary">+ Nouveau projet</Link>
      </div>
    </div>

    {/* KPI */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {[
        {label:"Projets en cours",value:String(projets.length),trend:`sur ${total} total`,color:"var(--primary)"},
        {label:"Budget en jeu",value:fmtMoney(budget),trend:`${projets.length} dossiers`,color:"var(--info)"},
        {label:"Echeances < 7j",value:String(deadlines.length),trend:deadlines.length>0?"Attention !":"RAS",color:"var(--warning)"},
        {label:"Mes taches",value:String(taches.length),trend:"en attente",color:"var(--success)"},
      ].map((k,i) => (
        <div key={i} className="card" style={{padding:"16px 18px"}}>
          <div className="row" style={{gap:6}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:k.color}} />
            <div style={{fontSize:12,color:"var(--text-3)"}}>{k.label}</div>
          </div>
          <div style={{fontSize:28,fontWeight:600,letterSpacing:"-0.02em",marginTop:6}}>{k.value}</div>
          <div style={{fontSize:11.5,color:"var(--text-3)",marginTop:2}}>{k.trend}</div>
        </div>
      ))}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:16}}>
      {/* Projets */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Projets actifs</div>
          <Link href="/projets" className="btn btn-ghost btn-sm">Voir tout →</Link>
        </div>
        <div>
          {projets.length===0 ? (
            <div style={{padding:"32px 18px",textAlign:"center",color:"var(--text-3)",fontSize:13}}>Aucun projet. <Link href="/projets/nouveau" style={{color:"var(--primary)"}}>Creer</Link></div>
          ) : projets.map((p,i) => {
            const tot=p.documents.length, val=p.documents.filter(d=>d.statut==="VALIDE").length, pct=tot>0?Math.round(val/tot*100):0;
            const days=daysUntil(p.dateLimite), urg=days<=7;
            return (
              <Link key={p.id} href={`/projets/${p.id}`} style={{padding:"14px 18px",borderBottom:i===projets.length-1?"none":"1px solid var(--border)",cursor:"pointer",display:"grid",gridTemplateColumns:"32px 1fr auto auto",gap:14,alignItems:"center",textDecoration:"none",color:"inherit"}}>
                <div style={{width:32,height:32,borderRadius:6,background:"var(--primary-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"var(--primary)"}}>{p.bailleur.sigle.slice(0,3)}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>{p.titre}</div>
                  <div className="row" style={{gap:8,fontSize:11.5,color:"var(--text-3)"}}>
                    <span className="mono">{p.reference??p.bailleur.sigle}</span>
                    {p.budget && <><span>·</span><span className="tnum">{fmtMoney(p.budget,p.devise)}</span></>}
                  </div>
                </div>
                <div style={{width:120}}>
                  <div className="row" style={{gap:6,marginBottom:4}}>
                    <span style={{fontSize:11,color:"var(--text-3)"}}>{pct}%</span>
                    <span style={{marginLeft:"auto"}}><span className={`pill ${sPill[p.statut]??"pill-brouillon"}`}><span className="dot"/>{sLabel[p.statut]??p.statut}</span></span>
                  </div>
                  <div className="progress-bar"><span style={{width:`${pct}%`,background:urg?"var(--warning)":undefined}}/></div>
                </div>
                <div style={{minWidth:80,textAlign:"right"}}>
                  <div style={{fontSize:12,fontWeight:500,color:days<=3?"var(--danger)":days<=7?"var(--warning)":"var(--text-3)"}}>{days<=0?"Expire !":days===1?"Demain":`${days}j`}</div>
                  <div style={{fontSize:11,color:"var(--text-4)",marginTop:2}}>{new Date(p.dateLimite).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Droite */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Mes taches</div><span className="tag">{taches.length}</span></div>
          <div>
            {taches.length===0 ? <div style={{padding:"24px 18px",textAlign:"center",color:"var(--text-3)",fontSize:12}}>Aucune tache</div> :
              taches.map((t,i) => (
                <div key={t.id} className="row" style={{padding:"10px 18px",borderBottom:i===taches.length-1?"none":"1px solid var(--border)",gap:10,alignItems:"flex-start"}}>
                  <input type="checkbox" disabled style={{marginTop:3,accentColor:"var(--primary)"}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500,lineHeight:1.4}}>{t.titre}</div>
                    <div className="row" style={{gap:6,marginTop:4}}>
                      <span style={{fontSize:11,color:"var(--text-3)"}}>{t.projet.titre}</span>
                      {t.priorite==="HAUTE" && <span className="tag" style={{color:"var(--danger)",background:"var(--danger-soft)",borderColor:"transparent"}}>Haute</span>}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Activite recente</div></div>
          <div style={{padding:"10px 18px 14px"}}>
            {activites.length===0 ? <div style={{textAlign:"center",color:"var(--text-3)",fontSize:12,padding:16}}>Aucune activite</div> :
              activites.map((a,i) => {
                const colors=["var(--primary)","var(--info)","var(--warning)","var(--success)","var(--danger)"];
                return (
                  <div key={a.id} className="row" style={{gap:8,padding:"6px 0",alignItems:"flex-start"}}>
                    <div className="avatar" style={{background:colors[i%5],width:22,height:22,fontSize:10}}>{a.user.name?.charAt(0)??"?"}</div>
                    <div style={{fontSize:12,lineHeight:1.5,flex:1}}>
                      <span style={{fontWeight:500}}>{a.user.name?.split(" ")[0]}</span>
                      <span style={{color:"var(--text-3)"}}> {a.description}</span>
                      <div style={{fontSize:11,color:"var(--text-4)",marginTop:1}}>{a.projet?.titre} · {new Date(a.createdAt).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  </>);
}
