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

Le mode ARAM Mayhem (queue `2400`) est bien actif et jouable dans le client.
Deux observations distinctes, à ne pas confondre :

1. **Une game qui vient d'être terminée met du temps à apparaître dans
   Match-V5** pour ses 10 participants — délai normal et documenté côté
   Riot (peut aller jusqu'à 30-60 min selon la charge), rien d'anormal.
2. **La recherche à froid (snowball depuis des joueurs classés
   Challenger/Gold/Silver/Platinum, sans lien avec le mode) donne un très
   faible rendement** : jusqu'à 900 games en arrière chez une poignée de
   comptes, zéro `queueId 2400` trouvé, alors qu'ARAM classique (450),
   Arena (1700/1740/1750) et Swiftplay (890) apparaissent normalement chez
   ces mêmes comptes.

⚠️ Le point 2 ne veut **pas** dire que Match-V5 n'indexe pas cette queue —
des sites comme MetaSrc affichent des tier lists ARAM Mayhem à jour, donc
la donnée existe bel et bien dans l'API. Le point 2 reflète juste un
échantillon de départ trop petit et mal ciblé (joueurs de ladder ranked,
qui touchent peu à ce mode) : leur historique récent est noyé de ranked/
normal, et 5-15 games par joueur ne suffisent pas à "tomber" dessus par
hasard. Ces gros sites tournent depuis des semaines/mois avec des clés
Production (pas de ré-expiration) et une infra de crawling bien plus large
— ils accumulent l'échantillon dans la durée, pas en une session.

**Pour la prochaine collecte** : privilégier un plus grand nombre de
graines explicites (joueurs qu'on sait jouer à ce mode, cf. `SEED_RIOT_ID`)
plutôt que des joueurs de ladder au hasard, et laisser tourner plus
longtemps/sur plusieurs sessions pour accumuler un vrai échantillon.

**Ne pas confondre avec la confidentialité de compte** : Riot a une option
"historique de match privé" dans les paramètres du compte, qui rend
l'historique invisible pour tout le monde sauf le propriétaire (y compris
pour notre script ET les sites tiers comme op.gg/League of Graphs). On a
écarté cette piste ici car même des comptes tiers (coéquipiers de la partie
testée) ne montraient pas la game — donc bien un problème d'indexation
générale de la queue, pas de vie privée individuelle.
