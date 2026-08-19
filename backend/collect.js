/* ============================================================
   ARAM MAYHEM INDICATOR — backend/collect.js
   ------------------------------------------------------------
   Collecte des games ARAM Mayhem (queueId 2400) via l'API Riot
   (Match-V5) et agrège les winrates par objet et par augment.

   Stratégie de collecte : "snowball sampling".
   Riot n'expose pas d'endpoint "liste toutes les games ARAM Mayhem".
   On part donc de quelques joueurs (challenger solo/duo comme graine),
   on récupère leurs games ARAM Mayhem récentes, et pour chaque game
   on ajoute tous ses participants à la file d'attente de joueurs à
   explorer. Ça permet de "boule de neige" vers un échantillon large
   sans connaître les joueurs à l'avance.

   Usage :
     cd backend
     npm install
     cp .env.example .env   # puis remplir RIOT_API_KEY toi-même
     npm run collect
   ============================================================ */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.RIOT_API_KEY;
const PLATFORM = process.env.PLATFORM || "euw1";
const REGIONAL = process.env.REGIONAL || "europe";
const TARGET_MATCHES = parseInt(process.env.TARGET_MATCHES || "50", 10);
const QUEUE_ID = 2400; // ARAM: Mayhem

if (!API_KEY) {
  console.error("Erreur : RIOT_API_KEY manquante. Copie .env.example en .env et remplis ta clé.");
  process.exit(1);
}

/* ---------- Rate limiter très simple ----------
   Clé Development Riot : ~20 req/1s et 100 req/2min.
   On reste large en dessous pour éviter les 429. */
let requestQueue = Promise.resolve();
let lastRequestTime = 0;
const MIN_DELAY_MS = 1500; // ~40 req/min, conservateur

