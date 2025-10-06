// app.js – Version mit Genetik-Scoring (Variante 3) & Anzeige der besten/schlechtesten Werte

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
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c])); }

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

// === GENETISCHE SCORING-LOGIK ===
function scorePair(stute, hengst){
  let totalScore = 0, count = 0;
  for(const merk of MERKMALE){
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if(sGenes.length < 8 || hGenes.length < 8) continue;
    let localScore = 0;
    for(let i=0;i<8;i++){
      const S = sGenes[i], H = hGenes[i];
      const target = i < 4 ? "HH" : "hh";
      let score = 0;
      if(target==="HH"){
        if(S==="hh"&&(H==="HH"||H==="Hh"))score=1;
        else if(S==="Hh"&&(H==="HH"||H==="Hh"))score=1;
        else if(S==="HH"&&(H==="HH"||H==="Hh"))score=1;
        else if(S==="HH"&&H==="hh")score=0; else score=0.3;
      }else{
        if(S==="HH"&&(H==="hh"||H==="Hh"))score=1;
        else if(S==="Hh"&&(H==="hh"||H==="Hh"))score=1;
        else if(S==="hh"&&(H==="hh"||H==="Hh"))score=1;
        else if(S==="hh"&&H==="HH")score=0; else score=0.3;
      }
      localScore+=score;
    }
    totalScore+=localScore/8; count++;
  }
  return count>0?totalScore/count:0;
}

// === Beste/schlechteste Werte berechnen ===
function berechneWerte(stute, hengst){
  let werte = [];
  for(const merk of MERKMALE){
    const sGene = (stute[merk]||"").split("|")[0]?.trim().split(/\s+/);
    const hGene = (hengst[merk]||"").split("|")[1]?.trim().split(/\s+/);
    if(!sGene||!hGene) continue;
    let diff = 0;
    for(let i=0;i<Math.min(sGene.length,hGene.length);i++){
      diff += sGene[i]===hGene[i]?1:0;
    }
    const note = 7 - (diff/8)*5; // 1 bis 6 Bewertung
    werte.push(note);
  }
  if(werte.length===0)return{best:0,worst:0};
  const best = Math.min(...werte);
  const worst = Math.max(...werte);
  return {best, worst};
}

// === HTML-Ausgabe ===
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => {
      const s = scorePair(stute, h);
      const {best, worst} = berechneWerte(stute,h);
      return {...h,__score:s,__best:best,__worst:worst};
    })
    .filter(h => h.__score>0)
    .sort((a,b)=>b.__score - a.__score)
    .slice(0,3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <span class="owner-name">${escapeHtml(owner)}</span>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if(scored.length===0){
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  }else{
    html += `<ol class="hengst-list">`;
    scored.forEach((h,i)=>{
      const bestPct = ((1 - (h.__best/7))*100).toFixed(2);
      const worstPct = ((1 - (h.__worst/7))*100).toFixed(2);
      html += `<li class="hengst-card" 
                 data-best="${h.__best}" 
                 data-worst="${h.__worst}" 
                 data-score="${h.__score}">
        <b>${i+1}. Wahl:</b> ${escapeHtml(pickName(h))}<br>
        <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
        <i>Bester Wert:</i> ${h.__best.toFixed(2)} — ${bewerteNote(h.__best)} (${bestPct}%)<br>
        <i>Schlechtester Wert:</i> ${h.__worst.toFixed(2)} — ${bewerteNote(h.__worst)} (${worstPct}%)
      </li>`;
    });
    html += `</ol>`;
  }

  html += `</div>`;
  return html;
}

function bewerteNote(wert){
  if(wert<=1.5)return"Exzellent";
  if(wert<=2.5)return"Sehr gut";
  if(wert<=3.5)return"Gut";
  if(wert<=4.5)return"Befriedigend";
  if(wert<=5.5)return"Ausreichend";
  return"Schwach";
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
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

// === Tabs für Infofenster ===
document.addEventListener('DOMContentLoaded', ()=>{
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);

  document.querySelectorAll('.tab-button').forEach(button=>{
    button.addEventListener('click',()=>{
      document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.add('hidden'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });

  // === Sortierfunktion ===
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
        if(selected==='best')return bestA-bestB;
        if(selected==='range')return (worstA-bestA)-(worstB-bestB);
        return scoreB-scoreA;
      });
      list.innerHTML='';
      cards.forEach(card=>list.appendChild(card));
    });
  });
});
