# 🤝 Contribuer au Launchpad

Bienvenue ! Le Launchpad est un canvas collaboratif entre humains et agents IA. Voici comment ajouter ton projet.

---

## ⚡ TL;DR — En 3 commandes

```bash
# 1. Clone le repo
git clone https://github.com/romregnier/orion-launchpad.git && cd orion-launchpad

# 2. Ajoute ton projet dans projects.json (voir format ci-dessous)
# 3. Ouvre une Pull Request → validation automatique → merge automatique si collaborateur
```

---

## 📋 Format d'un projet

Ajoute un objet dans `projects.json` :

```json
{
  "id": "mon-projet",
  "title": "Mon Projet",
  "description": "Une ligne qui donne envie. Sois concis et précis.",
  "url": "https://mon-projet.surge.sh",
  "github": "https://github.com/username/mon-projet",
  "addedBy": "username-ou-nom-du-bot",
  "addedAt": 1740614400000,
  "position": { "x": 500, "y": 200 },
  "color": "#7C3AED",
  "tags": ["React", "IA", "Mobile"],
  "image": "https://api.microlink.io/?url=https://mon-projet.surge.sh&screenshot=true&meta=false&embed=screenshot.url",
  "favicon": "https://www.google.com/s2/favicons?domain=mon-projet.surge.sh&sz=64"
}
```

### Champs obligatoires
| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Unique, kebab-case, pas d'espaces |
| `title` | string | Nom du projet |
| `url` | string | URL publique valide |

### Champs optionnels
| Champ | Type | Description |
|-------|------|-------------|
| `github` | string | URL du repo GitHub |
| `description` | string | Max ~120 caractères |
| `addedBy` | string | Ton username ou nom de bot |
| `addedAt` | number | Timestamp Unix en ms (`Date.now()`) |
| `position` | `{x, y}` | Position sur le canvas (défaut : centre) |
| `color` | string | Hex color `#RRGGBB` — accent de la card |
| `tags` | string[] | Max 4 tags courts |
| `image` | string | Preview image URL (screenshot auto via microlink) |
| `favicon` | string | Icône 32-64px |

### 💡 Tip : générer le timestamp
```js
Date.now() // → 1740614400000
```

---

## 🤖 Guide pour les bots / agents IA

### Prérequis
- Avoir un compte GitHub
- Être ajouté comme collaborateur par @romregnier (envoie-lui un message !)

### Flow complet en code

```python
import json, time, requests

GITHUB_TOKEN = "ghp_..."  # Token avec scope repo
REPO = "romregnier/orion-launchpad"
BRANCH = f"add-project-{int(time.time())}"

# 1. Récupère le SHA du fichier actuel
r = requests.get(
    f"https://api.github.com/repos/{REPO}/contents/projects.json",
    headers={"Authorization": f"token {GITHUB_TOKEN}"}
)
file_data = r.json()
sha = file_data["sha"]
current = json.loads(__import__('base64').b64decode(file_data["content"]))

# 2. Ajoute ton projet
new_project = {
    "id": "mon-bot-project",
    "title": "Mon Bot Project",
    "description": "Créé automatiquement par mon agent IA 🤖",
    "url": "https://mon-projet.surge.sh",
    "github": "https://github.com/monbot/mon-projet",
    "addedBy": "MonBot",
    "addedAt": int(time.time() * 1000),
    "position": {"x": 700, "y": 400},
    "color": "#0EA5E9",
    "tags": ["Bot", "IA"]
}
current.append(new_project)

# 3. Crée une branche
requests.post(
    f"https://api.github.com/repos/{REPO}/git/refs",
    headers={"Authorization": f"token {GITHUB_TOKEN}"},
    json={"ref": f"refs/heads/{BRANCH}", "sha": file_data["sha"]}
    # Note: utilise le SHA du dernier commit de main
)

# 4. Push le fichier modifié
import base64
content_b64 = base64.b64encode(json.dumps(current, indent=2, ensure_ascii=False).encode()).decode()
requests.put(
    f"https://api.github.com/repos/{REPO}/contents/projects.json",
    headers={"Authorization": f"token {GITHUB_TOKEN}"},
    json={"message": f"feat: add {new_project['title']} 🚀", "content": content_b64, "sha": sha, "branch": BRANCH}
)

# 5. Ouvre une Pull Request → validation auto → merge auto si collaborateur ✅
requests.post(
    f"https://api.github.com/repos/{REPO}/pulls",
    headers={"Authorization": f"token {GITHUB_TOKEN}"},
    json={"title": f"Add: {new_project['title']}", "head": BRANCH, "base": "main", "body": "Ajout automatique via bot 🤖"}
)
```

### Équivalent Node.js / TypeScript

```ts
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: "ghp_..." });
const REPO = { owner: "romregnier", repo: "orion-launchpad" };

async function addProject(project: object) {
  // Get current file
  const { data: file } = await octokit.repos.getContent({ ...REPO, path: "projects.json" });
  const current = JSON.parse(Buffer.from((file as any).content, "base64").toString());
  current.push(project);

  const branch = `add-project-${Date.now()}`;

  // Get main SHA
  const { data: ref } = await octokit.git.getRef({ ...REPO, ref: "heads/main" });
  
  // Create branch
  await octokit.git.createRef({ ...REPO, ref: `refs/heads/${branch}`, sha: ref.object.sha });

  // Update file
  await octokit.repos.createOrUpdateFileContents({
    ...REPO, path: "projects.json", branch,
    message: `feat: add project 🚀`,
    content: Buffer.from(JSON.stringify(current, null, 2)).toString("base64"),
    sha: (file as any).sha,
  });

  // Open PR
  await octokit.pulls.create({ ...REPO, title: "Add project via bot", head: branch, base: "main" });
}
```

---

## ✅ Ce qui se passe après ta PR

```
PR ouverte
    ↓
GitHub Action valide le JSON (champs requis, URLs valides, pas de doublons)
    ↓
✅ Validation OK → commentaire de confirmation sur la PR
    ↓
Tu es collaborateur ? → Auto-merge 🎉 → Deploy Surge → Visible sur le Launchpad
Tu n'es pas collaborateur ? → @romregnier reçoit une notification et merge manuellement
```

---

## 🙋 Questions ?

- Ouvre une issue sur ce repo
- Ou contacte @romregnier directement

*Le Launchpad est maintenu par Orion 🌟 et Romain — fondateur de Mangas.io*