function throttledFetch(url) {
  requestQueue = requestQueue.then(async () => {
    const wait = Math.max(0, MIN_DELAY_MS - (Date.now() - lastRequestTime));
    if (wait > 0) await sleep(wait);
    lastRequestTime = Date.now();
    return doFetch(url);
  });
  return requestQueue;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function doFetch(url, attempt = 1) {
  const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
    console.warn(`  [429] Rate limited, attente ${retryAfter}s...`);
    await sleep((retryAfter + 1) * 1000);
    return doFetch(url, attempt);
  }
  if (res.status === 403) {
    throw new Error("403 Forbidden — ta clé API a probablement expiré. Régénère-la sur le Developer Portal.");
  }
  if (!res.ok) {
    if (attempt < 3 && res.status >= 500) {
      await sleep(1500);
      return doFetch(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} sur ${url}`);
  }
  return res.json();
}

/* ---------- Étape 1 : graine de joueurs ----------
   Le plus fiable : partir d'un Riot ID connu qui joue vraiment ce mode
   (SEED_RIOT_ID dans .env, format "Pseudo#TAG"). Sans ça, on retombe sur
   des joueurs classés (Gold) au hasard — mais leur historique récent est
   noyé de ranked, donc le snowball a peu de chances de "toucher" le mode.
   LeagueEntryDTO expose désormais directement `puuid` (l'ancien champ
   `summonerId` + appel Summoner-V4 intermédiaire n'est plus nécessaire). */
async function getSeedFromRiotId(riotId) {
  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) throw new Error(`SEED_RIOT_ID invalide : "${riotId}" (attendu "Pseudo#TAG")`);
  const account = await throttledFetch(
    `https://${REGIONAL}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
  console.log(`  graine explicite: ${riotId} -> puuid trouvé`);
  return account.puuid;
}

async function getSeedPuuids(count = 15) {
  // SEED_RIOT_ID peut contenir plusieurs Riot ID séparés par des virgules,
  // ex: "Lesbian Lizard#OwO,TryToCarryXD#EUW,Tippy#YEE,xZelphy#EUW"
  const seedRiotIds = (process.env.SEED_RIOT_ID || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const puuids = [];

  for (const riotId of seedRiotIds) {
    try {
      puuids.push(await getSeedFromRiotId(riotId));
    } catch (e) {
      console.warn(`  graine explicite "${riotId}" échouée: ${e.message}`);
    }
  }

  const entries = await throttledFetch(
    `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/GOLD/I?page=1`
  );
  puuids.push(...entries.slice(0, count).map(e => e.puuid).filter(Boolean));

  console.log(`  ${puuids.length} graines récupérées (dont ${seedRiotIds.length} explicites).`);
  return puuids;
}

/* ---------- Étape 2 : crawl snowball ---------- */
async function crawl() {
  console.log(`Récupération des graines (joueurs challenger)...`);
  const seeds = await getSeedPuuids(10);
  if (seeds.length === 0) throw new Error("Aucune graine récupérée, abandon.");

  const puuidQueue = [...seeds];
  const visitedPuuids = new Set();
  const visitedMatches = new Set();
  const matches = [];

  while (puuidQueue.length > 0 && matches.length < TARGET_MATCHES) {
    const puuid = puuidQueue.shift();
    if (visitedPuuids.has(puuid)) continue;
    visitedPuuids.add(puuid);

    let matchIds;
    try {
      matchIds = await throttledFetch(
        `https://${REGIONAL}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${QUEUE_ID}&count=30`
      );
    } catch (e) {
      console.warn(`  match-ids échoué pour un joueur: ${e.message}`);
      continue;
    }

    for (const matchId of matchIds) {
      if (matches.length >= TARGET_MATCHES) break;
      if (visitedMatches.has(matchId)) continue;
      visitedMatches.add(matchId);

      let match;
      try {
        match = await throttledFetch(`https://${REGIONAL}.api.riotgames.com/lol/match/v5/matches/${matchId}`);
      } catch (e) {
        console.warn(`  match ${matchId} échoué: ${e.message}`);
        continue;
      }

      if (match.info.queueId !== QUEUE_ID) continue;

      matches.push(match);
      console.log(`  [${matches.length}/${TARGET_MATCHES}] match ${matchId} collecté`);

      // Snowball : ajoute tous les participants comme futures graines
      for (const p of match.info.participants) {
        if (!visitedPuuids.has(p.puuid)) puuidQueue.push(p.puuid);
      }
    }
  }

  return matches;
}

/* ---------- Étape 3 : agrégation ---------- */
function aggregate(matches) {
  const itemStats = {};    // itemId -> {games, wins}
  const augmentStats = {}; // augmentId -> {games, wins}
  const augmentPairStats = {}; // "idA|idB" (idA<idB) -> {games, wins}

  function bump(map, key, win) {
    if (!map[key]) map[key] = { games: 0, wins: 0 };
    map[key].games++;
    if (win) map[key].wins++;
  }

  for (const match of matches) {
    for (const p of match.info.participants) {
      const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(id => id && id !== 0);
      const augments = [p.playerAugment1, p.playerAugment2, p.playerAugment3, p.playerAugment4, p.playerAugment5, p.playerAugment6]
        .filter(id => id && id !== 0);

      items.forEach(itemId => bump(itemStats, itemId, p.win));
      augments.forEach(augId => bump(augmentStats, augId, p.win));

      for (let i = 0; i < augments.length; i++) {
        for (let j = i + 1; j < augments.length; j++) {
          const key = [augments[i], augments[j]].sort((a, b) => a - b).join("|");
          bump(augmentPairStats, key, p.win);
        }
      }
    }
  }

  const toWinrateList = (map) =>
    Object.entries(map)
      .map(([id, s]) => ({ id, games: s.games, winrate: +(100 * s.wins / s.games).toFixed(2) }))
      .sort((a, b) => b.games - a.games);

  return {
    generatedAt: new Date().toISOString(),
    matchesAnalyzed: matches.length,
    queueId: QUEUE_ID,
    items: toWinrateList(itemStats),
    augments: toWinrateList(augmentStats),
    augmentPairs: toWinrateList(augmentPairStats),
  };
}

/* ---------- Main ---------- */
(async () => {
  try {
    console.log(`=== ARAM Mayhem collector === (cible: ${TARGET_MATCHES} matchs, plateforme: ${PLATFORM})`);
    const matches = await crawl();

    if (matches.length === 0) {
      console.error("Aucun match ARAM Mayhem trouvé. Vérifie PLATFORM/REGIONAL, ou que le mode tourne actuellement.");
      process.exit(1);
    }

    const stats = aggregate(matches);

    const outDir = path.join(__dirname, "output");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "stats.json");
    fs.writeFileSync(outFile, JSON.stringify(stats, null, 2));

    console.log(`\nTerminé. ${stats.matchesAnalyzed} matchs analysés.`);
    console.log(`Résultat écrit dans ${outFile}`);
    console.log(`Top 5 objets par winrate (min 3 échantillons):`);
    stats.items.filter(i => i.games >= 3).slice(0, 5).forEach(i =>
      console.log(`  item ${i.id}: ${i.winrate}% (${i.games} games)`)
    );
  } catch (e) {
    console.error("Erreur fatale:", e.message);
    process.exit(1);
  }
})();
