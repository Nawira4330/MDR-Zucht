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
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c]));}

// === JSON laden ===
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r=>r.json());
    const h = await fetch('data/hengste.json').then(r=>r.json());
    stuten = Array.isArray(s)?s:[];
    hengste = Array.isArray(h)?h:[];
    hengste = hengste.filter(hg => MERKMALE.some(m=>hg[m]));
    fuelleDropdowns();
  } catch(e){ console.error(e); document.getElementById('ergebnis').innerHTML='<p style="color:red">Fehler beim Laden</p>'; }
}

// === Dropdowns ===
function fuelleDropdowns(){
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  selStute.innerHTML = '<option value="">– Alle Stuten –</option>';
  selBesitzer.innerHTML = '<option value="">– Alle Besitzer –</option>';

  stuten.forEach((s, idx)=>{
    const opt=document.createElement('option');
    opt.value=idx; opt.textContent=pickName(s);
    selStute.appendChild(opt);
  });

  [...new Set(stuten.map(s=>pickOwner(s)))].forEach(o=>{
    if(o && o!=="(kein Besitzer)"){
      const opt=document.createElement('option'); opt.value=o; opt.textContent=o;
      selBesitzer.appendChild(opt);
    }
  });

  // Anzeige sobald Auswahl erfolgt
  selStute.addEventListener('change', zeigeVorschlaege);
  selBesitzer.addEventListener('change', zeigeVorschlaege);
}

// === Score ===
function scorePair(stute,hengst){
  let total=0, count=0;
  for(const merk of MERKMALE){
    const sGenes=(stute[merk]||"").replace("|","").trim().split(/\s+/);
    const hGenes=(hengst[merk]||"").replace("|","").trim().split(/\s+/);
    if(sGenes.length<8 || hGenes.length<8) continue;
    let local=0;
    for(let i=0;i<8;i++){
      const S=sGenes[i],H=hGenes[i],target=i<4?"HH":"hh";
      let sc=0;
      if(target==="HH"){
        if(S==="hh"&&(H==="HH"||H==="Hh")) sc=1;
        else if(S==="Hh"&&(H==="HH"||H==="Hh")) sc=1;
        else if(S==="HH"&&(H==="HH"||H==="Hh")) sc=1;
        else if(S==="HH"&&H==="hh") sc=0;
        else sc=0.3;
      } else {
        if(S==="HH"&&(H==="hh"||H==="Hh")) sc=1;
        else if(S==="Hh"&&(H==="hh"||H==="Hh")) sc=1;
        else if(S==="hh"&&(H==="hh"||H==="Hh")) sc=1;
        else if(S==="hh"&&H==="HH") sc=0;
        else sc=0.3;
      }
      local+=sc;
    }
    total+=local/8; count++;
  }
  return count>0?total/count:0;
}

// === Durchschnittsnoten berechnen ===
function berechneNotenDurchschnitt(stute,hengst){
  const notenBest=[],notenWorst=[];
  for(const merk of MERKMALE){
    const sGene=(stute[merk]||"").split("|")[0]?.trim().split(/\s+/);
    const hGene=(hengst[merk]||"").split("|")[1]?.trim().split(/\s+/);
    if(!sGene||!hGene) continue;
    let fehlerBest=0, fehlerWorst=0;
    for(let i=0;i<Math.min(sGene.length,hGene.length);i++){
      if(sGene[i]!==hGene[i]){
        fehlerBest++;
        fehlerWorst+=2;
      }
    }
    notenBest.push(fehlerZuNote(fehlerBest));
    notenWorst.push(fehlerZuNote(fehlerWorst));
  }
  const avgBest=notenBest.length?notenBest.reduce((a,b)=>a+b,0)/notenBest.length:0;
  const avgWorst=notenWorst.length?notenWorst.reduce((a,b)=>a+b,0)/notenWorst.length:0;
  return {best:avgBest, worst:avgWorst};
}

function fehlerZuNote(fehler){
  if(fehler===0) return 1.0;
  if(fehler===1) return 2.0;
  if(fehler<=3) return 3.0;
  if(fehler>=4) return 5.0;
  return 4.0;
}

// === HTML Ausgabe ===
function createTop3Html(stute){
  const name=pickName(stute);
  const owner=pickOwner(stute);
  const color=pickColor(stute)||"-";

  const scored=hengste.map(h=>{
    const s=scorePair(stute,h);
    const {best,worst}=berechneNotenDurchschnitt(stute,h);
    return {...h,__score:s,__best:best,__worst:worst};
  }).filter(h=>h.__score>0)
  .sort((a,b)=>b.__score-a.__score)
  .slice(0,3);

  let html=`<div class="match"><h3>${escapeHtml(name)}</h3><span class="owner-name">${escapeHtml(owner)}</span>`;
  html+=`<p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if(scored.length===0) html+=`<p><em>Keine passenden Hengste gefunden.</em></p>`;
  else{
    html+=`<ul class="hengst-list">`;
    scored.forEach(h=>{
      const range=(h.__worst-h.__best).toFixed(2);
      html+=`<li>• <b>${escapeHtml(pickName(h))}</b><br>
             <i>Farbgenetik:</i> ${escapeHtml(pickColor(h)||"-")}<br>
             <i>Beste Note:</i> ${h.__best.toFixed(2)}<br>
             <i>Schlechteste Note:</i> ${h.__worst.toFixed(2)}<br>
             <i>Range:</i> ${range} | <i>Score:</i> ${(h.__score*100).toFixed(1)}%</li>`;
    });
    html+=`</ul>`;
  }
  html+=`</div>`;
  return html;
}

// === Anzeige ===
function zeigeVorschlaege(){
  const selStute=document.getElementById('stuteSelect').value;
  const selBesitzer=document.getElementById('besitzerSelect').value;
  const out=document.getElementById('ergebnis');
  out.innerHTML='';

  let toShow=[];
  if(selStute!==""){
    const idx=parseInt(selStute,10);
    if(!Number.isNaN(idx)&&stuten[idx]) toShow.push(stuten[idx]);
  } else if(selBesitzer!==""){
    toShow=stuten.filter(s=>pickOwner(s)===selBesitzer);
  } else toShow=stuten;

  if(toShow.length===0){ out.innerHTML='<p>Keine Stuten gefunden.</p>'; return; }

  out.innerHTML=toShow.map(s=>createTop3Html(s)).join("");

  // Sortierung anwenden
  const sortDropdown=document.getElementById('sortDropdown').value;
  document.querySelectorAll('.hengst-list').forEach(list=>{
    const cards=Array.from(list.children);
    cards.sort((a,b)=>{
      const bestA=parseFloat(a.dataset.best), bestB=parseFloat(b.dataset.best);
      const worstA=parseFloat(a.dataset.worst), worstB=parseFloat(b.dataset.worst);
      const scoreA=parseFloat(a.dataset.score), scoreB=parseFloat(b.dataset.score);
      if(sortDropdown==='best') return bestA-bestB;
      if(sortDropdown==='range') return (worstA-bestA)-(worstB-bestB);
      return scoreB-scoreA;
    });
    list.innerHTML='';
    cards.forEach(card=>list.appendChild(card));
  });
}

// === Init ===
window.addEventListener('DOMContentLoaded', ()=>{
  ladeDaten();

  document.getElementById('sortDropdown').addEventListener('change',zeigeVorschlaege);

  document.querySelectorAll('.tab-button').forEach(button=>{
    button.addEventListener('click',()=>{
      document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });
});
