// app.js – genetische Verpaarungsanalyse mit Info-Icon und Auto-Load

let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// ============ Hilfsfunktionen =============

function pickField(obj, keys){
  for(const k of keys)
    if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }

function normalizePair(p){
  if(!p) return "";
  p = p.replace(/\s+/g, "");
  return [...p].sort((a,b)=>a==='H'?-1:1).join('');
}
function splitSides(s){
  s = s.replace(/\s+/g, "");
  const [front, back] = s.split("|").map(part => part.trim());
  const splitPairs = (part) => part ? part.match(/.{2}/g) || [] : [];
  return [splitPairs(front||""), splitPairs(back||"")];
}

function getScoreFront(s,h){
  const table = {
    "HHHH":4,"HHHh":3,"HHhh":2,
    "HhHH":3,"HhHh":2,"Hhhh":1,
    "hhHH":2,"hhHh":1,"hhhh":0
  };
  return table[normalizePair(s)+normalizePair(h)] ?? 0;
}
function getScoreBack(s,h){
  const table = {
    "HHHH":0,"HHHh":1,"HHhh":2,
    "HhHH":1,"HhHh":2,"Hhhh":3,
    "hhHH":2,"hhHh":3,"hhhh":4
  };
  return table[normalizePair(s)+normalizePair(h)] ?? 0;
}

// ==========================================

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
    document.getElementById('ergebnis').innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/stuten.json und data/hengste.json.</p>';
  }
}

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

  // Auto-load on selection
  selStute.addEventListener('change', zeigeVorschlaege);
}

// ==========================================

function scorePair(stute, hengst, debug){
  let score = 0;
  const details = [];

  for(const m of MERKMALE){
    const sVal = (stute[m] || "").trim();
    const hVal = (hengst[m] || "").trim();
    if(!sVal || !hVal) continue;

    const [sFront, sBack] = splitSides(sVal);
    const [hFront, hBack] = splitSides(hVal);

    let partScore = 0;
    const det = [];

    for(let i=0;i<4;i++){
      const sPair = normalizePair(sFront[i]||"");
      const hPair = normalizePair(hFront[i]||"");
      const sc = getScoreFront(sPair, hPair);
      det.push(`V${i+1}:${sPair}-${hPair}(${sc})`);
      partScore += sc;
    }
    for(let i=0;i<4;i++){
      const sPairB = normalizePair(sBack[i]||"");
      const hPairB = normalizePair(hBack[i]||"");
      const scB = getScoreBack(sPairB, hPairB);
      det.push(`H${i+1}:${sPairB}-${hPairB}(${scB})`);
      partScore += scB;
    }

    score += partScore;
    details.push(`${m}: ${det.join(", ")} — ${partScore}`);
  }

  if(debug) debug.push(...details);
  return score;
}

// ==========================================

function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => {
      const dbg = [];
      const sc = scorePair(stute, h, dbg);
      return {...h, __score: sc, __debug: dbg.join("\n")};
    })
    .sort((a,b) => b.__score - a.__score)
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} — Besitzer: ${escapeHtml(owner)}</h3>`;
  html += `<p>Farbgenetik Stute: ${escapeHtml(color)}</p>`;

  if(scored.length === 0) html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  else {
    html += `<ol>`;
    scored.forEach((h, i) => {
      const infoId = `info_${Math.random().toString(36).slice(2)}`;
      html += `<li><strong>${i+1}.</strong> ${escapeHtml(pickName(h))} 
               — Farbe: ${escapeHtml(pickColor(h) || "-")} 
               (Score: ${h.__score})
               <span class="info-icon" data-info="${infoId}">ℹ️</span>
               <div id="${infoId}" class="info-popup"><pre>${escapeHtml(h.__debug)}</pre></div>
               </li>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
  return html;
}

// ==========================================

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

  // Info-Icons aktivieren
  document.querySelectorAll('.info-icon').forEach(icon=>{
    icon.addEventListener('click', e=>{
      const id = icon.getAttribute('data-info');
      const popup = document.getElementById(id);
      popup.classList.toggle('visible');
    });
  });

  document.addEventListener('click', e=>{
    if(!e.target.classList.contains('info-icon') && !e.target.closest('.info-popup')){
      document.querySelectorAll('.info-popup.visible').forEach(p=>p.classList.remove('visible'));
    }
  });
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

function escapeHtml(s){ 
  return String(s).replace(/[&<>"'\/]/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c]
  ));
}

window.addEventListener('DOMContentLoaded', ladeDaten);
