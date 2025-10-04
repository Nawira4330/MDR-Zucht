// app.js – genetische Bewertung mit Best-/Schlechtwerten (Noten + %)

let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

function pickField(obj, keys){
  for(const k of keys)
    if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c])); }

async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  }catch(e){
    console.error("Fehler beim Laden:", e);
    document.getElementById('ergebnis').innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

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

// === Genetik → Note berechnen ===
function genToNote(stuteGen, hengstGen){
  const combo = `${stuteGen}${hengstGen}`;
  switch(combo){
    case "HHHH": return 1.0;
    case "HHHh": case "HhHH": return 1.5;
    case "HhHh": return 2.0;
    case "hhHh": case "Hhh": return 3.0;
    case "HHhh": case "hhHH": return 4.5;
    case "hhhh": return 5.0;
    default: return 3.5; // neutral fallback
  }
}

// === Beste & schlechteste Note (pro Merkmal & Paarung) ===
function bestWorstMerkmal(stute, hengst){
  const sGenes = (stute || "").replace("|", "").trim().split(/\s+/);
  const hGenes = (hengst || "").replace("|", "").trim().split(/\s+/);
  if(sGenes.length < 8 || hGenes.length < 8) return {best: 0, worst: 0};

  let best = Infinity;
  let worst = -Infinity;

  for(let i=0; i<8; i++){
    const n = genToNote(sGenes[i], hGenes[i]);
    if(n < best) best = n;
    if(n > worst) worst = n;
  }
  return {best, worst};
}

// === Gesamtbewertung einer Anpaarung ===
function bewertungPair(stute, hengst){
  let bestSum = 0, worstSum = 0, count = 0;

  for(const merk of MERKMALE){
    const {best, worst} = bestWorstMerkmal(stute[merk], hengst[merk]);
    if(best > 0){
      bestSum += best;
      worstSum += worst;
      count++;
    }
  }

  if(count === 0) return null;

  const bestAvg = bestSum / count;
  const worstAvg = worstSum / count;

  const bestPct = (100 * (6 - bestAvg) / 5).toFixed(1);
  const worstPct = (100 * (6 - worstAvg) / 5).toFixed(1);

  return {
    bestAvg: bestAvg.toFixed(2),
    worstAvg: worstAvg.toFixed(2),
    bestPct,
    worstPct
  };
}

function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const bewertungen = hengste
    .map(h => {
      const b = bewertungPair(stute, h);
      return b ? {...h, __bewertung: b} : null;
    })
    .filter(x => x)
    .sort((a,b) => a.__bewertung.bestAvg - b.__bewertung.bestAvg)
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} <small>(${escapeHtml(owner)})</small></h3>`;
  html += `<p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if(bewertungen.length === 0) html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  else {
    html += `<ol>`;
    bewertungen.forEach((h,i)=>{
      const b = h.__bewertung;
      html += `<li><b>${i+1}. Wahl:</b> ${escapeHtml(pickName(h))} 
        <br><i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")} 
        <br><i>Bester Wert:</i> ${b.bestAvg} (${b.bestPct}%)
        <br><i>Schlechtester Wert:</i> ${b.worstAvg} (${b.worstPct}%)</li>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
  return html;
}

// === Anzeige ===
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

function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

window.addEventListener('DOMContentLoaded', () => {
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);
});
