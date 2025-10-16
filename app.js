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
