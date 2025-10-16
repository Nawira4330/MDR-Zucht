let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];
const MERKMALE = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust","Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"];

function pickField(obj, keys){
  for(const k of keys) if(obj && obj[k]) return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }

async function ladeDaten(){
  try {
    const s = await fetch('data/stuten.json').then(r=>r.json());
    const h = await fetch('data/hengste.json').then(r=>r.json());
    stuten = Array.isArray(s)?s:[];
    hengste = Array.isArray(h)?h:[];
    fuelleDropdowns();
  } catch(e){
    document.getElementById('ergebnis').innerHTML = "<p style='color:red'>Fehler beim Laden der JSON-Dateien.</p>";
  }
}

function fuelleDropdowns(){
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  selStute.innerHTML = '<option value="">-- bitte wählen --</option>';
  selBesitzer.innerHTML = '<option value="">-- bitte wählen --</option>';

  stuten.forEach((s, i)=>{
    const o = document.createElement('option');
    o.value = i;
    o.textContent = pickName(s);
    selStute.appendChild(o);
  });
  const owners = [...new Set(stuten.map(s=>pickOwner(s)))].filter(x=>x);
  owners.forEach(o=>{
    const op = document.createElement('option');
    op.value = o;
    op.textContent = o;
    selBesitzer.appendChild(op);
  });
}

// Bewertungstabelle nach deiner Logik
const FRONT_MAP = {
  "HHHH":4,"HHHh":3,"HHhh":2,"HhHH":3,"HhHh":2,"Hhhh":1,
  "hhHH":2,"hhHh":1,"hhhh":0
};
const BACK_MAP = {
  "HHHH":0,"HHHh":1,"HHhh":2,"HhHH":1,"HhHh":2,"Hhhh":3,
  "hhHH":2,"hhHh":3,"hhhh":4
};

function normalizeGen(str){
  return str.replace(/\s|\|/g,"").trim(); // Leerzeichen & | entfernen
}

function splitGenes(genStr){
  genStr = normalizeGen(genStr);
  return [genStr.slice(0,8), genStr.slice(8,16)];
}

function scorePair(stute, hengst){
  let score = 0;
  let debug = "";
  for(const merk of MERKMALE){
    const sVal = stute[merk] ? normalizeGen(String(stute[merk])) : "";
    const hVal = hengst[merk] ? normalizeGen(String(hengst[merk])) : "";
    if(sVal.length < 16 || hVal.length < 16) continue;

    const [svFront, svBack] = splitGenes(sVal);
    const [hvFront, hvBack] = splitGenes(hVal);
    let merkScore = 0;
    let merkDebug = `${merk}: `;

    for(let i=0;i<4;i++){
      const sGene = svFront.slice(i*2,i*2+2);
      const hGene = hvFront.slice(i*2,i*2+2);
      const key = (sGene+hGene).replace(/[^Hh]/g,"");
      const val = FRONT_MAP[key] ?? 0;
      merkScore += val;
      merkDebug += `V${i+1}:${sGene}-${hGene}(${val}) `;
    }
    for(let i=0;i<4;i++){
      const sGene = svBack.slice(i*2,i*2+2);
      const hGene = hvBack.slice(i*2,i*2+2);
      const key = (sGene+hGene).replace(/[^Hh]/g,"");
      const val = BACK_MAP[key] ?? 0;
      merkScore += val;
      merkDebug += `H${i+1}:${sGene}-${hGene}(${val}) `;
    }
    debug += `${merkDebug} — ${merkScore}\n`;
    score += merkScore;
  }
  return {score, debug};
}

function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute);

  const scored = hengste.map(h=>{
    const res = scorePair(stute,h);
    return {...h, __score: res.score, __debug: res.debug};
  }).sort((a,b)=>b.__score - a.__score).slice(0,3);

  let html = `<div class="match"><h3>${name} — Besitzer: ${owner}</h3>`;
  html += `<p><strong>Farbgenetik:</strong> ${color || "-"}</p><ol>`;
  scored.forEach((h,i)=>{
    const id = `${name.replace(/\W/g,"")}_${i}`;
    html += `<li><strong>.${i+1} Wahl:</strong> ${pickName(h)} — Farbe: ${pickColor(h)||"-"} (Score: ${h.__score})
             <span class="info-icon" onclick="toggleDebug('${id}')">i</span>
             <div id="${id}" class="debug-box">${h.__debug}</div></li>`;
  });
  html += `</ol></div>`;
  return html;
}

function toggleDebug(id){
  const box = document.getElementById(id);
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function zeigeVorschlaege(){
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = "";

  let show = [];
  if(selStute !== ""){
    const idx = parseInt(selStute);
    if(stuten[idx]) show.push(stuten[idx]);
  } else if(selBesitzer !== ""){
    show = stuten.filter(s=>pickOwner(s)===selBesitzer);
  } else {
    show = stuten;
  }

  let html = "";
  show.forEach(s=> html += createTop3Html(s));
  out.innerHTML = html || "<p>Keine Daten gefunden.</p>";
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value = "";
  document.getElementById('besitzerSelect').value = "";
  zeigeVorschlaege();
}

window.addEventListener("DOMContentLoaded", ()=>{
  ladeDaten();
  document.getElementById('zeigeAlle').addEventListener('click', zeigeAlle);
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);
});
