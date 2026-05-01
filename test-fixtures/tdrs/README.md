# TDR de test — CHADIA Projects

Ce dossier contient des TDR réels (appels à propositions) utilisés pour tester l'extraction IA.

## Structure

```
tdrs/
  ├── afd-passt3/
  │   ├── tdr.pdf          # Le PDF original
  │   └── expected.json    # Le résultat attendu (TDRAnalysis validé)
  ├── ue-eutf-sahel/
  │   ├── tdr.pdf
  │   └── expected.json
  ├── undp-pbf/
  │   ├── tdr.pdf
  │   └── expected.json
  └── ...
```

## Comment ajouter un TDR de test

1. Créer un dossier avec un nom descriptif (ex: `afd-education-tchad`)
2. Y placer le PDF du TDR
3. Lancer l'extraction via l'API : `POST /api/projets/analyze-tdr`
4. Valider manuellement le résultat
5. Sauvegarder le JSON validé comme `expected.json`

## Sources de TDR

- [ReliefWeb](https://reliefweb.int/jobs)
- [AFD](https://www.afd.fr/fr/appels-a-projets)
- [EuropeAid / DG INTPA](https://ec.europa.eu/info/funding-tenders/opportunities/portal)
- [UNDP Procurement](https://procurement-notices.undp.org/)
- Archives projets CHADIA
