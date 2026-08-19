/* ============================================================
   ARAM MAYHEM INDICATOR — data.js
   ------------------------------------------------------------
   Données MOCKÉES pour le prototype.
   Structure pensée pour être remplacée plus tard par de vraies
   stats agrégées via l'API Riot Games (Match-V5) :
     - baseWinrate  -> winrate réel calculé sur X milliers de games
     - pickrate     -> fréquence de pick réelle
     - synergy      -> delta de winrate observé quand augments
                       combinés, calculé sur l'échantillon réel
   Pour l'instant tout est estimé "à la main" pour la démo.
   ============================================================ */

/* ddragonId = identifiant utilisé par le CDN Data Dragon de Riot
   pour l'URL de l'icône (souvent = name sans espace/apostrophe). */
const CHAMPIONS = [
  { id: "yasuo",    name: "Yasuo",    ddragonId: "Yasuo",    damageType: "AD",  tags: ["mobile", "duelist"] },
  { id: "malphite", name: "Malphite", ddragonId: "Malphite", damageType: "AP",  tags: ["tank", "engage"] },
  { id: "lux",      name: "Lux",      ddragonId: "Lux",      damageType: "AP",  tags: ["mage", "poke", "cc-high"] },
  { id: "darius",   name: "Darius",   ddragonId: "Darius",   damageType: "AD",  tags: ["bruiser", "sustain"] },
  { id: "thresh",   name: "Thresh",   ddragonId: "Thresh",   damageType: "AP",  tags: ["support", "cc-high", "engage"] },
  { id: "vayne",    name: "Vayne",    ddragonId: "Vayne",    damageType: "AD",  tags: ["marksman", "true-damage"] },
  { id: "annie",    name: "Annie",    ddragonId: "Annie",    damageType: "AP",  tags: ["mage", "burst", "cc-high"] },
  { id: "garen",    name: "Garen",    ddragonId: "Garen",    damageType: "AD",  tags: ["bruiser", "sustain", "tank"] },
  { id: "ziggs",    name: "Ziggs",    ddragonId: "Ziggs",    damageType: "AP",  tags: ["mage", "poke", "aoe"] },
  { id: "volibear", name: "Volibear", ddragonId: "Volibear", damageType: "Mixed", tags: ["bruiser", "engage"] },
  { id: "ahri",     name: "Ahri",     ddragonId: "Ahri",     damageType: "AP",  tags: ["mage", "burst", "mobile"] },
  { id: "braum",    name: "Braum",    ddragonId: "Braum",    damageType: "AD",  tags: ["tank", "support", "cc-high"] },
  { id: "jinx",     name: "Jinx",     ddragonId: "Jinx",     damageType: "AD",  tags: ["marksman", "aoe"] },
  { id: "amumu",    name: "Amumu",    ddragonId: "Amumu",    damageType: "AP",  tags: ["tank", "cc-high", "aoe"] },
  { id: "zed",      name: "Zed",      ddragonId: "Zed",      damageType: "AD",  tags: ["assassin", "burst", "mobile"] },
  { id: "sona",     name: "Sona",     ddragonId: "Sona",     damageType: "AP",  tags: ["support", "sustain", "healer"] },
  { id: "nasus",    name: "Nasus",    ddragonId: "Nasus",    damageType: "AD",  tags: ["bruiser", "sustain", "healer"] },
  { id: "kennen",   name: "Kennen",   ddragonId: "Kennen",   damageType: "AP",  tags: ["mage", "cc-high", "aoe"] },
  { id: "warwick",  name: "Warwick",  ddragonId: "Warwick",  damageType: "AD",  tags: ["bruiser", "healer", "sustain"] },
  { id: "morgana",  name: "Morgana",  ddragonId: "Morgana",  damageType: "AP",  tags: ["mage", "cc-high", "shield"] },
];

/* ddragonId = id numérique officiel de l'objet (stable entre patches),
   utilisé pour l'URL de l'icône Data Dragon. */
