# ARAM Mayhem — Collecteur de stats (backend)

Script Node.js qui interroge l'API Riot (Match-V5) pour collecter des games
**ARAM Mayhem** (queueId `2400`) et calculer le winrate réel par objet et par
augment. Sert à remplacer les données mockées de `data.js` par de vraies stats.

## Pourquoi un backend séparé ?

Le site (racine du repo) est 100% statique — hébergeable sur GitHub Pages.
On ne peut pas appeler l'API Riot depuis le navigateur du visiteur : la clé
serait exposée publiquement dans le code source de la page. Ce script tourne
donc côté serveur (en local, ou plus tard sur un petit serveur/CI), et
produit un fichier JSON (`output/stats.json`) que le site statique peut
ensuite charger.

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

Ouvre `.env` et remplis `RIOT_API_KEY` avec ta clé du
[Developer Portal](https://developer.riotgames.com/). **Ne commit jamais ce
fichier** (il est ignoré par git).

Une clé "Development" expire toutes les 24h — il faut la régénérer sur le
portail et remettre à jour `.env` à chaque session de collecte. Pour un site
en prod, il faudra une clé "Personal" ou "Production" (approbation Riot).

## Lancer la collecte

```bash
npm run collect
```

Le script :
1. Récupère une dizaine de joueurs challenger (SoloQ) comme point de départ.
2. Pour chacun, récupère ses games ARAM Mayhem récentes (`queue=2400`).
3. Pour chaque game trouvée, ajoute tous ses participants comme nouvelles
   "graines" à explorer (échantillonnage boule de neige) — ça permet de
   grossir l'échantillon sans connaître les joueurs à l'avance.
4. S'arrête après `TARGET_MATCHES` games uniques (réglable dans `.env`).
5. Écrit `output/stats.json` avec, pour chaque objet et chaque augment
   rencontré : nombre de games et winrate.

## Limites connues du prototype

- **Échantillon petit** au départ (le mode + une seule session de collecte).
  Un winrate calculé sur 3-4 games n'est pas fiable — `stats.json` inclut
  le nombre de games (`games`) pour filtrer les résultats trop peu fiables
  côté consommateur.
- **Item = build final** (`item0`-`item6` en fin de partie), pas l'ordre
  d'achat ni le "meilleur objet contre telle comp" — c'est une approximation
  volontaire pour le MVP.
- **IDs d'augments bruts** : `playerAugment1..6` sont des IDs numériques
  Riot, pas des noms. Pour les noms/icônes, il faudra croiser avec les
  données Community Dragon (`raw.communitydragon.org/latest/cdragon/arena/en_us.json`)
  — à vérifier si le mode Mayhem partage le même pool d'augments que l'Arena
  (probable mais pas confirmé avec un échantillon réel pour l'instant).
- **Pas encore branché sur le site** : ce script produit `output/stats.json`
  en local ; l'intégration dans `data.js` du front-end est la prochaine étape,
  une fois qu'on aura un échantillon assez gros pour être pertinent.

## Constat important (testé le 19/08/2026)

Le mode ARAM Mayhem (queue `2400`) est bien actif et jouable dans le client,
mais **les games ne semblent pas (ou très lentement) indexées côté Match-V5** :
- Une game venait d'être terminée et confirmée visible dans le client League
  des 10 joueurs.
- Après plus de 20 minutes, aucun des 10 participants ne l'avait dans son
  historique via `/lol/match/v5/matches/by-puuid/{puuid}/ids`, avec ou sans
  filtre `queue=2400`.
- Recherche approfondie (jusqu'à 900 games en arrière, plusieurs comptes
  Challenger/Gold/Silver/Platinum, plusieurs plateformes EUW/NA) : **zéro
  match `queueId 2400` trouvé**, alors que ARAM classique (450), Arena
  (1700/1740/1750) et Swiftplay (890) apparaissent normalement.
- Le statut officiel des serveurs (`/lol/status/v4/platform-data`) ne
  signalait aucun incident/maintenance au moment du test.

**Hypothèse la plus probable** : bug ou lenteur ponctuelle du pipeline
d'ingestion Match-V5 spécifique à cette queue (pas un souci de notre script —
la logique de récupération/parsing a été validée avec de vraies données sur
d'autres queues pendant les tests). À revérifier avec une clé fraîche plus
tard (le lendemain, ou après annonce Riot d'un correctif) avant de re-tenter
une collecte.

**Ne pas confondre avec la confidentialité de compte** : Riot a une option
"historique de match privé" dans les paramètres du compte, qui rend
l'historique invisible pour tout le monde sauf le propriétaire (y compris
pour notre script ET les sites tiers comme op.gg/League of Graphs). On a
écarté cette piste ici car même des comptes tiers (coéquipiers de la partie
testée) ne montraient pas la game — donc bien un problème d'indexation
générale de la queue, pas de vie privée individuelle.
