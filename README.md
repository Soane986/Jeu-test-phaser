# La Dernière Lanterne

Jeu de plate-forme réalisé avec Phaser 3 (BUT MMI – R312).

## Lancer le jeu

Le jeu est découpé en modules JavaScript : il doit être servi par un serveur local (un double-clic sur `index.html` ne suffit pas).

- **VS Code** : extension *Live Server*, puis clic droit sur `index.html` → *Open with Live Server*.
- ou, dans un terminal à la racine du projet : `python -m http.server 5500`, puis ouvrir <http://localhost:5500>.

Une connexion internet est nécessaire au premier lancement (Phaser est chargé depuis un CDN).

## Commandes (mode histoire)

| Action | Touche |
| --- | --- |
| Se déplacer | Q / D |
| Monter / descendre l'échelle | Z / S |
| Sauter | Espace |
| Tirer | H |
| Ouvrir une porte | E |
| Retour au menu | Échap |

## Commandes (mode duo, PvP)

Chaque joueur tire sur l'autre pour vider sa barre de vie. Le premier à 2 manches gagne.

| Action | Joueur 1 | Joueur 2 |
| --- | --- | --- |
| Se déplacer | Q / D | ← / → |
| Sauter | Espace | 2 |
| Tirer | H | 1 |

Pour le joueur 2, les touches 1 et 2 du pavé numérique ou du haut du clavier fonctionnent toutes les deux.

## Organisation du code

```
index.html              page d'accueil (menu, prologue, commandes, crédits) + écran de jeu
style.css
src/index.js            navigation du menu, configuration et lancement de Phaser
src/js/chargement.js    scène de chargement : assets et animations
src/js/niveau.js        classe de base des niveaux (joueur, tir, ennemis, portes, items, timers)
src/js/niveau1.js       niveau 1 : la grotte (map_1)
src/js/niveau2.js       niveau 2 : la salle secrète (map_2)
src/js/pvp.js           mode duo : arène, deux joueurs, barres de vie, manches (map_pvp)
src/js/hud.js           affichage : vies, score, temps, messages
src/js/fin.js           écran de victoire / game over
src/assets/             images, sons et cartes Tiled
```

## Modifier les cartes

Les cartes du jeu sont les fichiers `src/assets/map_1.json`, `map_2.json` et `map_pvp.json`. Ce sont des cartes Tiled au format JSON : elles s'ouvrent directement dans Tiled (*Fichier → Ouvrir*), et un simple *Enregistrer* suffit pour que le jeu prenne la modification.

Le jeu de tuiles (`crystal_cave_tiles.png`, dans le même dossier) est intégré à chaque carte.

Noms des objets reconnus dans le calque d'objets : `Spawn`, `Item`, `ennemi 1` (rat), `ennemi 2` (gobelin), `door` ; pour l'arène : `Spawn 1`, `Spawn 2`, `Item`.
