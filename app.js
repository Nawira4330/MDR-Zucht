// app.js – Version mit Durchschnittsnoten-Berechnung + Sortierung + Score

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
  for(const k of keys)
    if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'
}[c])); }

// === JSON-Daten laden ===
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    fuelleDropdowns();
  }catch(e){
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

// === NOTENBERECHNUNG ===
// Umwandlung: Fehler → Note
function fehlerZuNote(fehler) {
  if (fehler <= 0) return 1;
  if (fehler === 1) return 2;
  if (fehler === 3) return 3;
  if (fehler >= 4) return 5;
  return 4;
}

// Durchschnittsnote aus allen 14 Merkmalen
function berechneDurchschnitt(stute, hengst) {
  let noten = [];

  for (const merkmal of MERKMALE) {
    const sWert = parseFloat(stute[merkmal]);
    const hWert = parseFloat(hengst[merkmal]);
    if (!isNaN(sWert) && !isNaN(hWert)) {
      const fehler = Math.abs(sWert - hWert);
      noten.push(fehlerZuNote(fehler));
    }
  }

  if (noten.length === 0) return null;
  const durchschnitt = noten.reduce((a, b) => a + b, 0) / noten.length;
  return parseFloat(durchschnitt.toFixed(2)); // auf 2 Nachkommastellen gerundet
}

// === GENETISCHES SCORING ===
function scorePair(stute, hengst){
  let totalScore = 0;
  let count = 0;

  for(const merk of MERKMALE){
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if(sGenes.length < 8 || hGenes.length < 8) continue;

    let localScore = 0;

    for(let i=0; i<8; i++){
      const S = sGenes[i];
      const H = hGenes[i];
      const target = i < 4 ? "HH" : "hh";
      let score = 0;
      if(target === "HH"){
        if(S === "hh" && (H === "HH" || H === "Hh")) score = 1;
        else if(S === "Hh" && (H === "HH" || H === "Hh")) score = 1;
        else if(S === "HH" && (H === "HH" || H === "Hh")) score = 1;
        else if(S === "HH" && H === "hh") score = 0;
        else score = 0.3;
      } else {
        if(S === "HH" && (H === "hh" || H === "Hh")) score = 1;
        else if(S === "Hh" && (H === "hh" || H === "Hh")) score = 1;
        else if(S === "hh" && (H === "hh" || H === "Hh")) score = 1;
        else if(S === "hh" && H === "HH") score = 0;
        else score = 0.3;
      }
      localScore += score;
    }
    totalScore += localScore / 8;
    count++;
  }
  return count > 0 ? totalScore / count : 0;
}

// === HTML für Top-3-Hengste ===
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  // Bewertung jedes Hengstes
  const scored = hengste
    .map(h => {
      const score = scorePair(stute, h);
      const note = berechneDurchschnitt(stute, h);
      return { ...h, __score: score, __note: note };
    })
    .filter(h => h.__score > 0 && h.__note !== null);

  if (scored.length === 0)
    return `<div class="match"><h3>${escapeHtml(name)} <small>(${escapeHtml(owner)})</small></h3><p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p><p><em>Keine passenden Hengste gefunden.</em></p></div>`;

  const besteNote = Math.min(...scored.map(h => h.__note));
  const schlechtesteNote = Math.max(...scored.map(h => h.__note));
  const range = (schlechtesteNote - besteNote).toFixed(2);

  // Top-3 nach Score sortiert
  const top3 = scored.sort((a,b) => b.__score - a.__score).slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} <small>(${escapeHtml(owner)})</small></h3>`;
  html += `<p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  top3.forEach((h,i)=>{
    html += `
      <div class="hengst">
        • <b>${escapeHtml(pickName(h))}</b><br>
        Farbgenetik: ${escapeHtml(pickColor(h) || "-")}<br>
        Beste Note: ${besteNote.toFixed(2)} — ${noteText(besteNote)}<br>
        Schlechteste Note: ${schlechtesteNote.toFixed(2)} — ${noteText(schlechtesteNote)}<br>
        Range: ${range} | Score: ${(h.__score*100).toFixed(1)}%
      </div>`;
  });

  html += `</div>`;
  return html;
}

function noteText(note) {
  if (note <= 1.5) return "Exzellent";
  if (note <= 2.5) return "Sehr gut";
  if (note <= 3.5) return "Gut";
  if (note <= 4.5) return "Befriedigend";
  return "Ausreichend";
}

// === Anzeige (nach Auswahl) ===
function zeigeVorschlaege(){
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = '';

  let toShow = [];
  if(selStute !== ""){
    const idx = parseInt(selStute, 10);
    if(!Number.isNaN(idx) && stuten[idx]) toShow.push(stuten[idx]);
  } else if(selBesitzer !== ""){
    toShow = stuten.filter(s => pickOwner(s) === selBesitzer);
  } else {
    toShow = stuten;
  }

  if(toShow.length === 0){
    out.innerHTML = '<p>Keine Stuten gefunden.</p>';
    return;
  }

  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");
}

// === Initialisierung ===
window.addEventListener('DOMContentLoaded', () => {
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);
});
