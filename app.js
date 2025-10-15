let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name","Stutenname","Stute","name"];
const OWNER_KEYS = ["Besitzer","Owner","besitzer","owner"];
const COLOR_KEYS = ["Farbgenetik","Farbe","color","Genetik"];
const MERKMALE = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"];

function pickField(o,keys){ for(const k of keys) if(o[k]) return o[k]; return ""; }
function pickName(o){ return pickField(o,NAME_KEYS)||"(ohne Name)"; }
function pickOwner(o){ return pickField(o,OWNER_KEYS)||"(kein Besitzer)"; }
function pickColor(o){ return pickField(o,COLOR_KEYS)||""; }

async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r=>r.json());
    const h = await fetch('data/hengste.json').then(r=>r.json());
    stuten = s; hengste = h;
    fuelleDropdowns();
  }catch(e){ console.error(e); }
}

function fuelleDropdowns(){
  const selS=document.getElementById('stuteSelect');
  const selB=document.getElementById('besitzerSelect');
  selS.innerHTML='<option value="">-- bitte wählen --</option>';
  selB.innerHTML='<option value="">-- bitte wählen --</option>';
  stuten.forEach((s,i)=>{
    const opt=document.createElement('option');
    opt.value=i; opt.textContent=pickName(s); selS.appendChild(opt);
  });
  [...new Set(stuten.map(s=>pickOwner(s)))].forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o; opt.textContent=o; selB.appendChild(opt);
  });
}

// --- genetisches Scoring ---
function parseGene(str){
  return str.split("|").map(x=>x.trim().split(" "));
}

function bewertung(vorne,hinten){
  const mapV={ "HHHH":4,"HHHh":3,"HHhh":2,"HhHH":3,"HhHh":2,"Hhhh":1,"hhHH":2,"hhHh":1,"hhhh":0 };
  const mapH={ "HHHH":0,"HHHh":1,"HHhh":2,"HhHH":1,"HhHh":2,"Hhhh":3,"hhHH":2,"hhHh":3,"hhhh":4 };
  let s=0;
  for(let i=0;i<4;i++) s+= mapV[vorne[i]+hinten[i]]||0;
  for(let i=4;i<8;i++) s+= mapH[vorne[i-4]+hinten[i-4]]||0;
  return s;
}

function scorePair(stute,hengst){
  let score=0,details=[];
  for(const m of MERKMALE){
    const sv=String(stute[m]||"").trim(), hv=String(hengst[m]||"").trim();
    if(!sv||!hv) continue;
    const [svF,svH]=parseGene(sv); const [hvF,hvH]=parseGene(hv);
    let s=0;
    for(let i=0;i<4;i++) s+=bewertung([svF[i]],[hvF[i]]);
    for(let i=0;i<4;i++) s+=bewertung([svH[i]],[hvH[i]]);
    details.push(`${m}: ${s} Punkte`);
    score+=s;
  }
  return {score,details};
}

function createTop3Html(stute){
  const name=pickName(stute), owner=pickOwner(stute), color=pickColor(stute);
  const result=hengste.map(h=>{
    const sc=scorePair(stute,h);
    return {...h,score:sc.score,details:sc.details};
  }).sort((a,b)=>b.score-a.score).slice(0,3);

  let html=`<div class="match"><h3>${name} — Besitzer: ${owner}<span class="debug-icon" onclick="this.nextElementSibling.classList.toggle('show')">🔍</span></h3>
  <p>Farbgenetik Stute: ${color}</p><ol>`;
  result.forEach((r,i)=>{
    html+=`<li>${i+1}. Wahl: <b>${pickName(r)}</b> | Farbe: ${pickColor(r)} | Score: ${r.score}</li>`;
    html+=`<div class="debug-content">${r.details.join("<br>")}</div>`;
  });
  html+=`</ol></div>`;
  return html;
}

function zeigeVorschlaege(){
  const s=document.getElementById('stuteSelect').value;
  const b=document.getElementById('besitzerSelect').value;
  let liste=[];
  if(s) liste=[stuten[s]];
  else if(b) liste=stuten.filter(x=>pickOwner(x)===b);
  else liste=stuten;
  document.getElementById('ergebnis').innerHTML=liste.map(createTop3Html).join("");
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value="";
  document.getElementById('besitzerSelect').value="";
  zeigeVorschlaege();
}

// Tabs + Infofenster
function openTab(evt,id){
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  evt.currentTarget.classList.add('active');
}
document.getElementById('infoButton').addEventListener('click',()=>document.getElementById('infoBox').classList.toggle('hidden'));

window.addEventListener('DOMContentLoaded',ladeDaten);
