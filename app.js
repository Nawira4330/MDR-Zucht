// app.js – genetisches Scoring-System mit Best-/Schlechtwerten
let stuten = [];
let hengste = [];

// Mappings
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

// Exterieur-Merkmale
const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// ---------------- Hilfsfunktionen ----------------
function pickField(obj, keys){
  for(const k of keys)
    if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }

// ---------------- Lade JSON ----------------
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] !== undefined && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  }catch(e){
    console.error("Fehler beim Laden der Daten:", e);
    document.getElementById('ergebnis').innerHTML = '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/stuten.json und data/hengste.json.</p>';
  }
}

// ---------------- Dropdowns ----------------
function fuelleDropdowns(){
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  selStute.innerHTML = '<option value="">-- bitte wählen --</option>';
  selBesitzer.innerHTML = '<option value="">-- bitte wählen --</option>';

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

// ---------------- Genetische Bewertung ----------------

// Bewertet einen Genstring und gibt Note (1–5) + Prozent zurück
function bewerteGenetik(geneString){
  if(!geneString) return {note: 5, prozent: 0};
  const gene = geneString.trim().split(/\s+/);
  let punkte = 0;

  for(let i=0; i<gene.length; i++){
    const g = gene[i].toUpperCase();
    if(i < 4){ // vordere Gene sollen HH/Hh sein
      if(g === "HH") punkte += 2;
      else if(g === "HH" || g === "Hh" || g === "hH") punkte += 1;
      else punkte += 0;
    } else {   // hintere Gene sollen hh/Hh sein
      if(g === "HH") punkte += 0;
      else if(g === "HH" || g === "Hh" || g === "hH") punkte += 1;
      else if(g === "HH") punkte += 2;
    }
  }

  const maxPunkte = gene.length * 2;
  const prozent = (punkte / maxPunkte) * 100;
  const avg = punkte / gene.length; // 0–2 Bereich

  let note = 5;
  if (avg >= 1.75) note = 1;
  else if (avg >= 1.5) note = 2;
  else if (avg >= 1.1) note = 3;
  else if (avg >= 0.6) note = 4;
  else note = 5;

  return { note: note.toFixed(2), prozent: prozent.toFixed(1) };
}

// Berechnet die best- und schlechtestmöglichen Noten
function bestWorstScore(stute, hengst){
  let bestSum = 0, worstSum = 0;
  let count = 0;

  for(const m of MERKMALE){
    const sVal = stute[m] ? String(stute[m]).trim() : "";
    const hVal = hengst[m] ? String(hengst[m]).trim() : "";
    if(!sVal && !hVal) continue;

    // Bestes Szenario: Gene passen optimal
    const best = bewerteGenetik("HH HH HH HH hh hh hh hh");
    const worst = bewerteGenetik("hh hh hh hh HH HH HH HH");

    bestSum += parseFloat(best.note);
    worstSum += parseFloat(worst.note);
    count++;
  }

  if(count === 0) return {bestNote: "-", bestPct: "-", worstNote: "-", worstPct: "-"};

  const bestAvg = bestSum / count;
  const worstAvg = worstSum / count;

  // Prozentwerte als Näherung (1 = 100 %, 5 = 0 %)
  const bestPct = (100 - ((bestAvg - 1) / 4) * 100).toFixed(1);
  const worstPct = (100 - ((worstAvg - 1) / 4) * 100).toFixed(1);

  return {
    bestNote: bestAvg.toFixed(2),
    bestPct,
    worstNote: worstAvg.toFixed(2),
    worstPct
  };
}

// ---------------- Anzeige ----------------
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => ({...h, __score: bestWorstScore(stute, h)}))
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} <span class="owner">(${escapeHtml(owner)})</span></h3>`;
  html += `<p><strong>Farbgenetik Stute:</strong> ${escapeHtml(color)}</p>`;

  if(scored.length === 0) html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  else {
    html += `<ol>`;
    scored.forEach((h, i) => {
      const s = h.__score;
      html += `
        <li>
          <strong>${i+1}. Wahl:</strong> ${escapeHtml(pickName(h))}<br>
          <em>Farbgenetik:</em> ${escapeHtml(pickColor(h) || "-")}<br>
          <span class="good">Bester Wert:</span> Note ${s.bestNote} (${s.bestPct}%)<br>
          <span class="bad">Schlechtester Wert:</span> Note ${s.worstNote} (${s.worstPct}%)
        </li>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
  return html;
}

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
    out.innerHTML = '<p>Keine Stuten gefunden (prüfe JSON und Feldnamen).</p>';
    return;
  }

  let html = '';
  toShow.forEach(s => html += createTop3Html(s));
  out.innerHTML = html;
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

// ---------------- Utility ----------------
function escapeHtml(s){
  return String(s).replace(/[&<>"'\/]/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c]
  ));
}

window.addEventListener('DOMContentLoaded', ladeDaten);
