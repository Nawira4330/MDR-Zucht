// ===============================================================
// app.js – Version mit Genetik-Scoring (Variante 3)
// & Anzeige der besten/schlechtesten Werte + Sortierauswahl
// ===============================================================

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
  try {
    const s = await fetch("data/stuten.json").then(r => r.json());
    const h = await fetch("data/hengste.json").then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];
    fuelleDropdowns();
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    document.getElementById("ergebnis").innerHTML =
      "<p style='color:red'>Fehler beim Laden der Daten. Prüfe data/*.json.</p>";
  }
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
        else if (S === "hh" && (H === "hh" || H === "Hh")) s = 1;
        else if (S === "hh" && H === "HH") s = 0;
        else s = 0.3;
      }
      local += s;
    }
    total += local / 8;
    count++;
  }
  return count ? total / count : 0;
}

// ========== NOTENBERECHNUNG ==========
function berechneNoten(stute, hengst) {
  let werte = [];
  for (const m of MERKMALE) {
    const sG = (stute[m] || "").trim().split(/\s+/);
    const hG = (hengst[m] || "").trim().split(/\s+/);
    if (sG.length < 8 || hG.length < 8) continue;
    let n = 0;

    for (let i = 0; i < 8; i++) {
      const k = sG[i] + hG[i];
      if (/HHHH|hhhh/.test(k)) n += 1.3;
      else if (/HhHH|HHHh|hhHh|hHhh/.test(k)) n += 2.0;
      else if (/HhHh|hHhH/.test(k)) n += 2.5;
      else n += 3.5;
    }
    werte.push(n / 8);
  }
  if (!werte.length) return { best: 0, worst: 0 };
  return { best: Math.min(...werte), worst: Math.max(...werte) };
}

function noteZuText(n) {
  if (n <= 1.5) return "Exzellent";
  if (n <= 2.5) return "Sehr gut";
  if (n <= 3.5) return "Gut";
  if (n <= 4.5) return "Ausreichend";
  return "Schwach";
}

// ========== SORTIERUNG ==========
function sortierteHengste(stute) {
  const sort = document.getElementById("sortOption").value;
  const arr = hengste.map(h => {
    const s = scorePair(stute, h);
    const { best, worst } = berechneNoten(stute, h);
    return { ...h, __score: s, __best: best, __worst: worst, __range: worst - best };
  });

  if (sort === "bestNote") arr.sort((a, b) => a.__best - b.__best);
  else if (sort === "smallestRange") arr.sort((a, b) => a.__range - b.__range);
  else arr.sort((a, b) => b.__score - a.__score);

  return arr.slice(0, 3);
}

// ========== HTML GENERIERUNG ==========
function createTop3Html(stute) {
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";
  const list = sortierteHengste(stute);

  let html = `<div class="match"><h3>${escapeHtml(name)}</h3>
  <p style="margin-top:-0.4em;">${escapeHtml(owner)}</p>
  <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p><ol>`;

  list.forEach((h, i) => {
    const bestText = noteZuText(h.__best);
    const worstText = noteZuText(h.__worst);
    const bestPct = (100 - h.__best * 20).toFixed(2);
    const worstPct = (100 - h.__worst * 20).toFixed(2);
    html += `<li><b>${i + 1}. Wahl:</b> ${escapeHtml(pickName(h))}<br>
      <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
      <b>Bester Wert:</b> ${h.__best.toFixed(2)} — ${bestText} (${bestPct}%)<br>
      <b>Schlechtester Wert:</b> ${h.__worst.toFixed(2)} — ${worstText} (${worstPct}%)</li>`;
  });

  html += "</ol></div>";
  return html;
}

// ========== DARSTELLUNG ==========
function zeigeVorschlaege() {
  const s