const ITEMS = [
  { id: "randuins",    name: "Randuin's Omen",       ddragonId: 3143, type: "armor", tags: ["tank", "anti-crit"],          baseWinrate: 51.2 },
  { id: "thornmail",   name: "Thornmail",             ddragonId: 3075, type: "armor", tags: ["antiheal", "tank"],           baseWinrate: 52.8 },
  { id: "fon",          name: "Force of Nature",       ddragonId: 3111, type: "mr",    tags: ["tank", "mobility"],            baseWinrate: 50.4 },
  { id: "spiritvis",   name: "Spirit Visage",         ddragonId: 3065, type: "mr",    tags: ["healer", "tank"],              baseWinrate: 51.9 },
  { id: "ga",           name: "Guardian Angel",        ddragonId: 3026, type: "armor", tags: ["survivability"],               baseWinrate: 50.7 },
  { id: "maw",          name: "Maw of Malmortius",     ddragonId: 3156, type: "mr",    tags: ["ad", "shield"],                baseWinrate: 51.1 },
  { id: "banshee",     name: "Banshee's Veil",        ddragonId: 3102, type: "mr",    tags: ["shield", "ap"],                baseWinrate: 50.9 },
  { id: "frozenheart", name: "Frozen Heart",          ddragonId: 3110, type: "armor", tags: ["mana", "attackspeed-reduc"],  baseWinrate: 50.1 },
  { id: "zhonya",      name: "Zhonya's Hourglass",    ddragonId: 3157, type: "armor", tags: ["ap", "burst-survival"],       baseWinrate: 52.3 },
  { id: "merc",         name: "Mercurial Scimitar",    ddragonId: 3139, type: "mr",    tags: ["cleanse", "ad"],               baseWinrate: 51.6 },
  { id: "sunfire",     name: "Sunfire Aegis",         ddragonId: 3068, type: "armor", tags: ["tank", "aoe"],                 baseWinrate: 52.0 },
  { id: "warmogs",     name: "Warmog's Armor",        ddragonId: 3083, type: "hp",    tags: ["tank", "sustain"],             baseWinrate: 49.8 },
  { id: "witsend",     name: "Wit's End",              ddragonId: 3091, type: "mr",    tags: ["attackspeed", "ad"],           baseWinrate: 50.6 },
  { id: "adaptive",    name: "Adaptive Helm",         ddragonId: 3066, type: "mr",    tags: ["tank", "aoe-reduc"],           baseWinrate: 50.3 },
  { id: "deadmans",    name: "Dead Man's Plate",      ddragonId: 3742, type: "armor", tags: ["mobility", "tank"],            baseWinrate: 50.5 },
  { id: "exec",         name: "Executioner's Calling", ddragonId: 3123, type: "armor", tags: ["antiheal", "ad"],              baseWinrate: 49.5 },
];

const AUGMENTS = [
  { id: "cheapskate",  name: "Radin de Guerre",   desc: "Réduction du coût des objets.",              tags: ["econ"],       baseWinrate: 50.5, synergy: {} },
  { id: "juggernaut",  name: "Juggernaut",         desc: "+HP et résistances massives.",               tags: ["tank"],       baseWinrate: 52.1, synergy: { fortification: 3.5, vampirism: 1.5 } },
  { id: "glasscannon", name: "Canon de Verre",    desc: "+Dégâts, -résistances.",                     tags: ["ap", "burst"],baseWinrate: 51.0, synergy: { arcanebolt: 4.0, adrenaline: 1.0 } },
  { id: "secondwind",  name: "Second Souffle",    desc: "Régénération accrue hors combat.",           tags: ["sustain"],    baseWinrate: 49.9, synergy: { vampirism: 2.0 } },
  { id: "electrocute", name: "Surcharge",          desc: "Dégâts bonus après 3 sorts touchés.",        tags: ["burst"],      baseWinrate: 51.4, synergy: { arcanebolt: 2.5 } },
  { id: "fortification", name: "Fortification",   desc: "+Armure et Résist. Magique.",                 tags: ["tank"],       baseWinrate: 52.6, synergy: { juggernaut: 3.5, bulwark: 2.0 } },
  { id: "wintersblessing", name: "Bénédiction d'Hiver", desc: "Ralentit les ennemis proches.",         tags: ["cc"],         baseWinrate: 50.2, synergy: { bulwark: 1.5 } },
  { id: "adrenaline",  name: "Adrénaline",         desc: "+Vitesse d'attaque en combat.",              tags: ["as"],         baseWinrate: 50.8, synergy: { deft: 3.0 } },
  { id: "deft",         name: "Habileté",           desc: "+Coups critiques.",                          tags: ["crit"],       baseWinrate: 51.3, synergy: { adrenaline: 3.0 } },
  { id: "arcanebolt",  name: "Trait Arcanique",    desc: "Les sorts appliquent une marque explosive.", tags: ["ap", "burst"],baseWinrate: 51.7, synergy: { glasscannon: 4.0, electrocute: 2.5 } },
  { id: "bulwark",     name: "Rempart",            desc: "Bouclier périodique.",                        tags: ["shield", "tank"], baseWinrate: 50.6, synergy: { fortification: 2.0, wintersblessing: 1.5 } },
  { id: "vampirism",   name: "Vampirisme",         desc: "+Vol de vie global.",                         tags: ["sustain"],    baseWinrate: 51.9, synergy: { juggernaut: 1.5, secondwind: 2.0 } },
];
