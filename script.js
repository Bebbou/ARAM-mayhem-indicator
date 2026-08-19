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
      <span class="result-name">${a.name}</span>
      <div class="meter"><div class="meter-fill" style="width:${Math.min(a.score, 60) / 60 * 100}%; background:${barColor(a.score)};"></div></div>
      <span class="pct">${a.score.toFixed(1)}%</span>
      ${a.reasons.length ? `<div class="reasons">${a.reasons.join(" · ")}</div>` : `<div class="reasons">${a.desc}</div>`}
    </li>
  `).join("");
}

/* ---------- Construction UI listes ---------- */
function buildChampionGrid() {
  const grid = document.getElementById("champion-grid");
  grid.innerHTML = CHAMPIONS.map(c => `
    <button class="champ-btn" data-id="${c.id}" title="${c.damageType} — ${c.tags.join(', ')}">
      ${c.name}
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

function buildAugmentGrid() {
  const grid = document.getElementById("augment-grid");
  grid.innerHTML = AUGMENTS.map(a => `
    <button class="augment-btn" data-id="${a.id}" title="${a.desc}">
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
document.addEventListener("DOMContentLoaded", () => {
  buildChampionGrid();
  buildAugmentGrid();
  updateCounter();
  renderResults();
  tickClock();
  setInterval(tickClock, 1000 * 10);

  document.getElementById("reset-btn").addEventListener("click", () => {
    state.enemyIds.clear();
    state.ownedAugmentIds.clear();
    document.querySelectorAll(".champ-btn.selected, .augment-btn.selected").forEach(el => el.classList.remove("selected"));
    updateCounter();
    renderResults();
  });
});
