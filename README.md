# Forge

Serious game de gestion industrielle pour l'enseignement. Chaque équipe dirige une usine de biens d'équipement, trimestre après trimestre, face aux autres équipes et à trois concurrents régionaux. Elle décide des prix, de la capacité, des effectifs, des achats, de la qualité, de la R&D, du financement et de la croissance externe. Un débriefing automatique compare les trajectoires en fin de partie.

Deux versions partagent le même moteur de simulation et le même format de sauvegarde :

| Version | Usage | Installation |
|---|---|---|
| **Un poste** | 2 à 6 équipes sur un même ordinateur, à tour de rôle derrière un écran de confidentialité | aucune : un fichier HTML |
| **Multi-poste** | une équipe par poste, un animateur qui pilote la séance | Node.js sur le poste de l'animateur ou chez un hébergeur |

## Utilisation

**Animateurs** : téléchargez les fichiers prêts à l'emploi dans l'onglet **Releases** du dépôt.

- `forge-un-poste-vX.html` : ouvrez-le dans un navigateur récent.
- `forge-multiposte-vX.zip` : décompressez-le puis suivez `LISEZMOI.md` (installation de Node.js, lancement, distribution des codes d'équipe, test du réseau, hébergement).

Si GitHub Pages est activé (voir plus bas), la version un poste est aussi jouable en ligne à l'adresse du site du dépôt.

## Développement

Prérequis : Node.js 18 ou plus récent (22 recommandé).

```bash
npm ci               # dépendances de développement (esbuild, React, jsdom)
npm run build        # assemble les pages dans dist/ et server/public/
npm start            # assemble puis lance le serveur multi-poste sur http://localhost:8080
npm run test:all     # assemblage + toutes les suites de tests
npm run package      # prépare release/ : dossier multi-poste et fichier un poste
npm run tournoi      # tournoi de stratégies automatiques (calibration)
```

Au premier lancement, le serveur affiche le code animateur et le conserve dans `server/data/`.

### Structure

```
src/
  engine.js          moteur de simulation pur (aucune dépendance au DOM), déterministe à graine fixée
  components.jsx     composants d'interface partagés : console d'équipe, rapports, débriefing, règles
  app.jsx            version un poste
  net.jsx            client multi-poste
  template.html      styles et squelette communs
  *-entry.js, globals.js, *.css   points d'entrée et styles des pages autonomes
server/
  server.mjs         serveur multi-poste : API JSON, vues expurgées par équipe, persistance disque
scripts/
  build.mjs          assemblage des pages (esbuild)
  package.mjs        préparation des fichiers distribuables
distrib/             notice et lanceurs livrés avec la version multi-poste
test/
  engine.test.js     équilibre du bilan à chaque trimestre (540 parties), déterminisme, sauvegarde, M&A, événements
  ui.test.mjs        partie un poste complète pilotée par l'interface
  standalone.test.mjs  page autonome : chargement, partie, sauvegarde par fichier
  net.test.mjs       partie multi-poste contre le vrai serveur : trois navigateurs, redémarrage, export et import
  bots.js, play.js   stratégies automatiques utilisées par les tests et la calibration
tools/
  sim.mjs            tournois de stratégies et trajectoire de référence
  trace.mjs, pnl.mjs  trajectoires et comptes de résultat moyens par stratégie
```

### Fichiers générés

`dist/`, `server/public/` et `release/` sont produits par les scripts et ne sont pas suivis par Git. La version publiée sur claude.ai correspond à `dist/forge.html`.

## Intégration continue et publication

- **Tests** (`.github/workflows/tests.yml`) : à chaque envoi sur `main` et à chaque pull request, sous Node 18 et 22.
- **Versions** (`.github/workflows/release.yml`) : un tag `vX.Y.Z` lance les tests, puis crée une version GitHub avec l'archive multi-poste et le fichier un poste attachés.

  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

- **GitHub Pages** (`.github/workflows/pages.yml`, facultatif) : publie la version un poste. Activation en deux temps :
  1. Settings → Pages → Build and deployment → Source : **GitHub Actions** ;
  2. Settings → Secrets and variables → Actions → onglet Variables → New repository variable : `PAGES_ENABLED` = `true`.

  GitHub Pages n'est disponible sur un dépôt privé qu'avec un abonnement payant.

## Modèle

Les règles et les formules sont décrites dans le jeu (bouton **Règles**) : attractivité des offres, cascade du TRS, goulots d'étranglement, qualité, climat social, financement et valorisation. Les paramètres sont regroupés dans l'objet `CFG` en tête de `src/engine.js`. Après toute modification, relancez `npm run tournoi` pour vérifier qu'aucune stratégie ne devient dominante.

## Licence

Aucune licence n'est accordée pour le moment : tous droits réservés.
