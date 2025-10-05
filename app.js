// app.js – Version mit Genetik-Scoring (Variante 3) & Anzeige der besten/schlechtesten Werte

let stuten = [];
let hengste = [];

// mögliche Feldnamen (robust für verschiedene JSONs)
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

// Exterieur-Merkmale
const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// === Hilfsfunktionen ===
function pickField(obj, keys){
  for (const k of keys)
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }
function escapeHtml(s){
  return String(s).replace(/[&<>"'\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'
  }[c]));
}

// === JSON-Daten laden ===
async function ladeDaten(){
  try {
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    // Hengste ohne Werte ignorieren
    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  } catch(e) {
    console.error("Fehler beim Laden:", e);
    document.getElementById('ergebnis').innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

// === Dropdowns befüllen ===
function fuelleDropdowns(){
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

// === GENETISCHE SCORING-LOGIK (Variante 3 mit Überkorrektur erlaubt) ===
function scorePair(stute, hengst){
  let totalScore = 0;
  let count = 0;

  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;

    let localScore = 0;
    for (let i = 0; i < 8; i++) {
      const S = sGenes[i];
      const H = hGenes[i];
      const target = i < 4 ? "HH" : "hh"; // vorne HH, hinten hh

      let score = 0;
      if (target === "HH") {
        if (S === "hh" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "Hh" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "HH" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "HH" && H === "hh") score = 0;
        else score = 0.3;
      } else {
        if (S === "HH" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "Hh" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "hh" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "hh" && H === "HH") score = 0;
        else score = 0.3;
      }
      localScore += score;
    }

    totalScore += localScore / 8;
    count++;
  }

  return count > 0 ? totalScore / count : 0;
}

// === Hilfsfunktion: Beste/schlechteste Werte berechnen (Anzeige) ===
function berechneAnzeigeWerte(stute, hengst) {
  let besteSumme = 0, schlechtesteSumme = 0, count = 0;
  let besteGene = 0, schlechtesteGene = 0, gesamtGene = 0;

  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;

    // Zufällige simulierte Noten (später ggf. aus Daten ersetzen)
    const bestNote = Math.random() * 0.3 + 1.2;
    const worstNote = Math.random() * 0.3 + 4.1;
    besteSumme += bestNote;
    schlechtesteS
