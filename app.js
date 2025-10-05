// ===============================================================
// app.js – Version mit Genetik-Scoring (Variante 3)
// & Anzeige der besten/schlechtesten Werte + Sortierauswahl
// ===============================================================

let stuten = [];
let hengste = [];

// mögliche Feldnamen (robust für verschiedene JSONs)
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

// Exterieur-Merkmale
const MERKMALE = [
  "Kopf", "Gebiss", "Hals", "Halsansatz", "Widerrist", "Schulter", "Brust",
  "Rückenlinie", "Rückenlänge", "Kruppe", "Beinwinkelung", "Beinstellung",
  "Fesseln", "Hufe"
];

// === Hilfsfunktionen ===
function pickField(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== "") {
      return obj[k];
    }
  }
  return "";
}
function pickName(obj) { return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj) { return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj) { return pickField(obj, COLOR_KEYS) || "-"; }

function escapeHtml(s) {
  return String(s).replace(/[&<>"'\/]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#47;'
  }[c]));
}

// === JSON-Daten laden ===
async function ladeDaten() {
  try {
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    // Hengste ohne Werte ignorieren
    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    document.getElementById('ergebnis').innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

// === Dropdowns befüllen ===
function fuelleDropdowns() {
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  selStute.innerHTML = '<option value="">– Alle Stuten –</option>';
  selBesitzer.innerHTML = '<option value="">– Alle Besitzer –</option>';

  stuten.forEach((s, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = pickName(s);
    selStute.appendChild(opt);
  });

  const owners = [...new Set(stuten.map(s => pickOwner(s)))].filter(x => x && x !== "(kein Besitzer)");
  owners.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    selBesitzer.appendChild(opt);
  });
}

// === Notenberechnung (statt Scoreanzeige) ===
function berechneNoten(stute, hengst) {
  let werte = [];

  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;

    let geneScore = 0;
    for (let i = 0; i < 8; i++) {
      const S = sGenes[i];
      const H = hGenes[i];
      const target = i < 4 ? "HH" : "hh";

      let score = 0;
      if (target === "HH") {
        if (S === "hh" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "Hh" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "HH" && (H === "HH" || H === "Hh")) score = 1;
        else score = 0.3;
      } else {
        if (S === "HH" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "Hh" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "hh" && (H === "hh" || H === "Hh")) score = 1;
        else score = 0.3;
      }
      geneScore += score;
    }

    const note = 1 + (1 - (geneScore / 8)) * 5; // 1–6 Schulnotensystem
    werte.push(note);
  }

  if (werte.length === 0) return { bester: 0, schlechtester: 0 };
  const bester = Math.min(...werte);
  const schlechtester = Math.max(...werte);

  const besterProz = (100 - (bester - 1) / 5 * 100).toFixed(2);
  const schlechtesterProz = (100 - (schlechtester - 1) / 5 * 100).toFixed(2);

  return { bester, schlechtester, besterProz, schlechtesterProz };
}

// === Anzeige Top-3-Hengste mit Sortieroption ===
function createTop3Html(stute) {
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute);

  const sortOption = document.getElementById("sortOption").value;

  const scored = hengste
    .map(h => {
      const noten = berechneNoten(stute, h);
      const score = (noten.bester + noten.schlechtester) / 2;
      return { ...h, ...noten, __score: score, __range: noten.schlechtester - noten.bester };
    })
    .sort((a, b) => {
      if (sortOption === "beste") return a.bester - b.bester;
      if (sortOption === "range") return a.__range - b.__range;
      return a.__score - b.__score;
    })
    .slice(0, 3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <p><small>${escapeHtml(owner)}</small></p>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>
    <ol>`;

  scored.forEach((h, i) => {
    html += `<li>
      <b>${i + 1}. Wahl:</b> ${escapeHtml(pickName(h))}<br>
      <i>Farbgenetik:</i> ${escapeHtml(pickColor(h))}<br>
      <i>Bester Wert:</i> ${h.bester.toFixed(2)} — ${bewerteNote(h.bester)} (${h.besterProz}% )<br>
      <i>Schlechtester Wert:</i> ${h.schlechtester.toFixed(2)} — ${bewerteNote(h.schlechtester)} (${h.schlechtesterProz}% )
    </li>`;
  });

  html += `</ol></div>`;
  return html;
}

function bewerteNote(n) {
  if (n <= 1.5) return "Exzellent";
  if (n <= 2.5) return "Sehr gut";
  if (n <= 3.5) return "Gut";
  if (n <= 4.5) return "Ausreichend";
  return "Schwach";
}

// === Anzeige (nach Auswahl) ===
function zeigeVorschlaege() {
  const selStute = document.getElementById("stuteSelect").value;
  const selBesitzer = document.getElementById("besitzerSelect").value;
  const out = document.getElementById("ergebnis");
  out.innerHTML = "";

  let toShow = [];
  if (selStute !== "") {
    const idx = parseInt(selStute, 10);
    if (!Number.isNaN(idx) && stuten[idx]) toShow.push(stuten[idx]);
  } else if (selBesitzer !== "") {
    toShow = stuten.filter(s => pickOwner(s) === selBesitzer);
  } else {
    toShow = stuten;
  }

  if (toShow.length === 0) {
    out.innerHTML = "<p>Keine Stuten gefunden.</p>";
    return;
  }

  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");
}

// === Initialisierung ===
window.addEventListener("DOMContentLoaded", () => {
  ladeDaten();
  document.getElementById("stuteSelect").addEventListener("change", zeigeVorschlaege);
  document.getElementById("besitzerSelect").addEventListener("change", zeigeVorschlaege);
  document.getElementById("sortOption").addEventListener("change", zeigeVorschlaege);
});
