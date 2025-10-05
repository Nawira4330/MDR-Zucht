// ===============================================================
// app.js – Version mit Genetik-Scoring (Variante 3)
// & Anzeige der besten/schlechtesten Werte + Sortierauswahl
// ===============================================================

// ========== INFOFENSTER MIT REITERN ==========
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ========== DATENSTRUKTUREN ==========
let stuten = [];
let hengste = [];

// Schlüsseldefinitionen für flexibles JSON-Mapping
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "color", "Genetik"];
const MERKMALE = [
  "Kopf", "Gebiss", "Hals", "Halsansatz", "Widerrist",
  "Schulter", "Brust", "Rückenlinie", "Rückenlänge",
  "Kruppe", "Beinwinkelung", "Beinstellung", "Fesseln", "Hufe"
];

// ========== HILFSFUNKTIONEN ==========
function pickField(obj, keys) {
  for (const k of keys) if (obj && obj[k]) return obj[k];
  return "";
}
function pickName(o) { return pickField(o, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(o) { return pickField(o, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(o) { return pickField(o, COLOR_KEYS) || ""; }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ========== DATEN LADEN ==========
async function ladeDaten() {
  const s = await fetch("data/stuten.json").then(r => r.json());
  const h = await fetch("data/hengste.json").then(r => r.json());
  stuten = s;
  hengste = h;
  fuelleDropdowns();
}

// ========== DROPDOWNS BEFÜLLEN ==========
function fuelleDropdowns() {
  const selS = document.getElementById("stuteSelect");
  const selB = document.getElementById("besitzerSelect");
  selS.innerHTML = '<option value="">– Alle Stuten –</option>';
  selB.innerHTML = '<option value="">– Alle Besitzer –</option>';

  stuten.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = pickName(s);
    selS.appendChild(opt);
  });

  [...new Set(stuten.map(s => pickOwner(s)))].filter(x => x).forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    selB.appendChild(opt);
  });
}

// ========== SCORING ALGORITHMUS ==========
function scorePair(stute, hengst) {
  let total = 0, count = 0;
  for (const m of MERKMALE) {
    const sG = (stute[m] || "").trim().split(/\s+/);
    const hG = (hengst[m] || "").trim().split(/\s+/);
    if (sG.length < 8 || hG.length < 8) continue;

    let local = 0;
    for (let i = 0; i < 8; i++) {
      const S = sG[i], H = hG[i];
      const t = i < 4 ? "HH" : "hh";
      let s = 0;

      // Bewertung: obere Hälfte dominant, untere rezessiv
      if (t === "HH") {
        if (S === "hh" && (H === "HH" || H === "Hh")) s = 1;
        else if (S === "Hh" && (H === "HH" || H === "Hh")) s = 1;
        else if (S === "HH" && (H === "HH" || H === "Hh")) s = 1;
        else if (S === "HH" && H === "hh") s = 0;
        else s = 0.3;
      } else {
        if (S === "HH" && (H === "hh" || H === "Hh")) s = 1;
        else if (S === "Hh" && (H === "hh" || H === "Hh")) s = 1;
        else if (S === "hh" &&
