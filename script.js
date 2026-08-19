/* ============================================================
   ARAM MAYHEM INDICATOR — script.js
   ------------------------------------------------------------
   Logique de scoring (MOCK). Remplaçable plus tard par de vraies
   requêtes vers un backend qui agrège les stats Riot API.
   ============================================================ */

const state = {
  enemyIds: new Set(),
  ownedAugmentIds: new Set(),
};

/* ---------- Data Dragon (icônes officielles Riot) ---------- */
const DDRAGON_FALLBACK_VERSION = "14.19.1"; // utilisé si l'appel réseau échoue (hors-ligne)
let ddragonVersion = DDRAGON_FALLBACK_VERSION;

async function loadDdragonVersion() {
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await res.json();
    if (Array.isArray(versions) && versions[0]) ddragonVersion = versions[0];
  } catch (e) {
    console.warn("Impossible de récupérer la version Data Dragon, fallback utilisé.", e);
  }
}

function championIconUrl(champ) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champ.ddragonId}.png`;
}

function itemIconUrl(item) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${item.ddragonId}.png`;
}

/* ---------- Scoring objets ---------- */
function computeItemScores() {
  const enemyChamps = CHAMPIONS.filter(c => state.enemyIds.has(c.id));
  const n = enemyChamps.length || 1;

  const magicCount = enemyChamps.filter(c => c.damageType === "AP" || c.damageType === "Mixed").length;
  const physCount  = enemyChamps.filter(c => c.damageType === "AD" || c.damageType === "Mixed").length;
  const healerCount = enemyChamps.filter(c => c.tags.includes("healer")).length;
  const ccCount = enemyChamps.filter(c => c.tags.includes("cc-high")).length;

  const magicRatio = magicCount / n;
  const physRatio  = physCount / n;

  return ITEMS.map(item => {
    let score = item.baseWinrate;
    const reasons = [];

    if (item.type === "mr") {
      const bonus = magicRatio * 8;
      score += bonus;
      if (magicCount > 0) reasons.push(`+${bonus.toFixed(1)} vs ${magicCount} champ(s) magique(s)`);
    }
    if (item.type === "armor") {
      const bonus = physRatio * 8;
      score += bonus;
      if (physCount > 0) reasons.push(`+${bonus.toFixed(1)} vs ${physCount} champ(s) physique(s)`);
    }
    if (item.tags.includes("antiheal") && healerCount > 0) {
      score += healerCount * 3;
      reasons.push(`+${(healerCount * 3).toFixed(1)} anti-soin vs ${healerCount} healer(s)`);
    }
    if ((item.tags.includes("shield") || item.tags.includes("survivability")) && ccCount >= 2) {
      score += 2.5;
      reasons.push(`+2.5 survie vs comp CC lourde`);
    }
    if (item.tags.includes("cleanse") && ccCount >= 2) {
      score += 2.0;
      reasons.push(`+2.0 cleanse vs comp CC lourde`);
    }

    return { ...item, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

/* ---------- Scoring augments ---------- */
function computeAugmentScores() {
  const owned = AUGMENTS.filter(a => state.ownedAugmentIds.has(a.id));

  return AUGMENTS.map(aug => {
    if (state.ownedAugmentIds.has(aug.id)) return null; // déjà pris
    let score = aug.baseWinrate;
    const reasons = [];

    owned.forEach(o => {
      const bonus = (o.synergy && o.synergy[aug.id]) || (aug.synergy && aug.synergy[o.id]) || 0;
      if (bonus) {
        score += bonus;
        reasons.push(`+${bonus.toFixed(1)} synergie avec "${o.name}"`);
      }
    });

    return { ...aug, score, reasons };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

/* ---------- Rendu ---------- */
function barColor(score) {
  if (score >= 53) return "#3fae2a";
  if (score >= 51) return "#7cb342";
  if (score >= 50) return "#e0a800";
  return "#c0392b";
}

function renderResults() {
  const itemScores = computeItemScores().slice(0, 5);
  const augScores = computeAugmentScores().slice(0, 5);

  const itemList = document.getElementById("item-results");
  itemList.innerHTML = itemScores.map((it, i) => `
    <li class="result-row">
      <span class="rank">#${i + 1}</span>
      <img class="result-icon" src="${itemIconUrl(it)}" alt="" onerror="this.style.visibility='hidden'">
      <span class="result-name">${it.name}</span>
      <div class="meter"><div class="meter-fill" style="width:${Math.min(it.score, 60) / 60 * 100}%; background:${barColor(it.score)};"></div></div>
      <span class="pct">${it.score.toFixed(1)}%</span>
      ${it.reasons.length ? `<div class="reasons">${it.reasons.join(" · ")}</div>` : ""}
    </li>
  `).join("");

  const augList = document.getElementById("augment-results");
  augList.innerHTML = augScores.map((a, i) => `
    <li class="result-row">
      <span class="rank">#${i + 1}</span>
      <span class="result-icon augment-icon">${a.name.charAt(0)}</span>
      <span class="result-name">${a.name}</span>
      <div class="meter"><div class="meter-fill" style="width:${Math.min(a.score, 60) / 60 * 100}%; background:${barColor(a.score)};"></div></div>
      <span class="pct">${a.score.toFixed(1)}%</span>
      ${a.reasons.length ? `<div class="reasons">${a.reasons.join(" · ")}</div>` : `<div class="reasons">${a.desc}</div>`}
    </li>
  `).join("");
}

/* ---------- Construction UI listes (avec filtre recherche) ---------- */
function normalize(str) {
  // insensible aux accents/majuscules/espaces/apostrophes, pour que "chogath" trouve "Cho'Gath" (les chiffres romains type "Jarvan IV" restent sensibles à la casse du nom exact).
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

function buildChampionGrid(filterText = "") {
  const grid = document.getElementById("champion-grid");
  const filtered = filterText
    ? CHAMPIONS.filter(c => normalize(c.name).includes(normalize(filterText)))
    : CHAMPIONS;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-hint">Aucun champion ne correspond à "${filterText}".</p>`;
    return;
  }

  grid.innerHTML = filtered.map(c => `
    <button class="champ-btn${state.enemyIds.has(c.id) ? " selected" : ""}" data-id="${c.id}" title="${c.damageType} — ${c.tags.join(', ')}">
      <img class="champ-icon" src="${championIconUrl(c)}" alt="" onerror="this.style.display='none'">
      <span class="champ-label">${c.name}</span>
    </button>
  `).join("");

  grid.querySelectorAll(".champ-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (state.enemyIds.has(id)) {
        state.enemyIds.delete(id);
        btn.classList.remove("selected");
      } else {
        if (state.enemyIds.size >= 5) return;
        state.enemyIds.add(id);
        btn.classList.add("selected");
      }
      updateCounter();
      renderResults();
    });
  });
}

function buildAugmentGrid(filterText = "") {
  const grid = document.getElementById("augment-grid");
  const filtered = filterText
    ? AUGMENTS.filter(a => normalize(a.name).includes(normalize(filterText)))
    : AUGMENTS;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-hint">Aucun augment ne correspond à "${filterText}".</p>`;
    return;
  }

  grid.innerHTML = filtered.map(a => `
    <button class="augment-btn${state.ownedAugmentIds.has(a.id) ? " selected" : ""}" data-id="${a.id}" title="${a.desc}">
      ${a.name}
    </button>
  `).join("");

  grid.querySelectorAll(".augment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (state.ownedAugmentIds.has(id)) {
        state.ownedAugmentIds.delete(id);
        btn.classList.remove("selected");
      } else {
        if (state.ownedAugmentIds.size >= 3) return;
        state.ownedAugmentIds.add(id);
        btn.classList.add("selected");
      }
      renderResults();
    });
  });
}

function updateCounter() {
  document.getElementById("enemy-count").textContent = `${state.enemyIds.size} / 5`;
}

/* ---------- Horloge rétro (barre des tâches) ---------- */
function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("taskbar-clock").textContent = `${hh}:${mm}`;
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadDdragonVersion();
  buildChampionGrid();
  buildAugmentGrid();
  updateCounter();
  renderResults();
  tickClock();
  setInterval(tickClock, 1000 * 10);

  const champSearch = document.getElementById("champion-search");
  const augSearch = document.getElementById("augment-search");

  champSearch.addEventListener("input", () => buildChampionGrid(champSearch.value));
  augSearch.addEventListener("input", () => buildAugmentGrid(augSearch.value));

  document.getElementById("reset-btn").addEventListener("click", () => {
    state.enemyIds.clear();
    state.ownedAugmentIds.clear();
    champSearch.value = "";
    augSearch.value = "";
    buildChampionGrid();
    buildAugmentGrid();
    updateCounter();
    renderResults();
  });
});
