# Forge multi-poste — notice de l'animateur

Chaque équipe joue sur son propre poste (ordinateur, tablette ou téléphone) avec un simple navigateur. Le serveur tourne sur le poste de l'animateur ou sur un hébergement en ligne. Aucun compte n'est nécessaire : chaque équipe se connecte avec un code.

## 1. Installation (une fois)

1. Installez **Node.js 18 ou plus récent**, version LTS, depuis https://nodejs.org.
2. Décompressez ce dossier où vous voulez, par exemple dans `Documents\forge-multiposte`.

Il n'y a rien d'autre à installer : le serveur n'utilise aucune bibliothèque externe, et la page de jeu embarque tout ce qu'il lui faut. Elle fonctionne donc sans accès à internet.

## 2. Lancer le serveur

- **Windows** : double-cliquez sur `lancer-windows.bat`. À la première exécution, Windows demande d'autoriser Node.js sur le réseau : acceptez pour les **réseaux privés**.
- **macOS** : double-cliquez sur `lancer-mac.command`. Si macOS bloque le fichier, faites clic droit puis Ouvrir.
- **En ligne de commande** : `node server.mjs`.

La console affiche trois informations :

```
Sur ce poste       : http://localhost:8080
Pour les équipes   : http://192.168.1.23:8080
Code animateur     : K7PXQ2
```

Ouvrez l'adresse « Sur ce poste » dans votre navigateur et connectez-vous avec le **code animateur**. Ce code est conservé dans `data/code-animateur.txt` et reste le même d'une séance à l'autre.

Pour arrêter le serveur, faites Ctrl+C ou fermez la fenêtre. La partie est enregistrée en continu dans `data/partie.json` et reprend telle quelle au prochain lancement.

## 3. Avant la première séance : tester le réseau

Les postes des équipes doivent pouvoir joindre le vôtre. Faites le test une fois : depuis un téléphone connecté au même Wi-Fi, ouvrez l'adresse « Pour les équipes ».

- **La page s'affiche** : tout est prêt.
- **Rien ne s'affiche** : le Wi-Fi isole probablement les appareils entre eux, ce qui est fréquent dans les écoles et les entreprises. Trois solutions :
  1. Demandez au service informatique un réseau sans isolation ou une exception.
  2. Créez un point d'accès Wi-Fi depuis votre portable (partage de connexion) et faites-y connecter les équipes. Leur adresse est alors celle affichée par la console après la création du point d'accès ; relancez le serveur si besoin pour la voir.
  3. Hébergez le serveur en ligne (voir section 6).

Le pare-feu peut aussi bloquer le port : vérifiez que Node.js est autorisé sur le réseau actif.

## 4. Déroulement d'une séance

1. **Créez la partie** dans l'interface animateur : noms des équipes, durée, environnement, options.
2. **Distribuez les codes.** La rubrique « Accès des équipes » liste un code par équipe. Les codes sont masqués par défaut : affichez-les un par un et remettez-les individuellement, par exemple sur un papier. **Ne les projetez pas** : une équipe qui connaît le code d'une autre peut voir ses données. En cas de doute, « Nouveau code » invalide l'ancien.
3. **Les équipes se connectent** à l'adresse « Pour les équipes » avec leur code. Votre tableau de bord indique qui est en ligne.
4. **Lancez le minuteur** (15 minutes par défaut). Le compte à rebours s'affiche sur chaque poste.
5. **Les équipes saisissent leurs décisions.** Le brouillon est enregistré sur le serveur à chaque modification, si bien qu'un rafraîchissement ou un changement de poste ne fait rien perdre. Elles cliquent ensuite sur « Valider mes décisions », et votre tableau de bord passe leur voyant au vert.
6. **Résolvez le trimestre.** Une équipe qui n'a pas validé joue son brouillon, ou à défaut ses décisions précédentes. Chaque poste reçoit son rapport dans les secondes qui suivent.
7. Le **débriefing** final est accessible à l'animateur et à chaque équipe, avec toutes les données de la partie.

En cas d'erreur de manipulation, « Annuler la dernière résolution » revient au trimestre précédent, décisions des équipes comprises.

Conseil pratique : une seule personne par équipe saisit les décisions. Les autres membres peuvent se connecter avec le même code pour consulter les rapports, mais si deux personnes modifient le même formulaire, c'est la dernière saisie qui l'emporte.

## 5. Sauvegardes et séances multiples

- **Automatique** : le serveur écrit `data/partie.json` après chaque action. Entre deux séances, arrêtez et relancez simplement le serveur.
- **Archive** : « Outils de l'animateur », puis « Télécharger la partie (.json) ». Ce fichier permet de reprendre la partie sur un autre serveur avec « Charger un fichier .json » ; de nouveaux codes d'équipe sont alors générés.
- Le même fichier est compatible avec la version sur un seul poste (artefact claude.ai), dans les deux sens.

## 6. Hébergement en ligne (facultatif)

Le serveur fonctionne sur tout hébergeur qui exécute Node.js, comme Render, Railway, Fly.io ou un VPS :

- commande de démarrage : `node server.mjs` ;
- le port est lu dans la variable `PORT`, que fournissent la plupart des hébergeurs ;
- définissez `FORGE_ADMIN` pour choisir votre code animateur (6 caractères ou plus).

Attention : sur les offres gratuites, le disque est souvent effacé à chaque redémarrage du service. Attachez un disque persistant et pointez `FORGE_DATA` vers lui, ou téléchargez la partie (.json) en fin de séance. Les hébergeurs fournissent en général une adresse en HTTPS, ce qui chiffre les échanges ; sur un réseau local, ils circulent en HTTP simple, ce qui est acceptable pour un usage pédagogique.

## Variables d'environnement

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute | `8080` |
| `FORGE_ADMIN` | Code animateur imposé | code aléatoire, conservé dans `data/` |
| `FORGE_DATA` | Dossier des données | `./data` |

## Contenu du dossier

- `server.mjs` : serveur HTTP, sans dépendance.
- `engine.js` : moteur de simulation, identique à celui de la version sur un seul poste.
- `public/index.html` : interface de jeu, autonome.
- `data/` : créé au premier lancement (partie en cours et code animateur).
