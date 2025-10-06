// app.js – Version mit Genetik-Scoring (Variante 3) & Notenlogik + Sortierung nach bester Note / Score / Range

let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];
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
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c])); }

// === JSON-Daten laden ===
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

// === Fehler -> Note ===
function noteAusFehlern(fehler){
  if(fehler===0) return 1;
  if(fehler===1) return 2;
  if(fehler<=3) return 3;
  return 5;
}

// === Genetik-Score ===
function scorePair(stute, hengst){
  let totalScore = 0, count = 0;
  for(const merk of MERKMALE){
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if(sGenes.length < 8 || hGenes.length < 8) continue;
    let localScore = 0;
    for(let i=0;i<8;i++) if(sGenes[i]===hGenes[i]) localScore++;
    totalScore += localScore/8;
    count++;
  }
  return count>0 ? totalScore/count : 0;
}

// === Beste & schlechteste Noten berechnen ===
function berechneNoten(stute, hengst){
  let noten = [];
  for(const merk of MERKMALE){
    const sGene = (stute[merk]||"").trim().split(/\s+/);
    const hGene = (hengst[merk]||"").trim().split(/\s+/);
    if(!sGene.length || !hGene.length) continue;
    let fehler = 0;
    for(let i=0;i<Math.min(sGene.length,hGene.length);i++){
      if(sGene[i] !== hGene[i]) fehler++;
    }
    noten.push(noteAusFehlern(fehler));
  }
  if(noten.length === 0) return {best:0, worst:0, range:0};
  const best = Math.min(...noten);
  const worst = Math.max(...noten);
  return {best, worst, range: worst - best};
}

// === Note beschreiben ===
function bewerteNote(wert){
  if(wert <= 1.5) return "Exzellent";
  if(wert <= 2.5) return "Sehr gut";
  if(wert <= 3.5) return "Gut";
  if(wert <= 4.5) return "Befriedigend";
  return "Ausreichend";
}

// === HTML-Ausgabe ===
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => {
      const s = scorePair(stute, h);
      const {best, worst, range} = berechneNoten(stute,h);
      return {...h,__score:s,__best:best,__worst:worst,__range:range};
    })
    .filter(h => h.__score>0)
    .sort((a,b)=>a.__best - b.__best)
    .slice(0,3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <div class="owner-name">${escapeHtml(owner)}</div>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>
    <ul class="hengst-list">`;

  if(scored.length===0){
    html += `<li><em>Keine passenden Hengste gefunden.</em></li>`;
  } else {
    scored.forEach((h,i)=>{
      html += `
      <li class="hengst-card" 
          data-best="${h.__best}" 
          data-worst="${h.__worst}" 
          data-range="${h.__range}" 
          data-score="${h.__score}">
        • <b>${escapeHtml(pickName(h))}</b><br>
        <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
        <i>Beste Note:</i> ${h.__best.toFixed(2)} — ${bewerteNote(h.__best)}<br>
        <i>Schlechteste Note:</i> ${h.__worst.toFixed(2)} — ${bewerteNote(h.__worst)}<br>
        <i>Range:</i> ${(h.__range).toFixed(2)} | <i>Score:</i> ${(h.__score*100).toFixed(1)}%
      </li>`;
    });
  }

  html += `</ul></div>`;
  return html;
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

  // Sortierung anwenden
  sortiereErgebnisse();
}

// === Sortierung ===
function sortiereErgebnisse(){
  const sortDropdown = document.getElementById('sortDropdown');
  const selected = sortDropdown ? sortDropdown.value : 'best';
  const lists = document.querySelectorAll('.hengst-list');

  lists.forEach(list=>{
    const cards = Array.from(list.children);
    cards.sort((a,b)=>{
      const bestA=parseFloat(a.dataset.best), bestB=parseFloat(b.dataset.best);
      const rangeA=parseFloat(a.dataset.range), rangeB=parseFloat(b.dataset.range);
      const scoreA=parseFloat(a.dataset.score), scoreB=parseFloat(b.dataset.score);
      if(selected==='score') return scoreB - scoreA;
      if(selected==='range') return rangeA - rangeB;
      return bestA - bestB;
    });
    list.innerHTML='';
    cards.forEach(card=>list.appendChild(card));
  });
}

// === Tabs für Infofenster & Initialisierung ===
document.addEventListener('DOMContentLoaded', ()=>{
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('sortDropdown').addEventListener('change', sortiereErgebnisse);

  document.querySelectorAll('.tab-button').forEach(button=>{
    button.addEventListener('click',()=>{
      document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.add('hidden'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });
});
