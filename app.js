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

function berechneDurchschnitt(stute, hengst){
  let bestNotes = [];
  let worstNotes = [];

  for(const merk of MERKMALE){
    const sGene = (stute[merk]||"").trim().split(/\s+/);
    const hGene = (hengst[merk]||"").trim().split(/\s+/);
    if(!sGene.length || !hGene.length) continue;

    let fehler = 0;
    for(let i=0;i<Math.min(sGene.length,hGene.length);i++){
      if(sGene[i] !== hGene[i]) fehler++;
    }

    let note = 5;
    if(fehler === 0) note = 1;
    else if(fehler === 1) note = 2;
    else if(fehler === 3) note = 3;
    else if(fehler >= 4) note = 5;

    bestNotes.push(note);
    worstNotes.push(note);
  }

  const avgBest = bestNotes.length ? (bestNotes.reduce((a,b)=>a+b,0)/bestNotes.length) : 0;
  const avgWorst = worstNotes.length ? (worstNotes.reduce((a,b)=>a+b,0)/worstNotes.length) : 0;

  return { best: avgBest, worst: avgWorst };
}

function noteText(note){
  if(note<=1.5) return "Exzellent";
  if(note<=2.5) return "Sehr gut";
  if(note<=3.5) return "Gut";
  if(note<=4.5) return "Befriedigend";
  return "Ausreichend";
}

function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste.map(h=>{
    const {best, worst} = berechneDurchschnitt(stute, h);
    const range = Math.abs(best - worst).toFixed(2);
    const score = ((1 / ((best + worst) / 2)) * 100 / 5).toFixed(1);
    return {...h, __best:best, __worst:worst, __range:range, __score:score};
  }).sort((a,b)=>b.__score - a.__score).slice(0,3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <span class="owner-name">${escapeHtml(owner)}</span>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p><br>
    <ul class="hengst-list">`;

  scored.forEach(h=>{
    html += `
      <li class="hengst-card" data-best="${h.__best}" data-worst="${h.__worst}" data-score="${h.__score}">
        • ${escapeHtml(pickName(h))}<br>
        Farbgenetik: ${escapeHtml(pickColor(h) || "-")}<br>
        Beste Note: ${h.__best.toFixed(2)} — ${noteText(h.__best)}<br>
        Schlechteste Note: ${h.__worst.toFixed(2)} — ${noteText(h.__worst)}<br>
        Range: ${h.__range} | Score: ${h.__score}%
      </li>`;
  });

  html += `</ul></div>`;
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
  }

  if(toShow.length === 0){
    out.innerHTML = '<p>Keine Stuten gefunden.</p>';
    return;
  }

  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");
}

document.addEventListener('DOMContentLoaded', ()=>{
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);

  // Tabs
  document.querySelectorAll('.tab-button').forEach(button=>{
    button.addEventListener('click',()=>{
      document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.add('hidden'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });

  // Sortierung
  const sortDropdown=document.getElementById('sortDropdown');
  sortDropdown.addEventListener('change',()=>{
    const selected=sortDropdown.value;
    const lists=document.querySelectorAll('.hengst-list');
    lists.forEach(list=>{
      const cards=Array.from(list.children);
      cards.sort((a,b)=>{
        const bestA=parseFloat(a.dataset.best), bestB=parseFloat(b.dataset.best);
        const worstA=parseFloat(a.dataset.worst), worstB=parseFloat(b.dataset.worst);
        const scoreA=parseFloat(a.dataset.score), scoreB=parseFloat(b.dataset.score);
        if(selected==='best') return bestA-bestB;
        if(selected==='range') return (worstA-bestA)-(worstB-bestB);
        return scoreB-scoreA;
      });
      list.innerHTML='';
      cards.forEach(card=>list.appendChild(card));
    });
  });
});
