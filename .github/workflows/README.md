# Pipelines GitHub Actions — CHADIA Projects

Deux workflows automatisés :

- **`ci.yml`** — vérifications sur chaque push & PR (type-check, lint, syntax,
  build Docker smoke). Bloque le merge si quelque chose échoue.
- **`deploy.yml`** — déploiement automatique sur le serveur Hetzner après que
  la CI a passé sur `main`. Aussi déclenchable manuellement.

## Configuration initiale (à faire UNE FOIS)

### 1. Sur le serveur Hetzner

#### Configurer sudoers NOPASSWD pour docker

Le script de déploiement utilise `sudo docker compose`. Pour que ce soit
non-interactif, autoriser sans password (à faire en root) :

```bash
sudo visudo -f /etc/sudoers.d/chadia-deploy
```

Contenu :
```
hermes ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/bin/docker compose
```

#### Générer une clé SSH dédiée au déploiement

```bash
ssh-keygen -t ed25519 -f ~/.ssh/chadia_deploy -N "" -C "github-actions-deploy"
cat ~/.ssh/chadia_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Récupère le contenu de la clé privée :
```bash
cat ~/.ssh/chadia_deploy
```

### 2. Sur GitHub — secrets repository

Va dans **Settings → Secrets and variables → Actions → New repository secret**
et crée :

| Nom | Valeur | Description |
|---|---|---|
| `HETZNER_HOST` | `188.245.42.63` (ou `ong-chadia.com`) | IP ou domaine du serveur |
| `HETZNER_USER` | `hermes` | utilisateur SSH |
| `HETZNER_SSH_KEY` | (contenu de `~/.ssh/chadia_deploy`) | clé privée SSH multi-ligne complète |
| `HETZNER_SSH_PORT` | `22` (optionnel) | port SSH custom si besoin |

### 3. Sur GitHub — environnement `production`

**Settings → Environments → New environment → `production`** :

- Active **Required reviewers** si tu veux qu'un humain approuve chaque
  déploiement (recommandé en début).
- Active **Wait timer** (ex 1 min) pour avoir le temps d'annuler.

## Utilisation au quotidien

### Push normal sur `main`

1. Tu pushes un commit.
2. **CI** se lance → type-check, lint, syntax, build des 4 images Docker.
3. Si tout passe, **Deploy** se déclenche automatiquement.
4. Deploy attend la CI (≈ 3-5 min), puis SSH vers Hetzner et lance
   `scripts/deploy.sh`.
5. Le script :
   - `git pull origin main`
   - détecte quels services ont changé via `git diff`
   - rebuild uniquement ces images (gain temps)
   - `docker compose up -d` les services concernés
   - applique les migrations Prisma si tender a bougé
   - cleanup images orphelines

### Déploiement manuel d'un seul service

Sur GitHub : **Actions → Deploy → Run workflow** → choisir le service dans
le dropdown. Utile pour redéployer après un fix mineur sans toucher au reste.

### Déploiement à la main sans pipeline (fallback)

Si GitHub Actions est down ou que tu veux contrôler étape par étape :

```bash
ssh hermes@188.245.42.63
cd /home/hermes/chadia-projects
bash scripts/deploy.sh                  # tout
SERVICE=gateway bash scripts/deploy.sh  # juste un service
```

## Dépannage

| Symptôme | Cause probable | Fix |
|---|---|---|
| `Permission denied (publickey)` dans deploy | Clé SSH mal copiée dans `HETZNER_SSH_KEY` | Vérifier qu'on inclut les lignes `BEGIN/END` et tous les sauts de ligne |
| `sudo: a password is required` | Sudoers NOPASSWD pas configuré | Voir étape 1 ci-dessus |
| `prisma db push` échoue après deploy | DB pas encore prête | Le script retry 10× ; si ça persiste : `docker compose logs postgres` |
| Le smoke test final échoue (HTTP 000) | DNS pas propagé OU Caddy down | `docker compose ps caddy` côté serveur |
| Build Docker très lent en CI | Pas de cache | Le workflow utilise `type=gha` cache — il se réchauffe après 2-3 builds |

## Sécurité

- La clé SSH dédiée `chadia_deploy` n'a accès QUE au serveur de prod, jamais
  utilisée localement.
- Si compromise : `ssh-keygen -R 188.245.42.63 && rm ~/.ssh/chadia_deploy*`
  côté local, retirer la clé de `authorized_keys` côté serveur, régénérer.
- `concurrency: deploy-production` empêche 2 déploiements concurrents
  (`cancel-in-progress: false` ne tue pas un déploiement en cours).
- Le secret `HETZNER_SSH_KEY` est masqué dans les logs GitHub.
