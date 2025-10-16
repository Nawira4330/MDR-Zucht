let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name","Stutenname","Stute","name"];
const OWNER_KEYS = ["Besitzer","Owner","besitzer","owner"];
const COLOR_KEYS = ["Farbgenetik","Farbe","color"];

const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz",
  "Widerrist","Schulter","Brust","Rückenlinie",
  "Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// Hilfsfunktionen ----------------------------------------------------------

function pickField(obj, keys){
  const lower = Object.fromEntries(Object.entries(obj).map(([k,v]) => [k.toLowerCase(), v]));
  for(const k of keys){
    if(lower[k.toLowerCase()]) return lower[k.toLowerCase()];
  }
  return "";
}
function pickName(o){return pickField(o,NAME_KEYS);}
function pickOwner(o){return pickField(o,OWNER_KEYS);}
function pickColor(o){return pickField(o,COLOR_KEYS);}

// Wandelt alles in sauberes H/h-Format um
function cleanGenValue(v){
  if(!v) return "";
  v = String(v).replace(/[\/\s]/g,"").trim(); // alle Leerzeichen raus
  v = v.replaceAll("|",""); // Trenner entfernen, wir fügen ihn später hinzu
  return v;
}

// Trennt String in 16 Zeichen → 8 Paare (4 vorne, 4 hinten)
function normalizeGenString(s){
  if(!s) return "";
  const clean = cleanGenValue(s);
  const letters = clean.match(/[Hh]/g) || [];
  while(letters.length < 16) letters.push("h"); // falls mal zu kurz
  const pairs = [];
  for(let i=0; i<16; i+=2){
    pairs.push(letters[i] + letters[i+1]);
  }
  const front = pairs.slice(0,4).join(" ");
  const back = pairs.slice(4,8).join(" ");
  return `${front} | ${back}`;
}

// Punktetabellen -----------------------------------------------------------

const frontMatrix = {
  "HHHH":4,"HHHh":3,"HHhh":2,
  "HhHH":3,"HhHh":2,"Hhhh":1,
  "hhHH":2,"hhHh":1,"hhhh":0
};
const backMatrix = {
  "HHHH":0,"HHHh":1,"HHhh":2,
  "HhHH":1,"HhHh":2,"Hhhh":3,
  "hhHH":2,"hhHh":3,"hhhh":4
};

function getScoreFront(s,h){return frontMatrix[s+h] ?? 0;}
function getScoreBack(s,h){return backMatrix[s+h] ?? 0;}

// Scoreberechnung ----------------------------------------------------------

function scorePair(stute, hengst){
  let total = 0;
  const debug = [];

  for(const merk of MERKMALE){
    const sVal = normalizeGenString(stute[merk] || "");
    const hVal = normalizeGenString(hengst[merk] || "");
    if(!sVal || !hVal){
      debug.push({merkmal:merk,details:"leer",score:0});
      continue;
    }

    const [sL,sR] = sVal.split("|").map(p=>p.trim().split(/\s+/));
    const [hL,hR] = hVal.split("|").map(p=>p.trim().split(/\s+/));

    let mScore = 0;
    let det = [];

    for(let i=0;i<4;i++){
      const sc = getScoreFront(sL[i]||"", hL[i]||"");
      mScore += sc;
      det.push(`V${i+1}:${sL[i]}-${hL[i]}(${sc})`);
    }
    for(let i=0;i<4;i++){
      const sc = getScoreBack(sR[i]||"", hR[i]||"");
      mScore += sc;
      det.push(`H${i+1}:${sR[i]}-${hR[i]}(${sc})`);
    }

    total += mScore;
    debug.push({merkmal:merk,details:det.join(", "),score:mScore});
  }

  return { totalScore: total, debug };
}

// Daten laden --------------------------------------------------------------

async function ladeDaten(){
  const [sRes,hRes]=await Promise.all([
    fetch("data/stuten.json"),
    fetch("data/hengste.json")
  ]);
  stuten=await sRes.json();
  hengste=await hRes.json();
  fuelleDropdowns();
}

// Dropdowns ---------------------------------------------------------------

function fuelleDropdowns(){
  const sSel=document.getElementById("stuteSelect");
  const bSel=document.getElementById("besitzerSelect");
  sSel.innerHTML='<option value="">-- Stute wählen --</option>';
  bSel.innerHTML='<option value="">-- Besitzer wählen --</option>';

  stuten.forEach((s,i)=>{
    const o=document.createElement("option");
    o.value=i; o.textContent=pickName(s);
    sSel.appendChild(o);
  });

  const owners=[...new Set(stuten.map(s=>pickOwner(s)))];
  owners.forEach(o=>{
    const op=document.createElement("option");
    op.value=o; op.textContent=o;
    bSel.appendChild(op);
  });
}

// Anzeige der Ergebnisse --------------------------------------------------

function zeigeVorschlaege(){
  const sVal=document.getElementById("stuteSelect").value;
  const bVal=document.getElementById("besitzerSelect").value;
  const out=document.getElementById("ergebnis");
  out.innerHTML="";

  let list=[];
  if(sVal!==""){ list=[stuten[parseInt(sVal)]]; }
  else if(bVal!==""){ list=stuten.filter(s=>pickOwner(s)===bVal); }
  else list=stuten;

  out.innerHTML=list.map(st=>erstelleStutenBlock(st)).join("");
}

function erstelleStutenBlock(stute){
  const scored=hengste.map(h=>{
    const r=scorePair(stute,h);
    return {...h,score:r.totalScore,debug:r.debug};
  }).sort((a,b)=>b.score-a.score).slice(0,3);

  let html=`<div class="match"><h3>${pickName(stute)} — ${pickOwner(stute)}</h3>`;
  html+=`<p class="farbe">Farbgenetik: ${pickColor(stute)||"-"}</p><ol>`;
  scored.forEach((h,i)=>{
    html+=`<li><span class="wahl">•${i+1}</span> <strong>${pickName(h)}</strong>
      <span class="score">Score: ${h.score}</span>
      <div>Farbgenetik: ${pickColor(h)||"-"}</div>
      <details><summary>Debug</summary><ul class="debug-list">`;
    h.debug.forEach(d=>{
      html+=`<li><b>${d.merkmal}:</b> ${d.details} — <b>${d.score}</b></li>`;
    });
    html+=`</ul></details></li>`;
  });
  html+=`</ol></div>`;
  return html;
}

window.addEventListener("DOMContentLoaded",()=>{
  ladeDaten();
  document.getElementById("stuteSelect").addEventListener("change",zeigeVorschlaege);
  document.getElementById("besitzerSelect").addEventListener("change",zeigeVorschlaege);
});
